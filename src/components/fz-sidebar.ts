/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseEngine } from "../core/DatabaseEngine";

export class FzSidebar extends HTMLElement {
  private db!: DatabaseEngine;
  private currentTab: string = "dashboard";

  constructor() {
    super();
  }

  connectedCallback() {
    this.db = (window as any).feheziko?.db;
    this.currentTab = (window as any).feheziko?.currentTab || "dashboard";
    this.render();

    window.addEventListener("feheziko_navigation", (e: any) => {
      this.currentTab = e.detail;
      this.render();
    });

    window.addEventListener("feheziko_state_changed", () => {
      this.render();
    });
  }

  private render() {
    if (!this.db) return;
    const progress = this.db.getProgress();

    const isMg = progress.accessibility.language === "mg";
    const text = isMg ? {
      dashboard: "Tondro (Bord)",
      lessons: "Lesona (Cours)",
      dialogues: "Dinika (Dialogues)",
      dictionary: "Rakibolana (Dict)",
      challenges: "Fanamby (Défis)",
      delf: "DELF A1/A2 & Centres",
      settings: "Fikirana (Config)",
      pay: "Hamidiana (Pay)"
    } : {
      dashboard: "Dashboard",
      lessons: "Cours",
      dialogues: "Dialogues",
      dictionary: "Dictionnaire",
      challenges: "Défis Globaux",
      delf: "Examens DELF A1 / A2",
      settings: "Configuration",
      pay: "Premium"
    };

    const textClass = progress.accessibility.textSize === "large" ? "text-base font-semibold" : 
                      progress.accessibility.textSize === "extra" ? "text-lg font-bold" : "text-sm font-medium";

    this.className = "fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] pb-safe md:pb-0 md:relative md:w-64 md:bg-slate-50/95 md:dark:bg-slate-900/95 md:border-t-0 md:border-r md:min-h-[calc(100vh-4rem)] md:p-4 md:flex md:flex-col md:justify-between md:z-40 shrink-0";

    const mgShort = {
      dashboard: "Bord",
      lessons: "Cours",
      dialogues: "Dinika",
      dictionary: "Dict",
      challenges: "Défis",
      delf: "DELF",
      settings: "Config"
    };

    const frShort = {
      dashboard: "Tableau",
      lessons: "Cours",
      dialogues: "Dialogues",
      dictionary: "Dict.",
      challenges: "Défis",
      delf: "DELF",
      settings: "Option"
    };

    const shortLabels = isMg ? mgShort : frShort;

    this.innerHTML = `
      <nav class="grid grid-cols-7 h-15 md:h-auto items-center px-1 md:flex md:flex-col md:space-y-1.5 md:px-0 md:space-x-0 w-full">
        <!-- Dashboard Button -->
        <button id="nav-dashboard" class="flex flex-col md:flex-row items-center justify-center md:justify-start md:space-x-3 px-1 py-1 md:px-4 md:py-3 rounded-xl transition-all duration-150 whitespace-nowrap focus:outline-none shrink-0 relative cursor-pointer active:scale-90 md:active:scale-100 ${
          this.currentTab === "dashboard"
            ? "text-indigo-600 dark:text-indigo-400 font-extrabold md:bg-indigo-600 md:text-white md:shadow-md md:shadow-indigo-100 md:dark:shadow-none"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 md:hover:bg-slate-100 md:dark:hover:bg-slate-800"
        }">
          ${this.currentTab === "dashboard" ? `<span class="md:hidden absolute top-0 w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"></span>` : ""}
          <span class="text-xl md:text-lg transition-transform ${this.currentTab === "dashboard" ? "scale-110 md:scale-100" : ""}">📊</span>
          <span class="text-[10px] md:hidden font-bold tracking-tight mt-0.5">${shortLabels.dashboard}</span>
          <span class="hidden md:inline ${textClass}">${text.dashboard}</span>
        </button>

        <!-- Lessons Button -->
        <button id="nav-lessons" class="flex flex-col md:flex-row items-center justify-center md:justify-start md:space-x-3 px-1 py-1 md:px-4 md:py-3 rounded-xl transition-all duration-150 whitespace-nowrap focus:outline-none shrink-0 relative cursor-pointer active:scale-90 md:active:scale-100 ${
          this.currentTab === "lessons"
            ? "text-indigo-600 dark:text-indigo-400 font-extrabold md:bg-indigo-600 md:text-white md:shadow-md md:shadow-indigo-100 md:dark:shadow-none"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 md:hover:bg-slate-100 md:dark:hover:bg-slate-800"
        }">
          ${this.currentTab === "lessons" ? `<span class="md:hidden absolute top-0 w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"></span>` : ""}
          <span class="text-xl md:text-lg transition-transform ${this.currentTab === "lessons" ? "scale-110 md:scale-100" : ""}">📚</span>
          <span class="text-[10px] md:hidden font-bold tracking-tight mt-0.5">${shortLabels.lessons}</span>
          <span class="hidden md:inline ${textClass}">${text.lessons}</span>
        </button>

        <!-- Dialogues Button -->
        <button id="nav-dialogues" class="flex flex-col md:flex-row items-center justify-center md:justify-start md:space-x-3 px-1 py-1 md:px-4 md:py-3 rounded-xl transition-all duration-150 whitespace-nowrap focus:outline-none shrink-0 relative cursor-pointer active:scale-90 md:active:scale-100 ${
          this.currentTab === "dialogues"
            ? "text-indigo-600 dark:text-indigo-400 font-extrabold md:bg-indigo-600 md:text-white md:shadow-md md:shadow-indigo-100 md:dark:shadow-none"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 md:hover:bg-slate-100 md:dark:hover:bg-slate-800"
        }">
          ${this.currentTab === "dialogues" ? `<span class="md:hidden absolute top-0 w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"></span>` : ""}
          <span class="text-xl md:text-lg transition-transform ${this.currentTab === "dialogues" ? "scale-110 md:scale-100" : ""}">💬</span>
          <span class="text-[10px] md:hidden font-bold tracking-tight mt-0.5">${shortLabels.dialogues}</span>
          <span class="hidden md:inline ${textClass}">${text.dialogues}</span>
        </button>

        <!-- Dictionary Button -->
        <button id="nav-dictionary" class="flex flex-col md:flex-row items-center justify-center md:justify-start md:space-x-3 px-1 py-1 md:px-4 md:py-3 rounded-xl transition-all duration-150 whitespace-nowrap focus:outline-none shrink-0 relative cursor-pointer active:scale-90 md:active:scale-100 ${
          this.currentTab === "dictionary"
            ? "text-indigo-600 dark:text-indigo-400 font-extrabold md:bg-indigo-600 md:text-white md:shadow-md md:shadow-indigo-100 md:dark:shadow-none"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 md:hover:bg-slate-100 md:dark:hover:bg-slate-800"
        }">
          ${this.currentTab === "dictionary" ? `<span class="md:hidden absolute top-0 w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"></span>` : ""}
          <span class="text-xl md:text-lg transition-transform ${this.currentTab === "dictionary" ? "scale-110 md:scale-100" : ""}">📖</span>
          <span class="text-[10px] md:hidden font-bold tracking-tight mt-0.5">${shortLabels.dictionary}</span>
          <span class="hidden md:inline ${textClass}">${text.dictionary}</span>
        </button>

        <!-- Challenges Button (Fanamby) -->
        <button id="nav-challenges" class="flex flex-col md:flex-row items-center justify-center md:justify-start md:space-x-3 px-1 py-1 md:px-4 md:py-3 rounded-xl transition-all duration-150 whitespace-nowrap focus:outline-none shrink-0 relative cursor-pointer active:scale-90 md:active:scale-100 ${
          this.currentTab === "challenges"
            ? "text-indigo-600 dark:text-indigo-400 font-extrabold md:bg-indigo-600 md:text-white md:shadow-md md:shadow-indigo-100 md:dark:shadow-none"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 md:hover:bg-slate-100 md:dark:hover:bg-slate-800"
        }">
          ${this.currentTab === "challenges" ? `<span class="md:hidden absolute top-0 w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"></span>` : ""}
          <span class="text-xl md:text-lg transition-transform ${this.currentTab === "challenges" ? "scale-110 md:scale-100" : ""}">🏆</span>
          <span class="text-[10px] md:hidden font-bold tracking-tight mt-0.5">${shortLabels.challenges}</span>
          <span class="hidden md:inline ${textClass}">${text.challenges}</span>
        </button>

        <!-- DELF A1/A2 Capstone Button (After Fanamby) -->
        <button id="nav-delf" class="flex flex-col md:flex-row items-center justify-center md:justify-start md:space-x-3 px-1 py-1 md:px-4 md:py-3 rounded-xl transition-all duration-150 whitespace-nowrap focus:outline-none shrink-0 relative cursor-pointer active:scale-90 md:active:scale-100 ${
          this.currentTab === "delf"
            ? "text-indigo-600 dark:text-indigo-400 font-extrabold md:bg-indigo-600 md:text-white md:shadow-md md:shadow-indigo-100 md:dark:shadow-none"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 md:hover:bg-slate-100 md:dark:hover:bg-slate-800"
        }">
          ${this.currentTab === "delf" ? `<span class="md:hidden absolute top-0 w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"></span>` : ""}
          <span class="text-xl md:text-lg transition-transform ${this.currentTab === "delf" ? "scale-110 md:scale-100" : ""}">🎓</span>
          <span class="text-[10px] md:hidden font-bold tracking-tight mt-0.5">${shortLabels.delf}</span>
          <span class="hidden md:inline ${textClass}">${text.delf}</span>
        </button>

        <!-- Settings Button -->
        <button id="nav-settings" class="flex flex-col md:flex-row items-center justify-center md:justify-start md:space-x-3 px-1 py-1 md:px-4 md:py-3 rounded-xl transition-all duration-150 whitespace-nowrap focus:outline-none shrink-0 relative cursor-pointer active:scale-90 md:active:scale-100 ${
          this.currentTab === "settings"
            ? "text-indigo-600 dark:text-indigo-400 font-extrabold md:bg-indigo-600 md:text-white md:shadow-md md:shadow-indigo-100 md:dark:shadow-none"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 md:hover:bg-slate-100 md:dark:hover:bg-slate-800"
        }">
          ${this.currentTab === "settings" ? `<span class="md:hidden absolute top-0 w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"></span>` : ""}
          <span class="text-xl md:text-lg transition-transform ${this.currentTab === "settings" ? "scale-110 md:scale-100" : ""}">⚙️</span>
          <span class="text-[10px] md:hidden font-bold tracking-tight mt-0.5">${shortLabels.settings}</span>
          <span class="hidden md:inline ${textClass}">${text.settings}</span>
        </button>

        <!-- Admin Dashboard Button -->
        <button id="nav-admin" class="flex flex-col md:flex-row items-center justify-center md:justify-start md:space-x-3 px-1 py-1 md:px-4 md:py-3 rounded-xl transition-all duration-150 whitespace-nowrap focus:outline-none shrink-0 relative cursor-pointer active:scale-90 md:active:scale-100 ${
          this.currentTab === "admin"
            ? "text-amber-600 dark:text-amber-400 font-extrabold md:bg-amber-600 md:text-white md:shadow-md md:shadow-amber-100 md:dark:shadow-none"
            : "text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 md:hover:bg-amber-50 md:dark:hover:bg-amber-950/40"
        }">
          ${this.currentTab === "admin" ? `<span class="md:hidden absolute top-0 w-8 h-1 bg-amber-600 dark:bg-amber-400 rounded-full"></span>` : ""}
          <span class="text-xl md:text-lg transition-transform ${this.currentTab === "admin" ? "scale-110 md:scale-100" : ""}">🛡️</span>
          <span class="text-[10px] md:hidden font-bold tracking-tight mt-0.5">Admin</span>
          <span class="hidden md:inline ${textClass} font-bold">Admin Feheziko</span>
        </button>
      </nav>

      <!-- Bottom Quick Pay Invite & Guided Tour -->
      <div class="hidden md:block bg-gradient-to-br from-indigo-50/80 to-purple-50/80 dark:from-slate-900 dark:to-indigo-950/60 rounded-2xl p-3.5 border border-indigo-100 dark:border-slate-800 mt-auto space-y-2">
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-slate-800 dark:text-slate-200 text-xs">Feheziko App</h4>
          <button id="sidebarStartTourBtn" class="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-extrabold text-[11px] rounded-lg border border-indigo-200/80 dark:border-indigo-800/80 transition-all cursor-pointer shadow-2xs flex items-center gap-1 active:scale-95" title="Hagaga ny fampidirana">
            <span>🧭</span>
            <span>Tour</span>
          </button>
        </div>
        <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Haingana, feno ary tsy mila tambajotra Internet.</p>
        <button onclick="window.feheziko.navigate('payment')" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-xl transition-colors shadow-xs cursor-pointer">
          👑 Hiditra Premium
        </button>
      </div>
    `;

    // Click Bindings
    this.querySelector("#sidebarStartTourBtn")?.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("feheziko_start_guided_tour"));
    });

    const tabs = ["dashboard", "lessons", "dialogues", "dictionary", "challenges", "delf", "settings", "admin"];
    tabs.forEach(tab => {
      this.querySelector(`#nav-${tab}`)?.addEventListener("click", () => {
        (window as any).feheziko.navigate(tab);
      });
    });
  }
}

customElements.define("fz-sidebar", FzSidebar);
