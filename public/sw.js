/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Feheziko PWA Service Worker - Versioned Cache Strategy & Offline Engine
 */

// Explicit Cache Versioning Strategy
const APP_CACHE_VERSION = "feheziko-app-v2";
const STATIC_CACHE_VERSION = "feheziko-static-v2";
const AUDIO_CACHE_VERSION = "feheziko-audio-v1";
const DATA_CACHE_VERSION = "feheziko-data-v1";

const CURRENT_CACHES = [
  APP_CACHE_VERSION,
  STATIC_CACHE_VERSION,
  AUDIO_CACHE_VERSION,
  DATA_CACHE_VERSION
];

// Essential App Shell assets to pre-cache on install
const PRECACHE_SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icon.jpg"
];

// Controlled default audio clips for immediate offline pronunciation demo
const DEFAULT_PRONUNCIATION_AUDIO = [
  "/audio/pronunciation/alphabet_fr.mp3",
  "/audio/pronunciation/greetings_fr.mp3",
  "/audio/pronunciation/phonetics_fr.mp3"
];

// Install Event: Pre-cache App Shell assets immediately
self.addEventListener("install", (event) => {
  console.log(`[Service Worker] Installing version ${APP_CACHE_VERSION}...`);
  event.waitUntil(
    caches.open(APP_CACHE_VERSION).then((cache) => {
      console.log("[Service Worker] Pre-caching core App Shell assets");
      return cache.addAll(PRECACHE_SHELL_ASSETS);
    })
  );
  // Note: We do NOT automatically call self.skipWaiting() here on install so that
  // the client application can prompt the user: "Une nouvelle version de Feheziko est disponible."
});

// Activate Event: Clean up outdated legacy caches, retaining user data & current versions
self.addEventListener("activate", (event) => {
  console.log(`[Service Worker] Activating version ${APP_CACHE_VERSION}...`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!CURRENT_CACHES.includes(cacheName)) {
            console.log("[Service Worker] Deleting obsolete legacy cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log("[Service Worker] Claiming clients for active Service Worker");
      return self.clients.claim();
    })
  );
});

// Fetch Event: Cache strategies tailored by resource type
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Ignore non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // 2. Skip dev server HMR / Vite / node_modules scripts to avoid dev server interference
  if (
    url.pathname.startsWith("/@") ||
    url.pathname.startsWith("/src/") ||
    url.pathname.endsWith(".ts") ||
    url.pathname.endsWith(".tsx") ||
    url.pathname.startsWith("/node_modules") ||
    (url.hostname === "localhost" && url.port !== "3000") ||
    request.url.includes("ws") ||
    request.url.includes("hot-update")
  ) {
    return;
  }

  // Strategy A: Audio Files (Cache First after controlled download)
  const isAudioFile = 
    request.destination === "audio" ||
    url.pathname.includes("/audio/") ||
    url.pathname.includes("/pronunciation/") ||
    url.pathname.endsWith(".mp3") ||
    url.pathname.endsWith(".wav") ||
    url.pathname.endsWith(".ogg") ||
    url.pathname.endsWith(".m4a") ||
    url.pathname.endsWith(".webm") ||
    url.pathname.endsWith(".aac");

  if (isAudioFile) {
    event.respondWith(
      caches.open(AUDIO_CACHE_VERSION).then((audioCache) => {
        return audioCache.match(request).then((cachedAudio) => {
          if (cachedAudio) {
            return cachedAudio;
          }

          return fetch(request)
            .then((networkResponse) => {
              if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
                audioCache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              return caches.match(request).then((fallback) => {
                return fallback || new Response("Audio offline non disponible", { status: 503, statusText: "Audio Unavailable" });
              });
            });
        });
      })
    );
    return;
  }

  // Strategy B: Static Assets (JS, CSS, Images, Fonts) -> Cache First with versioning
  const isGoogleFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  const isStaticAsset = 
    url.pathname.includes("/assets/") ||
    url.pathname.includes("/icons/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".json") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".woff2") ||
    isGoogleFont;

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (!networkResponse || (networkResponse.status !== 200 && networkResponse.status !== 0)) {
              return networkResponse;
            }

            const responseToCache = networkResponse.clone();
            caches.open(STATIC_CACHE_VERSION).then((cache) => {
              cache.put(request, responseToCache);
            });

            return networkResponse;
          })
          .catch(() => {
            return new Response("Resource statique indisponible hors ligne", { status: 503, statusText: "Service Unavailable" });
          });
      })
    );
    return;
  }

  // Strategy C: Application Navigation & HTML Pages -> Network First with Offline Fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(APP_CACHE_VERSION).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        console.log("[Service Worker] Operating in Offline mode for:", url.pathname);
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          if (request.mode === "navigate" || url.pathname.indexOf(".") === -1) {
            return caches.match("/index.html") || caches.match("/");
          }

          return new Response("Contenu hors ligne non disponible", { status: 503, statusText: "Offline Unavailable" });
        });
      })
  );
});

// Message Listener for Client Orchestration
let reminderTimeout;
self.addEventListener("message", (event) => {
  if (!event.data) return;

  // Handle explicit update command from user UI
  if (event.data.type === "SKIP_WAITING") {
    console.log("[Service Worker] Received SKIP_WAITING from client update notification.");
    self.skipWaiting();
    return;
  }

  // Controlled audio preloading per lesson or controlled set
  if (event.data.type === "PRELOAD_LESSON_AUDIO" || event.data.type === "PRELOAD_AUDIO_WIFI") {
    const urlsToPreload = Array.isArray(event.data.urls) && event.data.urls.length > 0 
      ? event.data.urls 
      : DEFAULT_PRONUNCIATION_AUDIO;

    console.log(`[Service Worker] Controlled pre-loading of ${urlsToPreload.length} audio file(s)...`);
    
    event.waitUntil(
      caches.open(AUDIO_CACHE_VERSION).then((audioCache) => {
        return Promise.allSettled(
          urlsToPreload.map(async (url) => {
            try {
              const match = await audioCache.match(url);
              if (!match) {
                const response = await fetch(url);
                if (response && (response.status === 200 || response.status === 0)) {
                  await audioCache.put(url, response);
                }
              }
            } catch (err) {
              console.warn("[Service Worker] Could not preload audio file:", url, err);
            }
          })
        ).then(() => {
          if (event.source && event.source.postMessage) {
            event.source.postMessage({
              type: "AUDIO_PRELOAD_COMPLETE",
              count: urlsToPreload.length
            });
          }
        });
      })
    );
  }

  // Schedule local notification reminder
  if (event.data.type === "schedule_reminder") {
    if (reminderTimeout) clearTimeout(reminderTimeout);

    reminderTimeout = setTimeout(() => {
      self.registration.showNotification(event.data.title, {
        body: event.data.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: "feheziko-practice-reminder",
        requireInteraction: true
      });
    }, event.data.delayMs);
  }
});
