/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "./index.css";
import frContent from "./languages/fr.json";
import { DatabaseEngine } from "./core/DatabaseEngine";
import { LearningEngine } from "./core/LearningEngine";
import { AudioEngine } from "./core/AudioEngine";
import { GameEngine } from "./core/GameEngine";
import { NotificationManager } from "./core/NotificationManager";
import { getSolarTimes } from "./utils/solarTheme";

// Import all Web Components so they get registered on load
import "./components/fz-navbar";
import "./components/fz-sidebar";
import "./components/fz-dashboard";
import "./components/fz-lesson";
import "./components/fz-dialogue";
import "./components/fz-dictionary";
import "./components/fz-payment";
import "./components/fz-settings";
import "./components/fz-badges";
import "./components/fz-challenges";
import "./components/fz-sync-status";
import "./components/fz-onboarding";
import "./components/fz-quick-search";
import "./components/fz-delf-exam";
import "./components/fz-admin-dashboard";
import "./components/fz-guided-tour";
import "./components/fz-update-banner";

export class FehezikoApp extends HTMLElement {
  private db!: DatabaseEngine;
  private learning!: LearningEngine;
  private audio!: AudioEngine;
  private game!: GameEngine;
  private notifier!: NotificationManager;
  private currentTab: string = "dashboard";
  private renderedTab: string = "";
  private isShellRendered: boolean = false;

  private isUpdatingTheme: boolean = false;

  constructor() {
    super();

    // Create a MutationObserver that watches for changes to the html element classes & theme attributes
    const observer = new MutationObserver((mutations) => {
      if (this.isUpdatingTheme) return;
      
      let shouldHandle = false;
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          (mutation.attributeName === "class" || mutation.attributeName === "theme" || mutation.attributeName === "data-theme")
        ) {
          shouldHandle = true;
          break;
        }
      }

      if (shouldHandle) {
        this.handleThemeChange();
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "theme", "data-theme"],
    });
  }

  private handleThemeChange() {
    if (this.isUpdatingTheme) return;
    this.isUpdatingTheme = true;

    try {
      const rootHtml = document.documentElement;
      const isDark =
        rootHtml.classList.contains("dark") ||
        rootHtml.classList.contains("dark-mode") ||
        rootHtml.getAttribute("theme") === "dark";

      // 1. Persist in localStorage
      try {
        localStorage.setItem("feheziko_dark_mode", isDark ? "true" : "false");
      } catch (e) {
        console.error("Failed to persist dark mode in localStorage:", e);
      }

      // 2. Set root CSS variable
      rootHtml.style.setProperty("--color-scheme", isDark ? "dark" : "light");

      // 3. Ensure root attributes & classes are aligned safely
      if (isDark) {
        if (!rootHtml.classList.contains("dark")) rootHtml.classList.add("dark");
        if (!rootHtml.classList.contains("dark-mode")) rootHtml.classList.add("dark-mode");
        if (rootHtml.getAttribute("theme") !== "dark") rootHtml.setAttribute("theme", "dark");
        if (rootHtml.getAttribute("data-theme") !== "dark") rootHtml.setAttribute("data-theme", "dark");
        if (!document.body.classList.contains("dark")) document.body.classList.add("dark", "dark-mode");
        if (!this.classList.contains("dark")) this.classList.add("dark", "dark-mode");
      } else {
        if (rootHtml.classList.contains("dark")) rootHtml.classList.remove("dark");
        if (rootHtml.classList.contains("dark-mode")) rootHtml.classList.remove("dark-mode");
        if (rootHtml.getAttribute("theme") !== "light" && rootHtml.hasAttribute("theme")) rootHtml.setAttribute("theme", "light");
        if (rootHtml.getAttribute("data-theme") !== "light" && rootHtml.hasAttribute("data-theme")) rootHtml.setAttribute("data-theme", "light");
        if (document.body.classList.contains("dark") || document.body.classList.contains("dark-mode")) {
          document.body.classList.remove("dark", "dark-mode");
        }
        if (this.classList.contains("dark") || this.classList.contains("dark-mode")) {
          this.classList.remove("dark", "dark-mode");
        }
      }

      // 4. Update host className without triggering DOM rebuild
      const desiredClass = "min-h-screen flex flex-col bg-slate-50" + (isDark ? " dark dark-mode" : "");
      if (this.className !== desiredClass) {
        this.className = desiredClass;
      }

      // 5. Propagate theme state immediately to child components
      this.applyDarkModeToChildren(isDark);
    } finally {
      this.isUpdatingTheme = false;
    }
  }

  connectedCallback() {
    // 1. Initialize core engines
    this.db = new DatabaseEngine();
    this.learning = new LearningEngine(this.db);
    this.audio = new AudioEngine();
    this.game = new GameEngine(this.db);
    this.notifier = new NotificationManager(this.db);
    this.notifier.init();

    // 2. Attach global orchestration context to window as requested
    (window as any).feheziko = {
      db: this.db,
      learning: this.learning,
      audio: this.audio,
      game: this.game,
      languageContent: frContent,
      currentTab: this.currentTab,
      navigate: (tab: string) => this.navigate(tab),
    };

    // 3. Sync initial dark mode & accessibility settings from localStorage / DatabaseEngine
    this.syncAccessibilitySettings();

    // 4. Render initial layout shell
    this.render();

    // 5. Handle global custom events
    window.addEventListener("feheziko_navigation", (e: any) => {
      if (e.detail && e.detail !== this.currentTab) {
        this.currentTab = e.detail;
        (window as any).feheziko.currentTab = e.detail;
        this.renderTabContent();
      }
    });

    window.addEventListener("feheziko_role_changed", () => {
      // Force return to main dashboard on role switch
      this.navigate("dashboard");
    });

    window.addEventListener("feheziko_activity_registered", () => {
      this.notifier.scheduleFutureReminder();
    });

    window.addEventListener("feheziko_state_changed", () => {
      // Sync accessibility/dark mode settings without wiping the full DOM shell
      this.syncAccessibilitySettings();
    });
  }

  public navigate(tab: string) {
    this.currentTab = tab;
    (window as any).feheziko.currentTab = tab;
    
    // Dispatch navigation event to all listening components
    window.dispatchEvent(new CustomEvent("feheziko_navigation", { detail: tab }));
    this.renderTabContent();
  }

  private syncAccessibilitySettings() {
    if (this.isUpdatingTheme) return;
    this.isUpdatingTheme = true;

    try {
      const progress = this.db.getProgress();
      const rootHtml = document.documentElement;

      // Read stored dark mode preference from localStorage with DB / Auto Dark Mode as fallback
      let isDark = progress.accessibility.darkMode;
      if (progress.accessibility.autoDarkMode) {
        const solar = getSolarTimes();
        isDark = solar.isNight;
      } else {
        try {
          const stored = localStorage.getItem("feheziko_dark_mode");
          if (stored !== null) {
            isDark = stored === "true";
          }
        } catch (e) {}
      }

      // 1. Text scale
      rootHtml.classList.remove("text-scale-large", "text-scale-extra");
      if (progress.accessibility.textSize === "large") rootHtml.classList.add("text-scale-large");
      else if (progress.accessibility.textSize === "extra") rootHtml.classList.add("text-scale-extra");

      // 2. Contrast
      if (progress.accessibility.contrast === "high") {
        rootHtml.classList.add("contrast-high");
      } else {
        rootHtml.classList.remove("contrast-high");
      }

      // 3. Colorblind
      if (progress.accessibility.colorblind) {
        rootHtml.classList.add("colorblind-mode");
      } else {
        rootHtml.classList.remove("colorblind-mode");
      }

      // 4. Dark Mode & CSS Variable
      rootHtml.style.setProperty("--color-scheme", isDark ? "dark" : "light");
      if (isDark) {
        if (!rootHtml.classList.contains("dark")) rootHtml.classList.add("dark");
        if (!rootHtml.classList.contains("dark-mode")) rootHtml.classList.add("dark-mode");
        if (rootHtml.getAttribute("theme") !== "dark") rootHtml.setAttribute("theme", "dark");
        if (rootHtml.getAttribute("data-theme") !== "dark") rootHtml.setAttribute("data-theme", "dark");
        if (!document.body.classList.contains("dark")) document.body.classList.add("dark", "dark-mode");
        if (!this.classList.contains("dark")) this.classList.add("dark", "dark-mode");
      } else {
        if (rootHtml.classList.contains("dark")) rootHtml.classList.remove("dark");
        if (rootHtml.classList.contains("dark-mode")) rootHtml.classList.remove("dark-mode");
        if (rootHtml.getAttribute("theme") === "dark") rootHtml.removeAttribute("theme");
        if (rootHtml.getAttribute("data-theme") === "dark") rootHtml.removeAttribute("data-theme");
        if (document.body.classList.contains("dark") || document.body.classList.contains("dark-mode")) {
          document.body.classList.remove("dark", "dark-mode");
        }
        if (this.classList.contains("dark") || this.classList.contains("dark-mode")) {
          this.classList.remove("dark", "dark-mode");
        }
      }

      // Persist to localStorage and sync with DatabaseEngine
      try {
        localStorage.setItem("feheziko_dark_mode", isDark ? "true" : "false");
      } catch (e) {}

      if (progress.accessibility.darkMode !== isDark) {
        this.db.updateAccessibility({ darkMode: isDark });
      }

      const desiredClass = "min-h-screen flex flex-col bg-slate-50" + (isDark ? " dark dark-mode" : "");
      if (this.className !== desiredClass) {
        this.className = desiredClass;
      }

      this.applyDarkModeToChildren(isDark);
    } finally {
      this.isUpdatingTheme = false;
    }
  }

  private render() {
    this.syncAccessibilitySettings();

    if (!this.isShellRendered) {
      this.innerHTML = `
        <!-- Onboarding Guided Overlay -->
        <fz-onboarding></fz-onboarding>

        <!-- Service Worker PWA Update Notification Banner -->
        <fz-update-banner></fz-update-banner>

        <!-- Guided Navigation Tour Popover Overlay -->
        <fz-guided-tour></fz-guided-tour>

        <!-- Global Quick Search Modal (Ctrl+K) -->
        <fz-quick-search></fz-quick-search>

        <!-- Navigation Header Custom Web Component -->
        <fz-navbar></fz-navbar>

        <!-- App body container -->
        <div class="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row min-w-0">
          <!-- Sidebar Navigation -->
          <fz-sidebar></fz-sidebar>

          <!-- Main Workspace Pane -->
          <main id="feheziko-main-workspace" class="flex-1 p-3 sm:p-5 lg:p-8 pb-20 sm:pb-24 md:pb-8 md:overflow-y-auto md:max-h-[calc(100vh-4rem)] min-w-0">
            <div id="feheziko-tab-container" class="animate-tab-switch min-w-0">
              ${this.getTabComponentHtml()}
            </div>
          </main>
        </div>
      `;
      this.isShellRendered = true;
      this.renderedTab = this.currentTab;
    } else {
      this.renderTabContent();
    }

    const isDark = document.documentElement.classList.contains("dark");
    this.applyDarkModeToChildren(isDark);
  }

  private renderTabContent() {
    if (this.renderedTab === this.currentTab && this.isShellRendered) {
      return;
    }

    const tabContainer = this.querySelector("#feheziko-tab-container");
    if (tabContainer) {
      // Re-trigger subtle page transition animation on tab switch
      tabContainer.classList.remove("animate-fade-in", "animate-tab-switch");
      void (tabContainer as HTMLElement).offsetWidth; // Force DOM reflow
      tabContainer.innerHTML = this.getTabComponentHtml();
      tabContainer.classList.add("animate-tab-switch");

      this.renderedTab = this.currentTab;
      
      const isDark = document.documentElement.classList.contains("dark");
      this.applyDarkModeToChildren(isDark);
    } else {
      // Re-render shell if container missing
      this.isShellRendered = false;
      this.render();
    }
  }

  private getTabComponentHtml(): string {
    if (this.currentTab === "lessons") {
      return "<fz-lesson></fz-lesson>";
    } else if (this.currentTab === "dialogues") {
      return "<fz-dialogue></fz-dialogue>";
    } else if (this.currentTab === "dictionary") {
      return "<fz-dictionary></fz-dictionary>";
    } else if (this.currentTab === "delf") {
      return "<fz-delf-exam></fz-delf-exam>";
    } else if (this.currentTab === "settings") {
      return "<fz-settings></fz-settings>";
    } else if (this.currentTab === "payment") {
      return "<fz-payment></fz-payment>";
    } else if (this.currentTab === "challenges") {
      return "<fz-challenges></fz-challenges>";
    } else if (this.currentTab === "admin") {
      return "<fz-admin-dashboard></fz-admin-dashboard>";
    }
    return "<fz-dashboard></fz-dashboard>";
  }

  private applyDarkModeToChildren(isDark?: boolean) {
    if (isDark === undefined) {
      isDark = document.documentElement.classList.contains("dark") || 
               document.documentElement.classList.contains("dark-mode") ||
               document.documentElement.getAttribute("theme") === "dark";
    }
    
    // Propagate dark mode classes & attributes globally to children custom elements
    const allCustomElements = this.querySelectorAll("*");
    allCustomElements.forEach((el) => {
      if (el.tagName.includes("-")) {
        if (isDark) {
          el.classList.add("dark", "dark-mode");
          el.setAttribute("theme", "dark");
        } else {
          el.classList.remove("dark", "dark-mode");
          el.removeAttribute("theme");
        }

        if (el.shadowRoot) {
          const firstChild = el.shadowRoot.firstElementChild;
          if (firstChild) {
            if (isDark) {
              firstChild.classList.add("dark", "dark-mode");
            } else {
              firstChild.classList.remove("dark", "dark-mode");
            }
          }
        }
      }
    });
  }
}

customElements.define("feheziko-app", FehezikoApp);

// Register Service Worker for true offline-first capability
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[Service Worker] Registered successfully with scope:", reg.scope);
      })
      .catch((err) => {
        console.error("[Service Worker] Registration failed:", err);
      });
  });
}

