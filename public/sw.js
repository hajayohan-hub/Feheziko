/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const CACHE_NAME = "feheziko-offline-cache-v1";
const AUDIO_CACHE_NAME = "feheziko-audio-pronunciation-v1";

// Essential static resources to pre-cache on service worker install
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon.jpg"
];

// Pre-defined pronunciation audio files for AudioEngine
const DEFAULT_PRONUNCIATION_AUDIO = [
  "/audio/pronunciation/alphabet_fr.mp3",
  "/audio/pronunciation/greetings_fr.mp3",
  "/audio/pronunciation/delf_a1_listening.mp3",
  "/audio/pronunciation/delf_a2_listening.mp3",
  "/audio/pronunciation/phonetics_fr.mp3"
];

// Install Event: open cache and store critical resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching offline-first shell assets");
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      // Force the waiting service worker to become active immediately
      return self.skipWaiting();
    })
  );
});

// Activate Event: clean up outdated legacy caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== AUDIO_CACHE_NAME) {
            console.log("[Service Worker] Removing outdated cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all open clients/tabs immediately
      return self.clients.claim();
    })
  );
});

// Fetch Event: handle offline resource retrieval
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Skip non-GET requests (e.g. POST, PUT)
  if (request.method !== "GET") {
    return;
  }

  // 2. Skip development HMR, Vite scripts, and source files to avoid dev server interference
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

  // Priority Check: Pronunciation Audio Files for AudioEngine
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
      caches.open(AUDIO_CACHE_NAME).then((audioCache) => {
        return audioCache.match(request).then((cachedAudio) => {
          if (cachedAudio) {
            console.log("[Service Worker] Priority audio cache hit:", url.pathname);
            return cachedAudio;
          }

          // Fetch from network and store in priority audio cache
          return fetch(request)
            .then((networkResponse) => {
              if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
                audioCache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              return caches.match(request).then((fallback) => {
                return fallback || new Response("Audio offline fallback", { status: 503, statusText: "Audio Unavailable" });
              });
            });
        });
      })
    );
    return;
  }

  // 3. For asset files (JS, CSS, images, fonts, json) we prefer Cache-First
  const isGoogleFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  const isStaticAsset = 
    url.pathname.includes("/assets/") ||
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

        // If not in cache, fetch from network, cache it on the fly, and return
        return fetch(request)
          .then((networkResponse) => {
            if (!networkResponse || (networkResponse.status !== 200 && networkResponse.status !== 0)) {
              return networkResponse;
            }

            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });

            return networkResponse;
          })
          .catch(() => {
            return new Response("Asset offline fallback", { status: 503, statusText: "Service Unavailable" });
          });
      })
    );
  } else {
    // 4. For HTML, manifest, and application routes, we prefer Network-First (with cache fallback)
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          console.log("[Service Worker] Network unavailable. Serving offline resource:", url.pathname);
          
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }

            if (request.mode === "navigate" || url.pathname.indexOf(".") === -1) {
              return caches.match("/index.html") || caches.match("/");
            }

            return new Response("Offline content not available", { status: 503, statusText: "Service Unavailable" });
          });
        })
    );
  }
});

// Message Event: Handle commands including Wi-Fi priority audio pre-loading
let reminderTimeout;
self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data.type === "PRELOAD_AUDIO_WIFI" || event.data.type === "PRELOAD_PRONUNCIATION_AUDIO") {
    const isWifi = event.data.isWifi !== false;
    const urlsToPreload = Array.isArray(event.data.urls) && event.data.urls.length > 0 
      ? event.data.urls 
      : DEFAULT_PRONUNCIATION_AUDIO;

    if (isWifi) {
      console.log(`[Service Worker] Wi-Fi connection confirmed! Pre-loading ${urlsToPreload.length} pronunciation audio files into priority cache...`);
      
      event.waitUntil(
        caches.open(AUDIO_CACHE_NAME).then((audioCache) => {
          return Promise.allSettled(
            urlsToPreload.map(async (url) => {
              try {
                const match = await audioCache.match(url);
                if (!match) {
                  const response = await fetch(url);
                  if (response && (response.status === 200 || response.status === 0)) {
                    await audioCache.put(url, response);
                    console.log("[Service Worker] Preloaded pronunciation audio file on Wi-Fi:", url);
                  }
                } else {
                  console.log("[Service Worker] Pronunciation audio file already cached:", url);
                }
              } catch (err) {
                console.warn("[Service Worker] Failed to preload audio file:", url, err);
              }
            })
          ).then(() => {
            console.log("[Service Worker] Wi-Fi pronunciation audio priority caching complete.");
            if (event.source && event.source.postMessage) {
              event.source.postMessage({
                type: "AUDIO_PRELOAD_COMPLETE",
                count: urlsToPreload.length,
                isWifi: true
              });
            }
          });
        })
      );
    } else {
      console.log("[Service Worker] Non-Wi-Fi connection detected. Skipping automatic heavy audio preloading to save cellular data.");
    }
  }

  if (event.data.type === "schedule_reminder") {
    console.log("[Service Worker] Received schedule_reminder command. Delay:", event.data.delayMs);
    if (reminderTimeout) clearTimeout(reminderTimeout);

    reminderTimeout = setTimeout(() => {
      self.registration.showNotification(event.data.title, {
        body: event.data.body,
        icon: "/icon.jpg",
        badge: "/icon.jpg",
        tag: "feheziko-practice-reminder",
        requireInteraction: true
      });
    }, event.data.delayMs);
  }
});
