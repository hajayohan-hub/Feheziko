/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseEngine } from "../core/DatabaseEngine";
import { LearningEngine } from "../core/LearningEngine";

export class FzNavbar extends HTMLElement {
  private db!: DatabaseEngine;
  private learning!: LearningEngine;
  private isOnline: boolean = navigator.onLine;

  private handleOnline = () => {
    this.isOnline = true;
    this.render();
  };

  private handleOffline = () => {
    this.isOnline = false;
    this.render();
  };

  constructor() {
    super();
  }

  connectedCallback() {
    this.db = (window as any).feheziko?.db;
    this.learning = (window as any).feheziko?.learning;
    this.render();
    
    // Listen to state changes
    window.addEventListener("feheziko_state_changed", () => {
      this.render();
    });

    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
  }

  disconnectedCallback() {
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
  }

  private render() {
    if (!this.db || !this.learning) return;

    const progress = this.db.getProgress();
    const level = this.learning.getLevel();
    const xpPercent = this.learning.getProgressPercentage();
    const nextLevelXp = this.learning.getXpForNextLevel();
    const syncQueue = this.db.getSyncQueueLength();

    const text = progress.accessibility.language === "mg" ? {
      roleLabel: "Sehatra:",
      apprenant: "Mpianatra",
      enseignant: "Mpampianatra",
      ecole: "Sekoly",
      admin: "Admin",
      premium: "Premium",
      free: "Maimaimpoana",
      online: "Mifandray (Online)",
      offline: "Tsy mifandray (Voatahiry)",
      syncPending: "Miandry fampitahana"
    } : {
      roleLabel: "Espace :",
      apprenant: "Apprenant",
      enseignant: "Enseignant",
      ecole: "École",
      admin: "Admin",
      premium: "Premium",
      free: "Gratuit",
      online: "En ligne",
      offline: "Hors-ligne (Mis en cache)",
      syncPending: "Synco en attente"
    };

    // Apply font size class based on accessibility
    const textClass = progress.accessibility.textSize === "large" ? "text-lg" : 
                      progress.accessibility.textSize === "extra" ? "text-xl" : "text-sm";

    const titleClass = progress.accessibility.textSize === "large" ? "text-2xl" : 
                       progress.accessibility.textSize === "extra" ? "text-3xl" : "text-xl";

    this.className = "block bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs transition-colors";

    this.innerHTML = `
      <div class="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center gap-1.5 sm:gap-4">
          <!-- Logo & Brand -->
          <div class="flex items-center space-x-2 sm:space-x-3 shrink-0 cursor-pointer" onclick="window.feheziko.navigate('dashboard')">
            <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-md shadow-indigo-200 shrink-0">
              F
            </div>
            <div>
              <h1 class="font-bold text-gray-900 tracking-tight text-base sm:text-xl">Feheziko</h1>
              <p class="text-[9px] sm:text-[10px] font-mono text-indigo-600 font-semibold tracking-widest uppercase hidden xs:block">Platform • FR</p>
            </div>
          </div>

          <!-- XP, Streak, Role & Sync Stats -->
          <div class="flex items-center space-x-1.5 sm:space-x-3 overflow-x-auto no-scrollbar py-1">
            <!-- Connection & Offline Sync Status Indicator Component -->
            <fz-sync-status class="shrink-0"></fz-sync-status>

            <!-- Streak Counter -->
            <div class="flex items-center space-x-1 bg-gradient-to-r from-amber-50 to-amber-100/80 text-amber-800 border border-amber-200/70 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-sm hover:shadow transition-all duration-150 cursor-pointer shrink-0 hover:scale-105 active:scale-95"
                 title="${progress.accessibility.language === "mg" ? "Série-nao ankehitriny" : "Votre série actuelle"}"
                 onclick="window.feheziko.navigate('dashboard')">
              <span class="${progress.currentStreak > 0 ? "animate-bounce" : "opacity-50"}" style="animation-duration: 2s; display: inline-block;">🔥</span>
              <span class="font-mono tracking-tight">${progress.currentStreak}<span class="hidden xs:inline"> ${progress.accessibility.language === "mg" ? "andro" : "j"}</span></span>
            </div>

            <!-- XP Level Badge -->
            <div class="flex flex-col items-end shrink-0">
              <div class="flex items-center space-x-1">
                <span class="text-[10px] sm:text-xs font-semibold text-gray-500">Lv.${level}</span>
                <span class="bg-indigo-50 text-indigo-700 text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-md">${progress.xp}XP</span>
              </div>
              <!-- Progress Bar -->
              <div class="hidden md:block w-20 lg:w-24 h-1.5 bg-gray-100 rounded-full mt-0.5 overflow-hidden">
                <div class="h-full bg-indigo-600 transition-all duration-300" style="width: ${xpPercent}%"></div>
              </div>
            </div>

            <!-- Role Selector Switcher -->
            <div class="flex items-center space-x-1 bg-gray-50 p-0.5 sm:p-1 rounded-lg border border-gray-200 shrink-0">
              <label class="text-[10px] font-bold text-gray-400 uppercase px-1 hidden lg:block">${text.roleLabel}</label>
              <select id="roleSelect" class="bg-white border-0 text-[11px] sm:text-xs font-semibold text-gray-700 rounded-md py-1 px-1 sm:px-2 shadow-xs focus:ring-1 focus:ring-indigo-500 cursor-pointer">
                <option value="apprenant" ${progress.role === "apprenant" ? "selected" : ""}>👨‍🎓 ${text.apprenant}</option>
                <option value="enseignant" ${progress.role === "enseignant" ? "selected" : ""}>👩‍🏫 ${text.enseignant}</option>
                <option value="ecole" ${progress.role === "ecole" ? "selected" : ""}>🏫 ${text.ecole}</option>
                <option value="admin" ${progress.role === "admin" ? "selected" : ""}>⚙️ ${text.admin}</option>
              </select>
            </div>

            <!-- Quick Search Ctrl+K Button -->
            <button id="quickSearchNavBtn"
                    class="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 text-slate-700 dark:text-slate-200 active:scale-95 shadow-2xs shrink-0"
                    title="${progress.accessibility.language === "mg" ? "Karoka haingana (Ctrl+K)" : "Recherche rapide (Ctrl+K)"}">
              <span class="text-sm">🔍</span>
              <span class="hidden md:inline font-bold">${progress.accessibility.language === "mg" ? "Karoka" : "Recherche"}</span>
              <span class="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-black text-slate-500 dark:text-slate-400">Ctrl+K</span>
            </button>

            <!-- Quick Dark Mode Toggle Button -->
            <button id="quickDarkModeBtn" 
                    class="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200/70 text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer flex items-center justify-center text-slate-700 active:scale-95 shadow-xs shrink-0"
                    title="${progress.accessibility.darkMode ? "Mode clair" : "Mode sombre"}">
              ${progress.accessibility.darkMode ? "☀️" : "🌙"}
            </button>

            <!-- Premium Badge -->
            <div class="cursor-pointer shrink-0" onclick="window.feheziko.navigate('payment')">
              ${
                progress.subscription.status === "premium"
                  ? `<span class="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shadow-sm">👑 PRO</span>`
                  : `<span class="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full transition-colors border border-gray-300">🔓 FREE</span>`
              }
            </div>
          </div>
        </div>
      </div>
    `;

    // Add event listener to select
    this.querySelector("#roleSelect")?.addEventListener("change", (e: Event) => {
      const newRole = (e.target as HTMLSelectElement).value as any;
      this.db.setRole(newRole);
      
      // Dispatch standard notification
      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
      window.dispatchEvent(new CustomEvent("feheziko_role_changed", { detail: newRole }));
    });

    // Add event listener to quick search nav button
    this.querySelector("#quickSearchNavBtn")?.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("feheziko_open_quick_search"));
    });

    // Add event listener to quick dark mode toggle button
    this.querySelector("#quickDarkModeBtn")?.addEventListener("click", () => {
      const currentProgress = this.db.getProgress();
      const nextDarkMode = !currentProgress.accessibility.darkMode;
      this.db.updateAccessibility({ darkMode: nextDarkMode });

      const root = document.documentElement;
      if (nextDarkMode) {
        root.classList.add("dark", "dark-mode");
        root.setAttribute("theme", "dark");
        root.setAttribute("data-theme", "dark");
        document.body.classList.add("dark", "dark-mode");
      } else {
        root.classList.remove("dark", "dark-mode");
        root.removeAttribute("theme");
        root.removeAttribute("data-theme");
        document.body.classList.remove("dark", "dark-mode");
      }

      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
    });
  }
}

customElements.define("fz-navbar", FzNavbar);
