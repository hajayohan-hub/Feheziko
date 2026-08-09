/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseEngine } from "../core/DatabaseEngine";

export class FzSyncStatus extends HTMLElement {
  private db!: DatabaseEngine;
  private isOnline: boolean = navigator.onLine;
  private wasOffline: boolean = !navigator.onLine;
  private isSyncing: boolean = false;
  private syncResult: "success" | "failed" | null = null;
  private resultTimeout: any = null;
  private syncInterval: any = null;
  private showReconnectedBanner: boolean = false;
  private reconnectedTimeout: any = null;
  private isPopoverOpen: boolean = false;

  private handleOnline = () => {
    const previousOfflineState = !this.isOnline || this.wasOffline;
    this.isOnline = true;
    this.wasOffline = false;

    if (previousOfflineState) {
      this.showReconnectedBanner = true;
      if (this.reconnectedTimeout) clearTimeout(this.reconnectedTimeout);
      
      // Auto-trigger background sync immediately upon reconnection
      this.triggerManualSync().then(() => {
        this.reconnectedTimeout = setTimeout(() => {
          this.showReconnectedBanner = false;
          this.render();
        }, 4000);
      });
    }

    this.render();
  };

  private handleOffline = () => {
    this.isOnline = false;
    this.wasOffline = true;
    this.showReconnectedBanner = false;
    this.render();
  };

  private handleStateChanged = () => {
    this.render();
  };

  private handleDocumentClick = (e: MouseEvent) => {
    if (this.isPopoverOpen && !this.contains(e.target as Node)) {
      this.isPopoverOpen = false;
      this.render();
    }
  };

  constructor() {
    super();
  }

  connectedCallback() {
    this.db = (window as any).feheziko?.db;
    
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
    window.addEventListener("feheziko_state_changed", this.handleStateChanged);
    window.addEventListener("feheziko_sync_history_updated", this.handleStateChanged);
    document.addEventListener("click", this.handleDocumentClick);

    // Apply dark mode propagation class if root has it
    const isDark = document.documentElement.classList.contains("dark") || 
                   document.documentElement.classList.contains("dark-mode");
    if (isDark) {
      this.classList.add("dark", "dark-mode");
    }

    // Start periodic background synchronization checks
    this.startPeriodicCheck();

    this.render();
  }

  disconnectedCallback() {
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    window.removeEventListener("feheziko_state_changed", this.handleStateChanged);
    window.removeEventListener("feheziko_sync_history_updated", this.handleStateChanged);
    document.removeEventListener("click", this.handleDocumentClick);
    if (this.resultTimeout) {
      clearTimeout(this.resultTimeout);
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }

  private startPeriodicCheck() {
    // Check connection state and perform auto-sync every 5 seconds
    this.syncInterval = setInterval(() => {
      const forced = this.db ? this.db.isForcedOffline() : false;
      const currentOnline = navigator.onLine && !forced;
      if (currentOnline !== this.isOnline) {
        if (currentOnline) {
          this.handleOnline();
        } else {
          this.handleOffline();
        }
      } else if (currentOnline && this.db && this.db.getSyncQueueLength() > 0 && !this.isSyncing) {
        this.triggerManualSync();
      }
    }, 5000);
  }

  private async triggerManualSync() {
    if (!this.db || this.isSyncing) return;
    if (this.db.isForcedOffline()) {
      this.syncResult = "failed";
      this.render();
      return;
    }
    
    this.isSyncing = true;
    this.syncResult = null;
    this.render();

    try {
      const success = await this.db.triggerSync();
      this.syncResult = success ? "success" : "failed";
    } catch {
      this.syncResult = "failed";
    } finally {
      this.isSyncing = false;
      this.render();

      if (this.resultTimeout) {
        clearTimeout(this.resultTimeout);
      }
      this.resultTimeout = setTimeout(() => {
        this.syncResult = null;
        this.render();
      }, 4000);
    }
  }

  private testConnection() {
    const forced = this.db ? this.db.isForcedOffline() : false;
    const online = navigator.onLine && !forced;
    if (online) {
      this.handleOnline();
    } else {
      this.render();
    }
  }

  private formatLastSyncedAt(isoString: string | null, isMg: boolean): { short: string; relative: string; full: string } {
    if (!isoString) {
      return {
        short: isMg ? "Tsy mbola synchro" : "Jamais synchro",
        relative: isMg ? "Tsy mbola nampifanarahina" : "Jamais synchronisé",
        full: isMg ? "Tsy mbola nisy fampifanarahana nahomby" : "Aucune synchronisation précédente enregistrée"
      };
    }

    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return {
        short: isMg ? "Daty tsy fantatra" : "Inconnu",
        relative: isMg ? "Daty tsy fantatra" : "Date inconnue",
        full: isMg ? "Daty tsy manankery" : "Date invalide"
      };
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);

    const hoursStr = date.getHours().toString().padStart(2, "0");
    const minsStr = date.getMinutes().toString().padStart(2, "0");
    const secsStr = date.getSeconds().toString().padStart(2, "0");
    const timeStr = `${hoursStr}:${minsStr}`;

    const isToday = now.toDateString() === date.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = yesterday.toDateString() === date.toDateString();

    let short = "";
    let relative = "";

    if (diffSec < 30) {
      short = isMg ? "Vao teo" : "À l'instant";
      relative = isMg ? "Vao teo kely" : "À l'instant";
    } else if (diffMin < 60) {
      short = isMg ? `${diffMin}m` : `${diffMin} min`;
      relative = isMg ? `${diffMin} min lasa` : `Il y a ${diffMin} min`;
    } else if (isToday) {
      short = timeStr;
      relative = isMg ? `Anio tamin'ny ${timeStr}` : `Aujourd'hui à ${timeStr}`;
    } else if (isYesterday) {
      short = isMg ? `Omaly ${timeStr}` : `Hier ${timeStr}`;
      relative = isMg ? `Omaly tamin'ny ${timeStr}` : `Hier à ${timeStr}`;
    } else {
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      short = `${day}/${month} ${timeStr}`;
      relative = isMg ? `${day}/${month}/${date.getFullYear()} ${timeStr}` : `${day}/${month}/${date.getFullYear()} à ${timeStr}`;
    }

    const dayNum = date.getDate().toString().padStart(2, "0");
    const monthNum = (date.getMonth() + 1).toString().padStart(2, "0");
    const yearNum = date.getFullYear();
    const full = isMg
      ? `${dayNum}/${monthNum}/${yearNum} tamin'ny ${timeStr}:${secsStr}`
      : `${dayNum}/${monthNum}/${yearNum} à ${timeStr}:${secsStr}`;

    return { short, relative, full };
  }

  private render() {
    if (!this.db) return;

    const progress = this.db.getProgress();
    const syncQueue = this.db.getSyncQueueLength();
    const lastSyncedAtIso = this.db.getLastSyncedAt();
    const lastSyncLog = this.db.getLastSyncLog();
    const isMg = progress.accessibility.language === "mg";
    const isForcedOffline = this.db.isForcedOffline();
    const effectiveOnline = navigator.onLine && !isForcedOffline;
    this.isOnline = effectiveOnline;

    const syncTimeInfo = this.formatLastSyncedAt(lastSyncedAtIso, isMg);

    const text = isMg ? {
      online: "Mifandray",
      offline: isForcedOffline ? "Forcé Hors-ligne (Local)" : "An-tsoratra (Hors-ligne)",
      syncPending: "Mbola ho synchronize-ina",
      syncNow: "Sync izao",
      syncing: "Mampifanaraka...",
      syncSuccess: "Tafiditra soa aman-tsara!",
      syncFailed: isForcedOffline ? "Voatana amin'ny lokal" : "Tsy nandeha ny fampifanarahana",
      tooltipOnline: "Mifandray amin'ny internet ianao. Milamina ny fitehirizana.",
      tooltipOffline: isForcedOffline 
        ? "Mode hors-ligne nosafidiana. Nostoppana ny réseau ary ny lokal daholo no ampiasaina."
        : "Tsy misy internet. Voatahiry ato amin'ny finday aloha ny fianaranao."
    } : {
      online: "Connecté",
      offline: isForcedOffline ? "Hors-Ligne Forcé (Local)" : "Hors-ligne (Local)",
      syncPending: "À synchroniser",
      syncNow: "Synchro",
      syncing: "Synchronisation...",
      syncSuccess: "Synchro réussie !",
      syncFailed: isForcedOffline ? "Bloqué (Mode Local)" : "Échec synchro",
      tooltipOnline: "Vous êtes connecté à internet. Votre progression est synchronisée.",
      tooltipOffline: isForcedOffline 
        ? "Mode hors-ligne forcé activé. Toutes les requêtes réseau sont bloquées et l'app utilise le stockage local."
        : "Pas d'internet. Votre progression est sauvegardée localement."
    };

    // Styling configuration based on connection state and status
    let statusBg = "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50";
    let statusDot = "bg-emerald-500 animate-pulse";
    let statusLabel = text.online;
    let tooltip = `${text.tooltipOnline} (${isMg ? "Fampifanarahana farany" : "Dernière synchro"}: ${syncTimeInfo.relative})`;

    if (isForcedOffline) {
      statusBg = "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700/80";
      statusDot = "bg-amber-600 animate-pulse";
      statusLabel = text.offline;
      tooltip = `${text.tooltipOffline} (${isMg ? "Fampifanarahana farany" : "Dernière synchro"}: ${syncTimeInfo.relative})`;
    } else if (!this.isOnline) {
      statusBg = "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50";
      statusDot = "bg-amber-500 animate-ping";
      statusLabel = text.offline;
      tooltip = `${text.tooltipOffline} (${isMg ? "Fampifanarahana farany" : "Dernière synchro"}: ${syncTimeInfo.relative})`;
    } else if (this.isSyncing) {
      statusBg = "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50";
      statusDot = "bg-indigo-500 animate-bounce";
      statusLabel = text.syncing;
    } else if (this.syncResult === "success") {
      statusBg = "bg-emerald-50 text-emerald-700 border-emerald-150 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50";
      statusDot = "bg-emerald-500";
      statusLabel = text.syncSuccess;
    } else if (this.syncResult === "failed") {
      statusBg = "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50";
      statusDot = "bg-rose-500";
      statusLabel = text.syncFailed;
    } else if (syncQueue > 0) {
      statusBg = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50";
      statusDot = "bg-amber-500 animate-bounce";
      statusLabel = `${text.syncPending} (${syncQueue})`;
    }

    this.className = "inline-block relative";

    this.innerHTML = `
      <div class="flex items-center gap-1.5 flex-wrap">
        <!-- Connection Status & Detailed Timestamp Pill -->
        <div id="statusPillMain" class="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-mono border transition-all duration-150 hover:shadow-xs cursor-pointer select-none ${statusBg}" title="${tooltip}">
          <span class="w-2 h-2 rounded-full shrink-0 ${statusDot}"></span>
          <span>${statusLabel}</span>
          
          <!-- Detailed 'Last Synced At' Timestamp Tag -->
          <span class="inline-flex items-center gap-1 opacity-85 text-[10px] font-mono border-l border-current/25 pl-1.5 ml-0.5" title="${isMg ? 'Fampifanarahana farany' : 'Dernière synchro'}: ${syncTimeInfo.full}">
            <svg class="w-2.5 h-2.5 shrink-0 opacity-70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>${syncTimeInfo.short}</span>
          </span>

          ${effectiveOnline ? `
            <button id="manualSyncBtn" class="ml-1 p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus:outline-none flex items-center justify-center cursor-pointer" title="${text.syncNow}">
              <svg class="w-3 h-3 text-current ${this.isSyncing ? 'animate-spin' : ''}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
              </svg>
            </button>
          ` : ''}
        </div>

        <!-- Manual 'Force Offline Mode' Toggle Control -->
        <button id="toggleForceOfflineBtn"
          class="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 border shadow-2xs active:scale-95 select-none ${
            isForcedOffline
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold ring-2 ring-amber-400/40'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
          }"
          title="${isMg ? 'Raha alefa ity, dia ajanona ny réseau ka ny data lokal ihany no ampiasaina' : 'Force le mode hors-ligne : stoppe le réseau et utilise uniquement les données locales'}">
          <span>${isForcedOffline ? '📴' : '🌐'}</span>
          <span>${isForcedOffline ? (isMg ? 'Forcé OFF' : 'Forcé OFF') : (isMg ? 'Réseau ON' : 'Réseau ON')}</span>
          <div class="w-6 h-3 rounded-full relative transition-colors duration-200 ${isForcedOffline ? 'bg-slate-950' : 'bg-slate-300 dark:bg-slate-600'}">
            <div class="w-2.5 h-2.5 rounded-full bg-white absolute top-0.25 transition-transform duration-200 ${isForcedOffline ? 'left-3.25' : 'left-0.25'} shadow-xs"></div>
          </div>
        </button>
      </div>

      <!-- Detailed Offline-First Sync Popover -->
      ${this.isPopoverOpen ? `
        <div id="syncDetailsPopover" class="absolute right-0 top-full mt-2 z-50 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 text-slate-800 dark:text-slate-100 animate-fade-in text-xs space-y-3 font-sans">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div class="flex items-center space-x-2">
              <span class="text-base">⚡</span>
              <span class="font-extrabold text-sm tracking-tight">${isMg ? "Statut Fampifanarahana" : "Statut de Synchronisation"}</span>
            </div>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded-full ${effectiveOnline ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 font-bold'}">
              ${effectiveOnline ? (isMg ? "Mifandray" : "En Ligne") : (isMg ? "Hors-Ligne" : "Hors-Ligne")}
            </span>
          </div>

          <!-- Detailed Last Synced At Box -->
          <div class="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-3 space-y-1">
            <div class="flex items-center justify-between text-[11px] font-semibold text-indigo-900 dark:text-indigo-200">
              <span class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ${isMg ? "Fampifanarahana farany" : "Dernière synchronisation"}
              </span>
              <span class="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">${syncTimeInfo.short}</span>
            </div>
            <p class="text-xs font-bold text-indigo-950 dark:text-indigo-100 font-mono">
              ${syncTimeInfo.relative}
            </p>
            <p class="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              ${syncTimeInfo.full}
            </p>
          </div>

          <!-- Storage Engine Info -->
          <div class="space-y-1.5 text-[11px]">
            <div class="flex justify-between items-center text-slate-500 dark:text-slate-400">
              <span>${isMg ? "Motera Fitehirizana" : "Moteur de stockage"} :</span>
              <span class="font-mono font-semibold text-slate-700 dark:text-slate-200">IndexedDB + LocalStorage</span>
            </div>
            <div class="flex justify-between items-center text-slate-500 dark:text-slate-400">
              <span>${isMg ? "Filan-kevitra miandry" : "Éléments en attente"} :</span>
              <span class="font-mono font-bold ${syncQueue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}">
                ${syncQueue} ${isMg ? "item(s)" : "item(s)"}
              </span>
            </div>
            ${lastSyncLog ? `
              <div class="flex justify-between items-center text-slate-500 dark:text-slate-400">
                <span>${isMg ? "Ataon'ny synchro farany" : "Dernier événement"} :</span>
                <span class="font-mono text-[10px] truncate max-w-[140px] text-slate-700 dark:text-slate-300" title="${lastSyncLog.payloadSummary}">${lastSyncLog.payloadSummary}</span>
              </div>
            ` : ''}
          </div>

          <!-- Actions -->
          <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <button id="popoverSyncBtn" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50" ${!effectiveOnline || this.isSyncing ? 'disabled' : ''}>
              <svg class="w-3.5 h-3.5 ${this.isSyncing ? 'animate-spin' : ''}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
              </svg>
              <span>${this.isSyncing ? (isMg ? "Mampifanaraka..." : "Synchro...") : (isMg ? "Sync Izao" : "Synchroniser")}</span>
            </button>
            <button id="popoverCloseBtn" class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer">
              ${isMg ? "Akatona" : "Fermer"}
            </button>
          </div>
        </div>
      ` : ''}

      <!-- Persistent Offline / Force Offline Banner Bar -->
      ${!effectiveOnline ? `
        <div class="fixed top-16 left-0 right-0 z-50 ${isForcedOffline ? 'bg-slate-950 text-amber-300 border-amber-500/80 shadow-xl ring-1 ring-amber-400/30' : 'bg-amber-600 text-white shadow-md border-amber-700/60'} border-b px-3 py-2 flex items-center justify-between text-xs font-semibold animate-fade-in backdrop-blur-md">
          <div class="flex items-center space-x-2 max-w-7xl mx-auto w-full justify-between">
            <div class="flex items-center space-x-2.5 min-w-0">
              <span class="text-base shrink-0">${isForcedOffline ? '📴' : '📡'}</span>
              <div class="truncate">
                <span class="font-black uppercase tracking-wider text-amber-200">${isMg ? "MODE HORS-LIGNE MANUEL (FORCÉ)" : "MODE HORS-LIGNE MANUEL FORCÉ"}</span>
                <span class="hidden sm:inline text-slate-200"> — ${isMg ? "Nostoppana ny réseau rehetra. Ny cache sy database lokal ihany no ampiasaina izao." : "Requêtes réseau suspendues. L'application s'exécute exclusivement sur les actifs et bases de données locales."}</span>
                ${syncQueue > 0 ? `<span class="bg-amber-800/90 text-amber-100 font-mono text-[10px] px-2 py-0.5 rounded-md ml-1 font-bold">${syncQueue} ${isMg ? "am-povoany" : "en attente"}</span>` : ''}
              </div>
            </div>
            
            <div class="flex items-center gap-2 shrink-0">
              ${isForcedOffline ? `
                <button id="disableForceOfflineBannerBtn" class="bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer border border-amber-300 shadow-md active:scale-95">
                  ⚡ ${isMg ? "Réactiver Réseau" : "Réactiver Réseau"}
                </button>
              ` : `
                <button id="checkConnectionBtn" class="bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border border-white/20 active:scale-95 ml-2">
                  ${isMg ? "Hanamarina" : "Tester"}
                </button>
              `}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Reconnected Auto-Sync Toast Banner -->
      ${this.showReconnectedBanner && !isForcedOffline ? `
        <div class="fixed top-16 left-0 right-0 z-50 ${this.isSyncing ? 'bg-indigo-600' : 'bg-emerald-600'} text-white shadow-lg border-b border-emerald-700/50 px-3 py-2 flex items-center justify-center text-xs font-bold animate-fade-in backdrop-blur-md">
          <div class="flex items-center space-x-2">
            <span class="text-sm sm:text-base ${this.isSyncing ? 'animate-spin' : ''}">${this.isSyncing ? '🔄' : '✅'}</span>
            <span>
              ${this.isSyncing 
                ? (isMg ? "Miverina ny internet! Mampifanaraka ny tahiry am-pitiavana..." : "Connexion rétablie ! Synchronisation automatique des données en arrière-plan...")
                : (isMg ? "Tafiditra soa aman-tsara ny tahiry rehetra!" : "Connexion rétablie ! Données synchronisées avec succès.")
              }
            </span>
          </div>
        </div>
      ` : ''}
    `;

    // Event listeners
    this.querySelector("#statusPillMain")?.addEventListener("click", (e) => {
      // Don't toggle popover if clicking manualSyncBtn directly
      const target = e.target as HTMLElement;
      if (target.closest("#manualSyncBtn")) return;
      this.isPopoverOpen = !this.isPopoverOpen;
      this.render();
    });

    this.querySelector("#manualSyncBtn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.triggerManualSync();
    });

    this.querySelector("#popoverSyncBtn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.triggerManualSync();
    });

    this.querySelector("#popoverCloseBtn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.isPopoverOpen = false;
      this.render();
    });

    this.querySelector("#toggleForceOfflineBtn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.db.setForcedOffline(!isForcedOffline);
      this.render();
    });

    this.querySelector("#disableForceOfflineBannerBtn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.db.setForcedOffline(false);
      this.render();
    });

    this.querySelector("#checkConnectionBtn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.testConnection();
    });
  }
}

customElements.define("fz-sync-status", FzSyncStatus);
