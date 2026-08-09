/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseEngine } from "../core/DatabaseEngine";
import { getSolarTimes, requestGeolocation } from "../utils/solarTheme";

export class FzSettings extends HTMLElement {
  private db!: DatabaseEngine;
  private cachedLessons: any[] = [];
  private cachedDialogues: any[] = [];
  private downloadingPackId: string | null = null;
  private downloadProgressPct: number = 0;
  private downloadProgressStatus: string = "";
  private storageEstimate: { usage: number; quota: number } | null = null;
  private swStatus: "active" | "registered" | "inactive" = "inactive";
  private isLoaded: boolean = false;
  private currentTourStep: number = -1;
  private micStream: MediaStream | null = null;
  private micAudioContext: AudioContext | null = null;
  private micAnimationId: number | null = null;
  private activeTab: "general" | "sync_history" = "general";
  private showOfflineHelp: boolean = false;

  private handleStateChanged = () => {
    this.render();
    this.loadStorageData();
  };

  private handleSyncHistoryUpdated = () => {
    this.render();
  };

  constructor() {
    super();
  }

  connectedCallback() {
    this.db = (window as any).feheziko?.db;
    this.render();
    this.loadStorageData();

    window.addEventListener("feheziko_state_changed", this.handleStateChanged);
    window.addEventListener("feheziko_sync_history_updated", this.handleSyncHistoryUpdated);
  }

  disconnectedCallback() {
    this.endTour();
    this.stopMicTesting();
    window.removeEventListener("feheziko_state_changed", this.handleStateChanged);
    window.removeEventListener("feheziko_sync_history_updated", this.handleSyncHistoryUpdated);
  }

  private async loadStorageData() {
    if (!this.db) return;
    try {
      this.cachedLessons = await this.db.getCachedLessons();
      this.cachedDialogues = await this.db.getCachedDialogues();

      if (navigator.storage && navigator.storage.estimate) {
        try {
          const est = await navigator.storage.estimate();
          if (est) {
            this.storageEstimate = {
              usage: est.usage || 0,
              quota: est.quota || 0
            };
          }
        } catch (e) {}
      }

      if ("serviceWorker" in navigator) {
        if (navigator.serviceWorker.controller) {
          this.swStatus = "active";
        } else {
          const reg = await navigator.serviceWorker.getRegistration();
          this.swStatus = reg ? "registered" : "inactive";
        }
      } else {
        this.swStatus = "inactive";
      }

      this.isLoaded = true;
      this.render();
    } catch (e) {
      console.error("Failed to load cached lessons/dialogues for storage", e);
    }
  }

  private async downloadPack(packId: string, items: { lessons?: any[]; dialogues?: any[] }) {
    if (this.downloadingPackId) return;

    this.downloadingPackId = packId;
    this.downloadProgressPct = 0;
    this.downloadProgressStatus = "Mampiditra am-pilaminana (Préparation)...";
    this.render();

    const total = (items.lessons?.length || 0) + (items.dialogues?.length || 0);
    let count = 0;

    try {
      if (items.lessons && items.lessons.length > 0) {
        for (const les of items.lessons) {
          this.downloadProgressStatus = `Mampiditra lesona: ${les.title || les.id}...`;
          await this.db.cacheLesson(les);
          count++;
          this.downloadProgressPct = Math.round((count / (total || 1)) * 100);
          this.render();
          await new Promise(r => setTimeout(r, 20));
        }
      }

      if (items.dialogues && items.dialogues.length > 0) {
        for (const dlg of items.dialogues) {
          this.downloadProgressStatus = `Mampiditra dinika: ${dlg.title || dlg.id}...`;
          await this.db.cacheDialogue(dlg);
          count++;
          this.downloadProgressPct = Math.round((count / (total || 1)) * 100);
          this.render();
          await new Promise(r => setTimeout(r, 20));
        }
      }

      if ("caches" in window) {
        try {
          const cache = await caches.open("feheziko-offline-cache-v1");
          await cache.addAll(["/", "/index.html", "/manifest.json", "/icon.jpg"]);
        } catch (ce) {
          console.warn("[SW Cache] Error caching shell assets:", ce);
        }
      }
    } catch (e) {
      console.error("Error downloading pack:", e);
    } finally {
      this.downloadingPackId = null;
      this.downloadProgressPct = 100;
      this.downloadProgressStatus = "";
      await this.loadStorageData();
      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
    }
  }

  private render() {
    if (!this.db) return;

    const progress = this.db.getProgress();
    const isMg = progress.accessibility.language === "mg";

    const t = isMg ? {
      title: "Fikirana ny Fampiharana (Paramètres)",
      subtitle: "Amboary ny fampiasana an'i Feheziko mifanaraka amin'ny safidinao.",
      langTitle: "Fiteny ampiasaina amin'ny fampiharana (Langue de l'interface)",
      mgOption: "Malagasy (Gasy)",
      frOption: "Français (Frantsay)",
      accessTitle: "Fidirana ho an'ny rehetra (Options d'Accessibilité WCAG)",
      textSize: "Haben'ny soratra (Taille du texte) :",
      sizeNormal: "Tsotra (Normal)",
      sizeLarge: "Lehibe (Grand)",
      sizeExtra: "Lehibe dia lehibe (Trés Grand)",
      contrast: "Salan'ny loko (Contraste Élevé)",
      colorblind: "Fanampiana ho an'ny tsy mahita loko (Mode Daltonien)",
      darkMode: "Fomba Maizina (Mode Sombre)",
      darkModeDesc: "Hampiasana amin'ny alina mba hiarovana ny maso.",
      schoolLink: "Fampifandraisana amin'ny sekoly (Lien de classe)",
      schoolDesc: "Raha manana kaody avy amin'ny mpampianatra ianao dia ampidiro eto.",
      schoolPlaceholder: "Ohatra: NANISANA-L1",
      schoolBtn: "Hampifandray",
      schoolSuccess: "Tafapandray amin'ny kilasy:",
      backupTitle: "Tahiry faharetana (Backup de sécurité)",
      backupDesc: "Adikao ity kaody ity mba hamindrana ny fandrosoanao amin'ny finday hafa.",
      exportBtn: "Adikao ny kaody",
      save: "Tahiry soa aman-tsara",
      storageTitle: "Fitehirizana & Cache (Espace de Stockage)",
      storageDesc: "Ny lesona voatahiry offline dia manampy anao hianatra na dia tsy misy internet aza.",
      totalStorage: "Tontalin'ny toerana ampiasaina",
      noCache: "Tsy misy lesona voatahiry",
      clearAllBtn: "Hafao ny cache rehetra",
      clearModuleBtn: "Hamafa ity",
      moduleLessons: "lesona voatahiry",
      confirmClearAll: "Tena te-hamafa ny lesona voatahiry rehetra ve ianao?",
      confirmClearModule: "Tena te-hamafa ny lesona rehetra voatahiry amin'ity dingana ity ve ianao?",
      audioCalibrateTitle: "Fandrefesana feo offline (Calibrage)",
      audioCalibrateDesc: "Amboary ny fahatsapana ny mikrofoninao mifanaraka amin'ny tabataba manodidina anao amin'izao fotoana izao.",
      calibrateStartBtn: "Hanomboka fandrefesana",
      calibrateRunning: "Mandrefe tabataba manodidina...",
      calibrateFinished: "Vita ny fandrefesana!",
      currentNoise: "Haavon'ny feo ankehitriny",
      optimalThreshold: "Fahatsapan'ny micro tsara indrindra",
      calibrateStatusQuiet: "Tsara dia tsara ny toerana, hangina tsara.",
      calibrateStatusModerate: "Misy tabataba kely, namboarina ny fahatsapana.",
      calibrateStatusNoisy: "Mitabataba be, nampiakarina ny fetra mba tsy ho diso ny fandray feo."
    } : {
      title: "Paramètres de l'application",
      subtitle: "Ajustez l'utilisation de Feheziko selon vos préférences.",
      langTitle: "Langue de l'interface",
      mgOption: "Malagasy",
      frOption: "Français",
      accessTitle: "Accessibilité Universelle (WCAG AA)",
      textSize: "Taille du texte :",
      sizeNormal: "Normal",
      sizeLarge: "Grand",
      sizeExtra: "Très grand",
      contrast: "Contraste élevé (Lisibilité)",
      colorblind: "Assistance visuelle (Daltonisme)",
      darkMode: "Mode Sombre (Dark Mode)",
      darkModeDesc: "Activer le thème sombre haute lisibilité pour l'étude en soirée.",
      schoolLink: "Liaison d'établissement (Code classe)",
      schoolDesc: "Si vous possédez un code fourni par votre enseignant, saisissez-le ici.",
      schoolPlaceholder: "Exemple: NANISANA-L1",
      schoolBtn: "Lier la classe",
      schoolSuccess: "Lié à la classe :",
      backupTitle: "Sauvegarde et exportation",
      backupDesc: "Copiez cette clé sécurisée pour restaurer votre progression sur un autre appareil.",
      exportBtn: "Copier la clé",
      save: "Enregistré avec succès",
      storageTitle: "Espace de Stockage & Cache",
      storageDesc: "Les leçons enregistrées en mode hors-ligne vous permettent d'apprendre sans connexion Internet.",
      totalStorage: "Espace total utilisé",
      noCache: "Aucune leçon en cache",
      clearAllBtn: "Vider tout le cache",
      clearModuleBtn: "Effacer",
      moduleLessons: "leçon(s) en cache",
      confirmClearAll: "Voulez-vous vraiment supprimer toutes les leçons enregistrées ?",
      confirmClearModule: "Voulez-vous vraiment supprimer les leçons en cache de ce module ?",
      audioCalibrateTitle: "Calibrage Audio Offline",
      audioCalibrateDesc: "Analysez le bruit ambiant pour optimiser le seuil de détection vocale (VAD) et éviter les faux déclenchements.",
      calibrateStartBtn: "Lancer le calibrage",
      calibrateRunning: "Analyse du bruit ambiant en cours...",
      calibrateFinished: "Calibrage terminé !",
      currentNoise: "Niveau sonore ambiant actuel",
      optimalThreshold: "Seuil VAD optimal calculé",
      calibrateStatusQuiet: "Environnement très calme, sensibilité maximale configurée.",
      calibrateStatusModerate: "Bruit modéré, sensibilité ajustée.",
      calibrateStatusNoisy: "Environnement bruyant, seuil élevé pour éviter les faux déclenchements."
    };

    const textClass = progress.accessibility.textSize === "large" ? "text-base" : 
                      progress.accessibility.textSize === "extra" ? "text-lg" : "text-sm";

    const content = (window as any).feheziko?.languageContent;
    const levels = content?.levels || [];
    const dialogues = content?.dialogues || [];

    let allLessons: any[] = [];
    levels.forEach((l: any) => {
      if (l.lessons) allLessons.push(...l.lessons);
    });

    const totalLessons = allLessons.length;
    const totalDialogues = dialogues.length;
    const totalItems = totalLessons + totalDialogues;

    const cachedLessonsCount = this.cachedLessons.length;
    const cachedDialoguesCount = this.cachedDialogues.length;
    const totalCachedItems = cachedLessonsCount + cachedDialoguesCount;

    const overallPct = totalItems > 0 ? Math.round((totalCachedItems / totalItems) * 100) : 0;

    let totalBytes = 0;
    this.cachedLessons.forEach(cl => { totalBytes += JSON.stringify(cl).length; });
    this.cachedDialogues.forEach(cd => { totalBytes += JSON.stringify(cd).length; });

    const totalSizeStr = totalBytes > 1024 * 1024 
      ? (totalBytes / (1024 * 1024)).toFixed(2) + " MB" 
      : (totalBytes / 1024).toFixed(1) + " KB";

    const isForcedOffline = this.db?.isForcedOffline() || false;

    this.className = "block max-w-2xl mx-auto space-y-6";

    let innerContentHtml = "";

    if (this.activeTab === "general") {
      innerContentHtml = `
        <!-- Interface Language Select -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-slate-800 text-sm tracking-tight flex items-center space-x-2">
              <span>🌐</span>
              <span>${t.langTitle}</span>
            </h3>
            <span class="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-2.5 py-0.5 font-bold font-mono uppercase tracking-wide">
              ${isMg ? "Malagasy feno" : "Français actif"}
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <!-- Malagasy option card -->
            <button id="langMgBtn" class="relative text-left p-4 rounded-2xl border-2 transition-all duration-200 group flex items-center space-x-4 cursor-pointer focus:outline-none w-full ${
              isMg 
                ? "border-indigo-600 bg-gradient-to-br from-indigo-50/70 to-indigo-100/30 text-indigo-950 shadow-sm" 
                : "border-slate-250 bg-white hover:bg-slate-50 text-slate-600 hover:border-slate-300"
            }">
              <div class="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/50 flex items-center justify-center text-3xl shadow-sm transition-transform group-hover:scale-105 shrink-0">
                🇲🇬
              </div>
              <div class="flex-1 min-w-0">
                <span class="block font-extrabold text-[9px] tracking-tight uppercase ${isMg ? "text-indigo-600" : "text-slate-400"}">
                  Official
                </span>
                <span class="block font-black text-sm text-slate-800 mt-0.5">
                  Malagasy (Gasy)
                </span>
                <span class="block text-[10px] text-slate-400 font-medium truncate mt-0.5">
                  Fandikan-teny feno amin'ny teny gasy
                </span>
              </div>
              ${isMg ? `
                <div class="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] shadow-sm animate-fade-in font-bold">
                  ✓
                </div>
              ` : ""}
            </button>

            <!-- French option card -->
            <button id="langFrBtn" class="relative text-left p-4 rounded-2xl border-2 transition-all duration-200 group flex items-center space-x-4 cursor-pointer focus:outline-none w-full ${
              !isMg 
                ? "border-indigo-600 bg-gradient-to-br from-indigo-50/70 to-indigo-100/30 text-indigo-950 shadow-sm" 
                : "border-slate-250 bg-white hover:bg-slate-50 text-slate-600 hover:border-slate-300"
            }">
              <div class="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/50 flex items-center justify-center text-3xl shadow-sm transition-transform group-hover:scale-105 shrink-0">
                🇫🇷
              </div>
              <div class="flex-1 min-w-0">
                <span class="block font-extrabold text-[9px] tracking-tight uppercase ${!isMg ? "text-indigo-600" : "text-slate-400"}">
                  Officiel
                </span>
                <span class="block font-black text-sm text-slate-800 mt-0.5">
                  Français (Frantsay)
                </span>
                <span class="block text-[10px] text-slate-400 font-medium truncate mt-0.5">
                  Interface entièrement en français
                </span>
              </div>
              ${!isMg ? `
                <div class="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] shadow-sm animate-fade-in font-bold">
                  ✓
                </div>
              ` : ""}
            </button>
          </div>
        </div>

        <!-- Onboarding & Profile Guide Card -->
        <div class="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 flex items-center justify-between gap-3">
          <div>
            <span class="font-extrabold text-xs text-indigo-950 dark:text-indigo-200 block">🚀 Torolalana & Profil (Guide d'Onboarding)</span>
            <span class="text-[11px] text-indigo-700 dark:text-indigo-300">
              ${isMg ? "Averina ny zava-dehibe amin'ny fampiharana sy ny fifidianana tanjona." : "Relancer la découverte des fonctionnalités et la configuration du profil."}
            </span>
          </div>
          <button id="reopenOnboardingBtn" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer shrink-0">
            ${isMg ? "Averina ny Guide" : "Relancer le guide"}
          </button>
        </div>

        <!-- Accessibility settings WCAG -->
        <div class="space-y-4 border-t border-slate-100 pt-5">
          <h3 class="font-bold text-slate-700 text-sm flex items-center space-x-2">
            <span>♿</span>
            <span>${t.accessTitle}</span>
          </h3>

          <!-- Font Size selector -->
          <div class="space-y-2">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider block">${t.textSize}</span>
            <div class="grid grid-cols-3 gap-2">
              <button id="sizeNormalBtn" class="py-2 px-3 rounded-xl border text-xs font-semibold ${
                progress.accessibility.textSize === "normal" ? "border-indigo-600 bg-indigo-50 text-indigo-900 font-bold" : "border-slate-200 hover:bg-slate-50 text-slate-600"
              }">${t.sizeNormal}</button>
              <button id="sizeLargeBtn" class="py-2 px-3 rounded-xl border text-sm font-semibold ${
                progress.accessibility.textSize === "large" ? "border-indigo-600 bg-indigo-50 text-indigo-900 font-bold" : "border-slate-200 hover:bg-slate-50 text-slate-600"
              }">${t.sizeLarge}</button>
              <button id="sizeExtraBtn" class="py-2 px-3 rounded-xl border text-base font-semibold ${
                progress.accessibility.textSize === "extra" ? "border-indigo-600 bg-indigo-50 text-indigo-900 font-bold" : "border-slate-200 hover:bg-slate-50 text-slate-600"
              }">${t.sizeExtra}</button>
            </div>
          </div>

          <!-- Color contrast toggle -->
          <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/50">
            <div>
              <span class="text-xs font-bold text-slate-700 block">${t.contrast}</span>
              <p class="text-[10px] text-slate-400">Ajoute des contours gras et des contrastes AA élevés.</p>
            </div>
            <button id="contrastToggle" class="w-12 h-6.5 rounded-full p-1 transition-colors duration-150 relative ${
              progress.accessibility.contrast === "high" ? "bg-indigo-600" : "bg-slate-300"
            }">
              <div class="w-4.5 h-4.5 rounded-full bg-white shadow-xs transition-transform ${
                progress.accessibility.contrast === "high" ? "translate-x-5.5" : "translate-x-0"
              }"></div>
            </button>
          </div>

          <!-- Colorblind assistance -->
          <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/50">
            <div>
              <span class="text-xs font-bold text-slate-700 block">${t.colorblind}</span>
              <p class="text-[10px] text-slate-400">Corrige les teintes vertes et rouges pour l'ergonomie.</p>
            </div>
            <button id="colorblindToggle" class="w-12 h-6.5 rounded-full p-1 transition-colors duration-150 relative ${
              progress.accessibility.colorblind ? "bg-indigo-600" : "bg-slate-300"
            }">
              <div class="w-4.5 h-4.5 rounded-full bg-white shadow-xs transition-transform ${
                progress.accessibility.colorblind ? "translate-x-5.5" : "translate-x-0"
              }"></div>
            </button>
          </div>

          <!-- Dark Mode Toggle -->
          <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/50">
            <div>
              <span class="text-xs font-bold text-slate-700 block">${t.darkMode}</span>
              <p class="text-[10px] text-slate-400">${t.darkModeDesc}</p>
            </div>
            <button id="darkModeToggle" class="w-12 h-6.5 rounded-full p-1 transition-colors duration-150 relative ${
              progress.accessibility.darkMode ? "bg-indigo-600" : "bg-slate-300"
            }">
              <div class="w-4.5 h-4.5 rounded-full bg-white shadow-xs transition-transform ${
                progress.accessibility.darkMode ? "translate-x-5.5" : "translate-x-0"
              }"></div>
            </button>
          </div>
        </div>

        <!-- Offline Audio Calibration -->
        <div class="border-t border-slate-100 pt-5 mt-5 space-y-3">
          <h3 class="font-bold text-slate-700 text-sm flex items-center space-x-2">
            <svg class="w-4.5 h-4.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
            </svg>
            <span>${t.audioCalibrateTitle}</span>
          </h3>
          <p class="text-xs text-slate-500 leading-normal">${t.audioCalibrateDesc}</p>
          
          <div class="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 space-y-4">
            <div class="flex items-center justify-between">
              <div class="space-y-1">
                <span class="text-xs font-bold text-slate-600 block">${t.currentNoise}</span>
                <div class="flex items-center space-x-2">
                  <!-- Real-time noise progress bar -->
                  <div class="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div id="noiseBar" class="bg-indigo-500 h-2 rounded-full transition-all duration-75" style="width: 0%"></div>
                  </div>
                  <span id="noiseVal" class="text-xs font-mono font-bold text-slate-500">0</span>
                </div>
              </div>

              <div class="text-right space-y-1">
                <span class="text-xs font-bold text-slate-600 block">${t.optimalThreshold}</span>
                <span id="thresholdVal" class="text-sm font-mono font-extrabold text-indigo-600">${progress.accessibility.vadThreshold || 5}</span>
              </div>
            </div>

            <!-- Calibration State Feedback -->
            <div id="calibrationFeedback" class="hidden p-3 rounded-xl border text-xs leading-normal transition-all duration-300">
              <!-- Will be dynamically filled -->
            </div>

            <div class="flex justify-end pt-1">
              <button id="startCalibrationBtn" class="bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm flex items-center space-x-2">
                <span id="calibrationBtnText">${t.calibrateStartBtn}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- School Code Link -->
        <div class="space-y-3 border-t border-slate-100 pt-5">
          <h3 class="font-bold text-slate-700 text-sm">${t.schoolLink}</h3>
          <p class="text-xs text-slate-500 leading-normal">${t.schoolDesc}</p>

          ${
            progress.schoolCode
              ? `
            <div class="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between text-xs text-emerald-800">
              <span>🎉 ${t.schoolSuccess} <strong>${progress.schoolCode}</strong></span>
              <button id="disconnectSchoolBtn" class="text-rose-600 hover:underline font-bold">Unlink</button>
            </div>
            `
              : `
            <div class="flex space-x-2">
              <input id="schoolCodeIn" type="text" placeholder="${t.schoolPlaceholder}" class="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              <button id="linkSchoolBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 rounded-xl transition-colors shadow-xs">${t.schoolBtn}</button>
            </div>
            `
          }
        </div>

        <!-- Offline Export / Import backups -->
        <div class="space-y-3 border-t border-slate-100 pt-5">
          <h3 class="font-bold text-slate-700 text-sm">${t.backupTitle}</h3>
          <p class="text-xs text-slate-500 leading-relaxed">${t.backupDesc}</p>
          
          <div class="flex space-x-2">
            <input id="backupCodeStr" readonly type="text" value="${btoa(JSON.stringify(progress))}" class="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-[10px] font-mono text-slate-400 focus:outline-none" />
            <button id="exportCodeBtn" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 rounded-xl transition-colors border border-slate-200">${t.exportBtn}</button>
          </div>
        </div>

        <!-- Microphone Setup & Calibration -->
        <div class="space-y-4 border-t border-slate-100 pt-5">
          <h3 class="font-bold text-slate-700 text-sm flex items-center space-x-2">
            <span>🎙️</span>
            <span>${isMg ? "Fikirana Mikraofona" : "Configuration du Microphone"}</span>
          </h3>
          <p class="text-xs text-slate-500 leading-normal">
            ${isMg 
              ? "Hamarino tsara raha mandray ny feonao ny mikraofona alohan'ny hanaovana ny fanazaran-tena shadowing." 
              : "Assurez-vous que votre microphone fonctionne correctement avant de démarrer les exercices de shadowing."}
          </p>

          <!-- Calibration Dashboard -->
          <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex flex-col gap-4">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div class="space-y-1">
                <span id="micStatusLabel" class="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  ${isMg ? "Trangan'ny mikraofona" : "État du microphone"}
                </span>
                <div class="flex items-center gap-2">
                  <span id="micStatusIndicator" class="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                  <span id="micStatusText" class="text-sm font-extrabold text-slate-700">
                    ${isMg ? "Tsy mbola mandeha" : "Inactif"}
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button id="testMicBtn" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2">
                  <span>🎙️</span>
                  <span>${isMg ? "Hamarina ny mikraofona" : "Tester le micro"}</span>
                </button>
                <button id="stopMicTestBtn" class="hidden px-4 py-2 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer">
                  <span>${isMg ? "Ajanony" : "Arrêter"}</span>
                </button>
              </div>
            </div>

            <!-- Visualizer container -->
            <div id="micVisualizerContainer" class="hidden space-y-2 pt-2 border-t border-slate-200/50">
              <div class="flex justify-between items-center">
                <span class="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                  ${isMg ? "Haben'ny feo (Volume)" : "Niveau d'entrée"}
                </span>
                <span id="micVolumeValue" class="text-[11px] font-bold text-indigo-600 font-mono">0%</span>
              </div>
              
              <!-- Real-time Level Bar -->
              <div class="w-full bg-slate-200 rounded-full h-3 overflow-hidden relative">
                <div id="micVolumeBar" class="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 rounded-full transition-all duration-75 w-0"></div>
              </div>

              <!-- Animated Waveforms representing frequency -->
              <div class="h-10 bg-slate-950 rounded-xl flex items-center justify-center px-4 gap-[3px] overflow-hidden">
                ${Array.from({ length: 24 }).map(() => `
                  <div class="mic-wave-bar w-1.5 bg-indigo-500 rounded-full transition-all duration-75" style="height: 4px;"></div>
                `).join("")}
              </div>
            </div>
          </div>
        </div>

        <!-- Storage Usage & Cache Module -->
        <div class="space-y-5 border-t border-slate-100 pt-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 class="font-bold text-slate-800 text-sm flex items-center space-x-2">
                <span>💾</span>
                <span>${isMg ? "Packs Lesona sy Dinika Offline (Mode Hors-ligne)" : "Packs de Leçons & Dialogues Hors-Ligne"}</span>
              </h3>
              <p class="text-xs text-slate-500 leading-normal mt-0.5">
                ${isMg 
                  ? "Ampidino ny packs leçons sy dinika rehetra hahafahanao mianatra sy manao fampitahana na tsy misy internet aza." 
                  : "Téléchargez manuellement des packs de cours et de dialogues pour une utilisation 100% autonome sans connexion internet."}
              </p>
            </div>

            <!-- Forced Offline Mode Switch -->
            <label class="inline-flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 transition-all self-start sm:self-auto">
              <input type="checkbox" id="forcedOfflineToggle" class="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" ${isForcedOffline ? "checked" : ""} />
              <span>✈️ ${isMg ? "Force Mode Avion" : "Simuler Hors-Ligne"}</span>
            </label>
          </div>

          <!-- Service Worker Status & Disk Usage Banner -->
          <div class="p-4 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl shadow-sm border border-slate-800 space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div class="flex items-center space-x-2.5">
                <span class="relative flex h-3 w-3">
                  <span class="${this.swStatus === 'active' ? 'animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75' : 'hidden'}"></span>
                  <span class="relative inline-flex rounded-full h-3 w-3 ${this.swStatus === 'active' ? 'bg-emerald-500' : 'bg-amber-400'}"></span>
                </span>
                <div>
                  <span class="text-xs font-extrabold font-mono tracking-wide">
                    ${this.swStatus === 'active' 
                      ? (isMg ? "⚡ SERVICE WORKER MIASA (Mode Avion Fonctionnel)" : "⚡ SERVICE WORKER ACTIF (Mode Avion Opérationnel)")
                      : (isMg ? "⚙️ SERVICE WORKER EFA MANOMBOKA" : "⚙️ SERVICE WORKER EN COURS")}
                  </span>
                  <span class="block text-[10px] text-slate-400 font-medium">
                    CacheStorage + IndexedDB Feheziko Engine
                  </span>
                </div>
              </div>

              <div class="text-right font-mono text-xs">
                <span class="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">${isMg ? "Toerana ampiasaina" : "Espace utilisé"}</span>
                <span class="font-black text-indigo-300 text-sm">${totalSizeStr}</span>
              </div>
            </div>

            <!-- Curriculum Coverage Progress Bar -->
            <div class="space-y-1.5">
              <div class="flex justify-between items-center text-xs font-mono">
                <span class="text-slate-300 font-bold">
                  📊 ${isMg ? "Faharatsian'ny fandaharana offline" : "Couverture Globale Offline"} : ${overallPct}%
                </span>
                <span class="text-slate-400 text-[11px]">
                  ${totalCachedItems} / ${totalItems} ${isMg ? "zavatra voatahiry" : "éléments en cache"}
                </span>
              </div>
              <div class="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div class="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-300" style="width: ${overallPct}%"></div>
              </div>
            </div>
          </div>

          <!-- Hero CTA Button: Download Everything -->
          <div class="bg-indigo-50/80 border border-indigo-150 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="space-y-0.5 text-center sm:text-left">
              <h4 class="font-extrabold text-indigo-950 text-xs flex items-center justify-center sm:justify-start gap-1.5">
                <span>🚀</span>
                <span>${isMg ? "Pack Feno (Tout-en-un 100% Offline)" : "Pack Master Intégral (100% Offline)"}</span>
              </h4>
              <p class="text-[11px] text-indigo-800/80">
                ${isMg
                  ? "Ampidino ao amin'ny fitaovanao amin'ny kitiro iray ny leçons sy dinika rehetra."
                  : "Téléchargez en un seul clic l'ensemble des leçons, dialogues et ressources d'interface."}
              </p>
            </div>

            <button id="downloadAllPacksBtn" class="shrink-0 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center space-x-2 ${this.downloadingPackId ? "opacity-50 cursor-not-allowed" : ""}">
              <span>📥</span>
              <span>${isMg ? "Ampidino ny TONTOLO" : "Télécharger l'Intégralité"}</span>
            </button>
          </div>

          <!-- Downloading Status Overlay -->
          ${this.downloadingPackId ? `
            <div class="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 animate-pulse">
              <div class="flex items-center justify-between text-xs font-bold text-amber-900">
                <span>⏳ ${this.downloadProgressStatus}</span>
                <span class="font-mono text-indigo-700">${this.downloadProgressPct}%</span>
              </div>
              <div class="w-full bg-amber-200 rounded-full h-2 overflow-hidden">
                <div class="bg-indigo-600 h-full transition-all duration-150" style="width: ${this.downloadProgressPct}%"></div>
              </div>
            </div>
          ` : ""}

          <!-- GRID OF PACKS -->
          <div class="space-y-4 pt-1">
            <!-- LESSON PACKS SECTION -->
            <div class="space-y-2">
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <span>📘</span>
                <span>${isMg ? "Packs Leçons (Lesona)" : "Packs de Leçons"}</span>
              </h4>

              <div class="grid grid-cols-1 gap-3">
                ${levels.map((lvl: any) => {
                  const lvlLessons = lvl.lessons || [];
                  const cachedInLvl = this.cachedLessons.filter(cl => lvlLessons.some((ll: any) => ll.id === cl.id));
                  const isFull = cachedInLvl.length >= lvlLessons.length && lvlLessons.length > 0;
                  const isPartial = cachedInLvl.length > 0 && !isFull;

                  let lvlBytes = 0;
                  cachedInLvl.forEach(cl => lvlBytes += JSON.stringify(cl).length);
                  const lvlSizeStr = lvlBytes > 0 ? (lvlBytes / 1024).toFixed(1) + " KB" : "~" + (lvlLessons.length * 8) + " KB";

                  return `
                    <div class="p-3.5 bg-white border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-200 transition-all shadow-2xs">
                      <div class="space-y-1 min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                          <h5 class="font-extrabold text-slate-800 text-xs">${lvl.title}</h5>
                          ${isFull ? `
                            <span class="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                              ✓ ${isMg ? "En cache 100%" : "En cache"}
                            </span>
                          ` : isPartial ? `
                            <span class="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                              ⏳ ${cachedInLvl.length}/${lvlLessons.length}
                            </span>
                          ` : `
                            <span class="bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                              ${isMg ? "Tsy mbola voatahiry" : "Non téléchargé"}
                            </span>
                          `}
                        </div>
                        <p class="text-[11px] text-slate-500 line-clamp-1">${lvl.description || ""}</p>
                        <div class="text-[10px] font-mono font-semibold text-slate-400 flex items-center gap-2">
                          <span>${lvlLessons.length} leçons</span>
                          <span>•</span>
                          <span>Taille: ${lvlSizeStr}</span>
                        </div>
                      </div>

                      <div class="flex items-center gap-2 self-end sm:self-center">
                        <button data-pack-id="${lvl.id}" data-pack-type="level" class="downloadPackBtn px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5">
                          <span>📥</span>
                          <span>${isFull ? (isMg ? "Mettre à jour" : "Mettre à jour") : (isMg ? "Ampidino Pack" : "Télécharger")}</span>
                        </button>
                        ${cachedInLvl.length > 0 ? `
                          <button data-pack-id="${lvl.id}" data-pack-type="level" class="deletePackBtn px-2.5 py-1.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 font-bold text-xs rounded-xl transition-all cursor-pointer">
                            🗑️
                          </button>
                        ` : ""}
                      </div>
                    </div>
                  `;
                }).join("")}

                <!-- PACK DELF EXAM PREPARATION -->
                <div class="p-3.5 bg-gradient-to-r from-amber-50/50 to-orange-50/30 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div class="space-y-1 min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <h5 class="font-extrabold text-amber-950 text-xs">🎓 Pack Preparation DELF A1 & A2 (Epreuves Blanc)</h5>
                      <span class="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase font-mono">Exam Material</span>
                    </div>
                    <p class="text-[11px] text-amber-800/80">Compréhension orale, écrite, production écrite & orale A1 & A2.</p>
                  </div>

                  <div class="flex items-center gap-2 self-end sm:self-center">
                    <button data-pack-id="delf-pack" data-pack-type="delf" class="downloadPackBtn px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5">
                      <span>📥</span>
                      <span>${isMg ? "Ampidino DELF Pack" : "Télécharger DELF Pack"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- DIALOGUE PACKS SECTION -->
            <div class="space-y-2 pt-2">
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <span>💬</span>
                <span>${isMg ? "Packs Dinika sy Resaka (Dialogues & Jeu de Rôle)" : "Packs de Dialogues & Role Play"}</span>
              </h4>

              <div class="grid grid-cols-1 gap-3">
                <!-- CHILDREN DIALOGUES -->
                ${(() => {
                  const childDlgs = dialogues.filter((d: any) => d.category === "children");
                  const cachedChild = this.cachedDialogues.filter(cd => childDlgs.some((dd: any) => dd.id === cd.id));
                  const isFull = cachedChild.length >= childDlgs.length && childDlgs.length > 0;

                  return `
                    <div class="p-3.5 bg-white border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-200 transition-all shadow-2xs">
                      <div class="space-y-1 min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                          <h5 class="font-extrabold text-slate-800 text-xs">👧👦 Pack Dialogues Enfants (${childDlgs.length} dinika)</h5>
                          ${isFull ? `<span class="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">✓ En cache</span>` : ""}
                        </div>
                        <p class="text-[11px] text-slate-500">Resaka manokana ho an'ny ankizy sy zaza (Voix d'Enfants).</p>
                      </div>

                      <div class="flex items-center gap-2 self-end sm:self-center">
                        <button data-pack-id="dlg-children" data-pack-type="dialogue-children" class="downloadPackBtn px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5">
                          <span>📥</span>
                          <span>${isFull ? "Mettre à jour" : "Télécharger"}</span>
                        </button>
                        ${cachedChild.length > 0 ? `
                          <button data-pack-id="dlg-children" data-pack-type="dialogue-children" class="deletePackBtn px-2.5 py-1.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 text-slate-500 hover:text-rose-600 font-bold text-xs rounded-xl transition-all cursor-pointer">🗑️</button>
                        ` : ""}
                      </div>
                    </div>
                  `;
                })()}

                <!-- ADULT DIALOGUES -->
                ${(() => {
                  const adultDlgs = dialogues.filter((d: any) => d.category === "adults");
                  const cachedAdult = this.cachedDialogues.filter(cd => adultDlgs.some((dd: any) => dd.id === cd.id));
                  const isFull = cachedAdult.length >= adultDlgs.length && adultDlgs.length > 0;

                  return `
                    <div class="p-3.5 bg-white border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-200 transition-all shadow-2xs">
                      <div class="space-y-1 min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                          <h5 class="font-extrabold text-slate-800 text-xs">👩👨 Pack Dialogues Adultes & Vie Quotidienne (${adultDlgs.length} dinika)</h5>
                          ${isFull ? `<span class="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">✓ En cache</span>` : ""}
                        </div>
                        <p class="text-[11px] text-slate-500">Fiainana andavanandro, tsenan'i Analakely, sy fitetezan-tany.</p>
                      </div>

                      <div class="flex items-center gap-2 self-end sm:self-center">
                        <button data-pack-id="dlg-adults" data-pack-type="dialogue-adults" class="downloadPackBtn px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5">
                          <span>📥</span>
                          <span>${isFull ? "Mettre à jour" : "Télécharger"}</span>
                        </button>
                        ${cachedAdult.length > 0 ? `
                          <button data-pack-id="dlg-adults" data-pack-type="dialogue-adults" class="deletePackBtn px-2.5 py-1.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 text-slate-500 hover:text-rose-600 font-bold text-xs rounded-xl transition-all cursor-pointer">🗑️</button>
                        ` : ""}
                      </div>
                    </div>
                  `;
                })()}

                <!-- ROLEPLAY DIALOGUES -->
                ${(() => {
                  const rpDlgs = dialogues.filter((d: any) => d.scenarios || d.lines);
                  const cachedRp = this.cachedDialogues.filter(cd => rpDlgs.some((dd: any) => dd.id === cd.id));
                  const isFull = cachedRp.length >= rpDlgs.length && rpDlgs.length > 0;

                  return `
                    <div class="p-3.5 bg-white border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-200 transition-all shadow-2xs">
                      <div class="space-y-1 min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                          <h5 class="font-extrabold text-slate-800 text-xs">🎭 Pack Jeu de Rôle Interactif (${rpDlgs.length} dinika)</h5>
                          ${isFull ? `<span class="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">✓ En cache</span>` : ""}
                        </div>
                        <p class="text-[11px] text-slate-500">Mamorona fifanakalozana amin'ny fomba roleplay ahazoana tombony XP.</p>
                      </div>

                      <div class="flex items-center gap-2 self-end sm:self-center">
                        <button data-pack-id="dlg-roleplay" data-pack-type="dialogue-roleplay" class="downloadPackBtn px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5">
                          <span>📥</span>
                          <span>${isFull ? "Mettre à jour" : "Télécharger"}</span>
                        </button>
                        ${cachedRp.length > 0 ? `
                          <button data-pack-id="dlg-roleplay" data-pack-type="dialogue-roleplay" class="deletePackBtn px-2.5 py-1.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 text-slate-500 hover:text-rose-600 font-bold text-xs rounded-xl transition-all cursor-pointer">🗑️</button>
                        ` : ""}
                      </div>
                    </div>
                  `;
                })()}
              </div>
            </div>
          </div>

          <!-- Clear All Cache Button -->
          <div class="pt-2 flex justify-end">
            <button id="clearAllCacheBtn" class="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 text-rose-700 font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5">
              <span>🗑️</span>
              <span>${isMg ? "Hafao ny cache rehetra (Vider tout)" : "Vider tout le cache"}</span>
            </button>
          </div>
        </div>
      `;
    } else {
      // Sync History Tab View
      const syncHistory = this.db.getSyncHistory();
      const successfulSyncsCount = syncHistory.filter(h => h.status === "success").length;
      const failedSyncsCount = syncHistory.filter(h => h.status === "failed").length;
      const pendingQueueLength = this.db.getSyncQueueLength();

      const hLabels = isMg ? {
        syncTitle: "Fampitahana ny fandrosoanao (Sync)",
        syncDesc: "Diniho ny fandehan'ireo fampitahana drakitra rehetra natao tamin'ny server cloud.",
        syncNow: "🔄 Handefa drakitra izao (Sync Now)",
        clearHistory: "🧹 Hamafa ny tantara",
        noHistory: "Tsy misy tantara fampitahana voatahiry.",
        statusHeader: "Tranga",
        timeHeader: "Ora",
        itemsHeader: "Tontalin'ny drakitra",
        payloadHeader: "Mombamomba",
        errorMessage: "Hadisoana",
        successText: "Tafita soa aman-tsara",
        failedText: "Tsy nahomby",
        details: "Mombamomba ny drakitra",
        totalSuccess: "Nahomby",
        totalFailed: "Tsy nahomby",
        pendingQueue: "Miandry"
      } : {
        syncTitle: "Historique de Synchronisation Cloud",
        syncDesc: "Consultez le statut et les détails des synchronisations de votre progression locale vers nos serveurs.",
        syncNow: "🔄 Synchroniser Maintenant",
        clearHistory: "🧹 Effacer l'historique",
        noHistory: "Aucun historique de synchronisation enregistré.",
        statusHeader: "Statut",
        timeHeader: "Date & Heure",
        itemsHeader: "Éléments",
        payloadHeader: "Contenu",
        errorMessage: "Détails de l'erreur",
        successText: "Réussie",
        failedText: "Échouée",
        details: "Détails des données",
        totalSuccess: "Réussies",
        totalFailed: "Échecs",
        pendingQueue: "En attente"
      };

      innerContentHtml = `
        <div class="space-y-4">
          <div>
            <h3 class="font-bold text-slate-700 text-sm">${hLabels.syncTitle}</h3>
            <p class="text-xs text-slate-500 mt-1">${hLabels.syncDesc}</p>
          </div>

          <!-- Statistics Bento Grid -->
          <div class="grid grid-cols-3 gap-3">
            <div class="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex flex-col justify-center items-center text-center">
              <span class="text-[10px] font-extrabold text-emerald-700 uppercase font-mono tracking-wider">${hLabels.totalSuccess}</span>
              <span class="text-lg font-black font-mono text-emerald-900 mt-1">${successfulSyncsCount}</span>
            </div>
            <div class="bg-rose-50 border border-rose-100 rounded-2xl p-3 flex flex-col justify-center items-center text-center">
              <span class="text-[10px] font-extrabold text-rose-700 uppercase font-mono tracking-wider">${hLabels.totalFailed}</span>
              <span class="text-lg font-black font-mono text-rose-900 mt-1">${failedSyncsCount}</span>
            </div>
            <div class="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 flex flex-col justify-center items-center text-center">
              <span class="text-[10px] font-extrabold text-indigo-700 uppercase font-mono tracking-wider">${hLabels.pendingQueue}</span>
              <span class="text-lg font-black font-mono text-indigo-900 mt-1">${pendingQueueLength}</span>
            </div>
          </div>

          <!-- Sync Actions -->
          <div class="flex flex-col sm:flex-row gap-3">
            <button id="triggerSyncBtn" class="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer">
              ${hLabels.syncNow}
            </button>
            <button id="clearSyncHistoryBtn" class="px-4 py-2.5 bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-700 hover:text-rose-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer" ${syncHistory.length === 0 ? "disabled" : ""}>
              ${hLabels.clearHistory}
            </button>
          </div>

          <!-- Table of history logs -->
          <div class="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-xs">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200">
                  <th class="px-4 py-3 text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider w-[12%]">${hLabels.statusHeader}</th>
                  <th class="px-4 py-3 text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider w-[23%]">${hLabels.timeHeader}</th>
                  <th class="px-4 py-3 text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider text-center w-[12%]">${hLabels.itemsHeader}</th>
                  <th class="px-4 py-3 text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider w-[28%]">${hLabels.payloadHeader}</th>
                  <th class="px-4 py-3 text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider w-[25%]">${hLabels.errorMessage}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${syncHistory.length === 0 
                  ? `
                  <tr>
                    <td colspan="5" class="text-center py-12">
                      <span class="text-4xl block">📭</span>
                      <p class="text-xs text-slate-400 mt-2 font-medium">${hLabels.noHistory}</p>
                    </td>
                  </tr>
                  `
                  : syncHistory.map((log) => {
                      const isSuccess = log.status === "success";
                      const dateObj = new Date(log.timestamp);
                      const dateStr = dateObj.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                      });
                      
                      return `
                        <tr class="hover:bg-slate-50/50 transition-colors ${isSuccess ? "" : "bg-rose-50/10"}">
                          <td class="px-4 py-3.5 whitespace-nowrap">
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider font-mono ${
                              isSuccess 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                : "bg-rose-50 text-rose-700 border border-rose-100"
                            }">
                              <span class="w-1.5 h-1.5 rounded-full ${isSuccess ? "bg-emerald-500" : "bg-rose-500 animate-pulse"}"></span>
                              ${isSuccess ? hLabels.successText : hLabels.failedText}
                            </span>
                          </td>
                          <td class="px-4 py-3.5 text-xs font-mono font-bold text-slate-600 whitespace-nowrap">
                            ${dateStr}
                          </td>
                          <td class="px-4 py-3.5 text-center text-xs font-mono font-bold text-slate-700">
                            ${log.itemsSyncedCount}
                          </td>
                          <td class="px-4 py-3.5 text-xs text-slate-600 font-medium max-w-[200px] truncate animate-fade-in" title="${log.payloadSummary || "Heartbeat / Health check"}">
                            ${log.payloadSummary || "Heartbeat / Health check"}
                          </td>
                          <td class="px-4 py-3.5 text-xs font-mono">
                            ${isSuccess 
                              ? `<span class="text-slate-400 text-[10px] italic font-sans">No errors</span>` 
                              : `<span class="text-rose-600 font-semibold block leading-tight text-[11px]" title="${log.errorMessage || "Unknown error"}">
                                   ⚠️ ${log.errorMessage || "Unknown error"}
                                 </span>`
                            }
                          </td>
                        </tr>
                      `;
                    }).join("")
                }
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    this.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-xs relative">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 class="text-2xl font-bold text-slate-800">${t.title}</h2>
            <p class="text-xs text-slate-500 mt-1">${t.subtitle}</p>
          </div>
          <div class="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            <button id="offlineHelpBtn" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-indigo-700 border border-slate-200 active:scale-95 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer">
              <span>💡</span>
              <span>${isMg ? "Fanampiana Offline" : "Aide Hors-ligne"}</span>
            </button>
            <button id="startTourBtn" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-black rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
              <span>🗺️</span>
              <span>${isMg ? "Zahao ny Torolalana" : "Faire la Visite"}</span>
            </button>
          </div>
        </div>

        <!-- Navigation Tabs Switcher -->
        <div class="flex border-b border-slate-100 pb-1">
          <button id="tabGeneralBtn" class="flex-1 pb-3 text-xs font-bold text-center border-b-2 transition-all cursor-pointer ${
            this.activeTab === "general"
              ? "border-indigo-600 text-indigo-600 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }">
            ⚙️ ${isMg ? "Fikirana" : "Paramètres"}
          </button>
          <button id="tabSyncBtn" class="flex-1 pb-3 text-xs font-bold text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 cursor-pointer ${
            this.activeTab === "sync_history"
              ? "border-indigo-600 text-indigo-600 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }">
            🔄 ${isMg ? "Tantara Fampitahana" : "Historique de Synco"}
            <span class="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono">
              ${this.db.getSyncHistory().length}
            </span>
          </button>
        </div>

        <!-- Tab Body Content -->
        <div class="space-y-6">
          ${innerContentHtml}
        </div>
      </div>

      <!-- Offline Help Dialog Modal -->
      ${this.showOfflineHelp ? `
        <div id="offlineHelpModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden transform scale-100 transition-all duration-300 flex flex-col max-h-[85vh] text-left">
            <!-- Modal Header -->
            <div class="px-6 py-4.5 bg-gradient-to-r from-indigo-50 to-indigo-100/30 border-b border-slate-100 flex items-center justify-between">
              <div class="flex items-center space-x-2.5">
                <div class="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg shadow-sm">
                  💡
                </div>
                <div>
                  <h3 class="text-sm font-extrabold text-slate-900">
                    ${isMg ? "Ahoana no fampiasana ny Offline?" : "Guide de l'Apprentissage Hors-ligne"}
                  </h3>
                  <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">
                    Feheziko Offline Support
                  </p>
                </div>
              </div>
              <button id="closeOfflineHelpBtn" class="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-sm font-bold">
                ✕
              </button>
            </div>

            <!-- Modal Content Scroll Area -->
            <div class="p-6 overflow-y-auto space-y-4 text-slate-600 text-xs leading-relaxed max-h-[60vh]">
              <!-- Intro -->
              <p class="font-semibold text-slate-500">
                ${isMg 
                  ? "Feheziko dia natao manokana handraisana an-tanana ireo mpianatra malagasy na dia any amin'ny toerana tsy misy internet tsara aza. Ampiasao tsara ireto torolalana ireto:"
                  : "Feheziko a été conçu pour accompagner les apprenants malagasy même dans les zones à faible connectivité. Suivez ce guide pour optimiser votre apprentissage hors-ligne :"}
              </p>

              <!-- Section 1: Caching Lessons -->
              <div class="flex items-start space-x-3.5 bg-slate-50 border border-slate-150 rounded-2xl p-4">
                <span class="text-2xl shrink-0 mt-0.5">💾</span>
                <div class="space-y-1">
                  <h4 class="font-extrabold text-slate-800 text-xs">
                    ${isMg ? "1. Mitahiry Lesona (Caching)" : "1. Mise en cache des leçons"}
                  </h4>
                  <p class="text-slate-500">
                    ${isMg
                      ? "Tsindrio ny kisary fitehirizana eo amin'ny lisitry ny lesona alohan'ny handehananao. Izany dia mitahiry ny voambolana, feo, ary fanontaniana rehetra ao amin'ny fitadidiana findainao."
                      : "Avant de partir, cliquez sur l'icône de téléchargement d'une leçon. Cela enregistre le vocabulaire, les fichiers audio et les quiz directement dans la mémoire locale de votre appareil."}
                  </p>
                </div>
              </div>

              <!-- Section 2: VAD Calibration -->
              <div class="flex items-start space-x-3.5 bg-slate-50 border border-slate-150 rounded-2xl p-4">
                <span class="text-2xl shrink-0 mt-0.5">🎙️</span>
                <div class="space-y-1">
                  <h4 class="font-extrabold text-slate-800 text-xs">
                    ${isMg ? "2. Fandrefesana ny feo (VAD)" : "2. Calibrage intelligent du VAD"}
                  </h4>
                  <p class="text-slate-500">
                    ${isMg
                      ? "Rehefa mianatra amin'ny toerana mitabataba ianao (an-dalana, an-dakilasy), mandehana any amin'ny Paramètres ary tsindrio ny 'Lancer le calibrage' mba hanitsiana ny fahatsapan'ny mikrofoninao."
                      : "Si vous étudiez dans un endroit bruyant (marché, classe), allez dans les Paramètres et lancez le calibrage audio. Cela ajuste le seuil de détection vocale pour éviter les faux déclenchements."}
                  </p>
                </div>
              </div>

              <!-- Section 3: IPA Generation -->
              <div class="flex items-start space-x-3.5 bg-slate-50 border border-slate-150 rounded-2xl p-4">
                <span class="text-2xl shrink-0 mt-0.5">🗣️</span>
                <div class="space-y-1">
                  <h4 class="font-extrabold text-slate-800 text-xs">
                    ${isMg ? "3. Fanononana IPA ho an'ny Teny Vaovao" : "3. Transcription phonétique (IPA)"}
                  </h4>
                  <p class="text-slate-500">
                    ${isMg
                      ? "Afaka mampiditra teny frantsay vaovao amin'ny Dikanteny ianao. Ny fampiharana dia mamorona dikan-teny ara-peo (IPA) avy hatrany mba hanampiana anao hanonona izany tsara na dia tsy misy internet aza."
                      : "Vous pouvez ajouter vos propres mots dans le dictionnaire. L'application génère automatiquement leur transcription phonétique IPA hors-ligne pour guider précisément votre prononciation."}
                  </p>
                </div>
              </div>

              <!-- Section 4: Progress Syncing -->
              <div class="flex items-start space-x-3.5 bg-slate-50 border border-slate-150 rounded-2xl p-4">
                <span class="text-2xl shrink-0 mt-0.5">🔄</span>
                <div class="space-y-1">
                  <h4 class="font-extrabold text-slate-800 text-xs">
                    ${isMg ? "4. Fampitahana rehefa miverina ny internet" : "4. Synchronisation transparente"}
                  </h4>
                  <p class="text-slate-500">
                    ${isMg
                      ? "Tehirizina tsara ao amin'ny finday ny XP sy ny lesona vitanao rehetra. Rehefa mahazo internet indray ianao, dia alefa ho azy any amin'ny cloud izany, na tsindrio ny 'Sync Now'."
                      : "Vos XP, leçons complétées et scores sont stockés localement. Dès que vous retrouvez du réseau, votre progression est envoyée vers le cloud. Vous pouvez aussi forcer l'envoi via 'Synchroniser maintenant'."}
                  </p>
                </div>
              </div>

              <!-- Section 5: Manual Backup Key -->
              <div class="flex items-start space-x-3.5 bg-slate-50 border border-slate-150 rounded-2xl p-4">
                <span class="text-2xl shrink-0 mt-0.5">🔑</span>
                <div class="space-y-1">
                  <h4 class="font-extrabold text-slate-800 text-xs">
                    ${isMg ? "5. Fanondranana progress amin'ny kaody" : "5. Sauvegarde manuelle par clé"}
                  </h4>
                  <p class="text-slate-500">
                    ${isMg
                      ? "Azonao adika tsotra fotsiny ny kaody fandrosoana 'Backup key' ao amin'ny paramètres mba hamindrana izany amin'ny finday hafa, tsy mila kaonty na internet mihitsy!"
                      : "Vous pouvez copier la clé de sauvegarde textuelle pour cloner votre progression sur un autre téléphone, sans réseau et sans créer de compte en ligne."}
                  </p>
                </div>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button id="closeOfflineHelpBtnSecondary" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer">
                ${isMg ? "Azo antoka! (Compris)" : "Compris, j'ai pigé !"}
              </button>
            </div>
          </div>
        </div>
      ` : ""}
    `;

    // BIND ACTIONS & EVENT HANDLERS
    // Tabs switcher binding
    this.querySelector("#tabGeneralBtn")?.addEventListener("click", () => {
      this.activeTab = "general";
      this.render();
    });

    this.querySelector("#tabSyncBtn")?.addEventListener("click", () => {
      this.activeTab = "sync_history";
      this.render();
    });

    // Trigger sync button binding
    this.querySelector("#triggerSyncBtn")?.addEventListener("click", async (e: Event) => {
      const btn = e.currentTarget as HTMLButtonElement;
      if (!btn) return;
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = isMg ? "⏳ Fampitahana an-dalana..." : "⏳ Synchronisation...";

      const success = await this.db.triggerSync();

      btn.disabled = false;
      btn.innerHTML = originalHtml;

      if (success) {
        alert(isMg 
          ? "Vita soa aman-tsara ny fampitahana!" 
          : "Synchronisation effectuée avec succès !"
        );
      } else {
        alert(isMg
          ? "Tsy nahomby ny fampitahana. Jereo raha mifandray amin'ny internet ny fitaovanao."
          : "Échec de la synchronisation. Vérifiez votre connexion Internet."
        );
      }
    });

    // Clear sync history button binding
    this.querySelector("#clearSyncHistoryBtn")?.addEventListener("click", () => {
      if (confirm(isMg ? "Tena hamafana ny tantara rehetra ve ianao?" : "Voulez-vous vraiment effacer l'historique de synchronisation ?")) {
        this.db.clearSyncHistory();
        alert(isMg ? "Voafafa ny tantara!" : "Historique effacé !");
      }
    });
    // Forced Offline mode toggle
    this.querySelector("#forcedOfflineToggle")?.addEventListener("change", (e: Event) => {
      const target = e.target as HTMLInputElement;
      this.db.setForcedOffline(target.checked);
      alert(target.checked 
        ? (isMg ? "Mode Avion activated! Ny fampiharana dia miasa offline feno ankehitriny." : "Mode Hors-Ligne activé ! L'application fonctionne 100% en local.") 
        : (isMg ? "Mode Avion deactivated!" : "Mode Hors-Ligne désactivé !"));
    });

    // Master Download All Packs button binding
    this.querySelector("#downloadAllPacksBtn")?.addEventListener("click", () => {
      this.downloadPack("master-all", { lessons: allLessons, dialogues: dialogues });
    });

    // Download individual pack buttons binding
    this.querySelectorAll(".downloadPackBtn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        const packId = btn.getAttribute("data-pack-id");
        const packType = btn.getAttribute("data-pack-type");

        if (packType === "level") {
          const targetLvl = levels.find((l: any) => l.id === packId);
          if (targetLvl) {
            this.downloadPack(packId, { lessons: targetLvl.lessons || [] });
          }
        } else if (packType === "delf") {
          this.downloadPack("delf-pack", { lessons: allLessons });
        } else if (packType === "dialogue-children") {
          const childDlgs = dialogues.filter((d: any) => d.category === "children");
          this.downloadPack("dlg-children", { dialogues: childDlgs });
        } else if (packType === "dialogue-adults") {
          const adultDlgs = dialogues.filter((d: any) => d.category === "adults");
          this.downloadPack("dlg-adults", { dialogues: adultDlgs });
        } else if (packType === "dialogue-roleplay") {
          const rpDlgs = dialogues.filter((d: any) => d.scenarios || d.lines);
          this.downloadPack("dlg-roleplay", { dialogues: rpDlgs });
        }
      });
    });

    // Delete individual pack buttons binding
    this.querySelectorAll(".deletePackBtn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const packId = btn.getAttribute("data-pack-id");
        const packType = btn.getAttribute("data-pack-type");

        if (confirm(isMg ? "Tena te-hamafa ity pack voatahiry ity ve ianao?" : "Voulez-vous vraiment effacer ce pack du cache ?")) {
          if (packType === "level") {
            const targetLvl = levels.find((l: any) => l.id === packId);
            if (targetLvl) {
              for (const les of targetLvl.lessons || []) {
                await this.db.uncacheLesson(les.id);
              }
            }
          } else if (packType === "dialogue-children") {
            const childDlgs = dialogues.filter((d: any) => d.category === "children");
            for (const dlg of childDlgs) {
              await this.db.uncacheDialogue(dlg.id);
            }
          } else if (packType === "dialogue-adults") {
            const adultDlgs = dialogues.filter((d: any) => d.category === "adults");
            for (const dlg of adultDlgs) {
              await this.db.uncacheDialogue(dlg.id);
            }
          } else if (packType === "dialogue-roleplay") {
            const rpDlgs = dialogues.filter((d: any) => d.scenarios || d.lines);
            for (const dlg of rpDlgs) {
              await this.db.uncacheDialogue(dlg.id);
            }
          }
          await this.loadStorageData();
          window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
        }
      });
    });

    // Clear All Cache button action
    this.querySelector("#clearAllCacheBtn")?.addEventListener("click", async () => {
      const confirmed = confirm(isMg ? "Tena te-hamafa ny lesona sy dinika voatahiry rehetra ve ianao?" : "Voulez-vous vraiment vider l'ensemble du cache hors-ligne ?");
      if (confirmed) {
        for (const cl of this.cachedLessons) {
          await this.db.uncacheLesson(cl.id);
        }
        for (const cd of this.cachedDialogues) {
          await this.db.uncacheDialogue(cd.id);
        }
        await this.loadStorageData();
        window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
        alert(isMg ? "Voafafa avokoa ny cache rehetra!" : "L'ensemble du cache hors-ligne a été vidé !");
      }
    });
    this.querySelector("#reopenOnboardingBtn")?.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("feheziko_show_onboarding"));
    });

    this.querySelector("#langMgBtn")?.addEventListener("click", () => {
      this.db.updateAccessibility({ language: "mg" });
      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
    });

    this.querySelector("#langFrBtn")?.addEventListener("click", () => {
      this.db.updateAccessibility({ language: "fr" });
      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
    });

    // Font Sizes
    const sizes = ["normal", "large", "extra"];
    sizes.forEach(sz => {
      this.querySelector(`#size${sz.charAt(0).toUpperCase() + sz.slice(1)}Btn`)?.addEventListener("click", () => {
        this.db.updateAccessibility({ textSize: sz as any });
        window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
      });
    });

    // Contrast Toggle
    this.querySelector("#contrastToggle")?.addEventListener("click", () => {
      const nextContrast = progress.accessibility.contrast === "high" ? "normal" : "high";
      this.db.updateAccessibility({ contrast: nextContrast });
      
      // Update DOM classes for high contrast globally if needed
      if (nextContrast === "high") {
        document.documentElement.classList.add("contrast-high");
      } else {
        document.documentElement.classList.remove("contrast-high");
      }

      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
    });

    // Colorblind Toggle
    this.querySelector("#colorblindToggle")?.addEventListener("click", () => {
      const nextColorblind = !progress.accessibility.colorblind;
      this.db.updateAccessibility({ colorblind: nextColorblind });
      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
    });

    // Dark Mode Toggle
    this.querySelector("#darkModeToggle")?.addEventListener("click", () => {
      const currentProg = this.db.getProgress();
      const nextDarkMode = !currentProg.accessibility.darkMode;
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

    // Offline Audio Calibration Utility
    this.querySelector("#startCalibrationBtn")?.addEventListener("click", async () => {
      const btn = this.querySelector("#startCalibrationBtn") as HTMLButtonElement;
      const btnText = this.querySelector("#calibrationBtnText");
      const noiseBar = this.querySelector("#noiseBar") as HTMLElement;
      const noiseVal = this.querySelector("#noiseVal");
      const thresholdVal = this.querySelector("#thresholdVal");
      const feedback = this.querySelector("#calibrationFeedback") as HTMLElement;

      if (!btn || !noiseBar || !noiseVal || !thresholdVal || !feedback) return;

      btn.disabled = true;
      if (btnText) btnText.textContent = t.calibrateRunning;
      
      feedback.classList.add("hidden");
      feedback.className = "p-3 rounded-xl border text-xs leading-normal transition-all duration-300";

      let maxAmbientDev = 0;
      let samplesCount = 0;
      let audioCtx: any = null;
      let stream: MediaStream | null = null;
      let intervalId: any = null;

      try {
        if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            audioCtx = new AudioContextClass();
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            intervalId = setInterval(() => {
              analyser.getByteTimeDomainData(dataArray);
              let instantDev = 0;
              for (let i = 0; i < bufferLength; i++) {
                const dev = Math.abs(dataArray[i] - 128);
                if (dev > maxAmbientDev) maxAmbientDev = dev;
                if (dev > instantDev) instantDev = dev;
              }
              samplesCount++;

              // Update real-time noise UI indicators
              const percentage = Math.min(100, Math.round((instantDev / 60) * 100));
              noiseBar.style.width = `${percentage}%`;
              noiseVal.textContent = String(instantDev);

              // Update button text with a progress indicator
              if (btnText && samplesCount % 5 === 0) {
                const progressDots = ".".repeat((samplesCount / 5) % 4);
                btnText.textContent = `${t.calibrateRunning}${progressDots}`;
              }
            }, 60);

            // Run calibration for 3 seconds
            await new Promise(resolve => setTimeout(resolve, 3000));
          } else {
            throw new Error("AudioContext not supported");
          }
        } else {
          throw new Error("getUserMedia not supported");
        }
      } catch (err: any) {
        console.warn("[Calibration] Microphone access failed or blocked:", err);
        feedback.classList.remove("hidden");
        feedback.classList.add("bg-rose-50", "text-rose-800", "border-rose-200");
        feedback.innerHTML = isMg
          ? `⚠️ <strong>Tsy nahomby ny fidirana amin'ny mikrofoninao:</strong> Mba omeo alalana ny mikrofoninao rehefa manontany ny fampiharana.`
          : `⚠️ <strong>Accès microphone refusé :</strong> Veuillez autoriser l'accès au microphone dans les paramètres de votre navigateur ou de l'application.`;
        
        btn.disabled = false;
        if (btnText) btnText.textContent = t.calibrateStartBtn;
        return;
      } finally {
        if (intervalId) clearInterval(intervalId);
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        if (audioCtx) {
          audioCtx.close().catch(() => {});
        }
      }

      // Calculate new VAD Threshold
      const calculatedThreshold = Math.max(3, Math.round(maxAmbientDev + 2));
      
      // Update database
      this.db.updateAccessibility({ vadThreshold: calculatedThreshold });

      // Reset real-time indicators
      noiseBar.style.width = "0%";
      noiseVal.textContent = "0";
      thresholdVal.textContent = String(calculatedThreshold);

      // Provide dynamic contextual feedback based on environment quietness
      feedback.classList.remove("hidden");
      if (calculatedThreshold <= 4) {
        feedback.classList.add("bg-emerald-50/40", "text-emerald-800", "border-emerald-200/50");
        feedback.innerHTML = `🌟 <strong>${t.calibrateFinished}</strong> ${t.calibrateStatusQuiet} (Threshold: <strong>${calculatedThreshold}</strong>)`;
      } else if (calculatedThreshold <= 8) {
        feedback.classList.add("bg-amber-50/40", "text-amber-800", "border-amber-200/50");
        feedback.innerHTML = `👍 <strong>${t.calibrateFinished}</strong> ${t.calibrateStatusModerate} (Threshold: <strong>${calculatedThreshold}</strong>)`;
      } else {
        feedback.classList.add("bg-rose-50/40", "text-rose-800", "border-rose-200/50");
        feedback.innerHTML = `🔊 <strong>${t.calibrateFinished}</strong> ${t.calibrateStatusNoisy} (Threshold: <strong>${calculatedThreshold}</strong>)`;
      }

      // Reset button
      btn.disabled = false;
      if (btnText) btnText.textContent = t.calibrateStartBtn;

      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
    });

    // School linkage trigger
    this.querySelector("#linkSchoolBtn")?.addEventListener("click", () => {
      const input = this.querySelector("#schoolCodeIn") as HTMLInputElement;
      if (input && input.value.trim()) {
        const code = input.value.trim().toUpperCase();
        this.db.setSchoolCode(code);
        this.db.addXp(30); // School join xp reward
        alert("Fiarahana nahomby! Tafiditra ao anatin'ny kilasy ianao ary nahazo +30 XP.");
        window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
      }
    });

    this.querySelector("#disconnectSchoolBtn")?.addEventListener("click", () => {
      this.db.setSchoolCode("");
      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
    });

    // Export key copy trigger
    this.querySelector("#exportCodeBtn")?.addEventListener("click", () => {
      const copyText = this.querySelector("#backupCodeStr") as HTMLInputElement;
      if (copyText) {
        copyText.select();
        navigator.clipboard.writeText(copyText.value);
        alert("Adika soa aman-tsara! Azonao ampiasaina hamindrana progress.");
      }
    });

    // Start Tour button trigger
    this.querySelector("#startTourBtn")?.addEventListener("click", () => {
      this.currentTourStep = 0;
      this.renderTour();
    });

    // Offline Help triggers
    this.querySelector("#offlineHelpBtn")?.addEventListener("click", () => {
      this.showOfflineHelp = true;
      this.render();
    });

    this.querySelector("#closeOfflineHelpBtn")?.addEventListener("click", () => {
      this.showOfflineHelp = false;
      this.render();
    });

    this.querySelector("#closeOfflineHelpBtnSecondary")?.addEventListener("click", () => {
      this.showOfflineHelp = false;
      this.render();
    });

    this.querySelector("#offlineHelpModal")?.addEventListener("click", (e: Event) => {
      if (e.target === e.currentTarget) {
        this.showOfflineHelp = false;
        this.render();
      }
    });

    // Microphone testing triggers
    this.querySelector("#testMicBtn")?.addEventListener("click", () => {
      this.startMicTesting();
    });

    this.querySelector("#stopMicTestBtn")?.addEventListener("click", () => {
      this.stopMicTesting();
    });
  }

  private clearTourHighlights() {
    this.querySelectorAll(".fz-tour-highlighted").forEach((el: any) => {
      el.classList.remove("fz-tour-highlighted");
    });
    // also remove the pulsing pointers inside overlay
    const elements = document.getElementsByClassName("fz-tour-pulse-pointer");
    while (elements.length > 0) {
      elements[0].parentNode?.removeChild(elements[0]);
    }
  }

  private endTour() {
    this.currentTourStep = -1;
    this.renderTour();
  }

  private renderTour() {
    // Remove existing tour overlay if present
    const existingOverlay = document.getElementById("fz-tour-overlay");
    if (existingOverlay) {
      existingOverlay.remove();
    }

    if (this.currentTourStep === -1) {
      // Remove any highlighted custom styles if tour is ended
      this.clearTourHighlights();
      return;
    }

    const progress = this.db.getProgress();
    const isMg = progress.accessibility.language === "mg";

    // Define steps
    const steps = [
      {
        id: "welcome",
        icon: "🚀",
        titleMg: "Tongasoa eto amin'ny Feheziko!",
        titleFr: "Bienvenue sur Feheziko !",
        descMg: "Ity no torolalana fohy hampisehoana aminao ireo tolotra miavaka eto amin'ny sehatra mba hanafainganana ny fianaranao teny.",
        descFr: "Voici un guide interactif pour vous présenter les fonctionnalités clés de l'application et accélérer votre apprentissage.",
        target: null
      },
      {
        id: "shadowing",
        icon: "🎙️",
        titleMg: "Ny Shadowing sy ny Feo",
        titleFr: "Shadowing & Analyse de Voix",
        descMg: "Rehefa mianatra lesona ianao dia afaka manindry ny mikraofona mba hanononana fehezanteny mivantana. Ny AI dia hanome naoty anao mivoaka 100 hanitsiana ny pronunciation-nao!",
        descFr: "Durant vos leçons, cliquez sur l'icône Microphone pour enregistrer votre voix. Notre IA phonétique analyse et vous attribue un score sur 100 pour perfectionner votre accent !",
        target: null
      },
      {
        id: "offline",
        icon: "💾",
        titleMg: "Fitehirizana Offline (Cache)",
        titleFr: "Mode Hors-ligne & Cache",
        descMg: "Azonao atao ny mitahiry ny lesona tianao indrindra offline eto amin'ny alalan'ny bokotra 'Tout synchroniser offline'. Manampy anao hianatra na dia tsy misy internet aza izany!",
        descFr: "Enregistrez vos leçons favorites en cache pour continuer à réviser sans connexion internet. Suivez et videz l'espace de stockage de chaque module ici-même.",
        target: "#clearAllCacheBtn"
      },
      {
        id: "access",
        icon: "♿",
        titleMg: "Fidirana ho an'ny Rehetra (WCAG)",
        titleFr: "Accessibilité Universelle (WCAG)",
        descMg: "Feheziko dia manaraka ny torolalana WCAG AA. Azonao ovaina ny haben'ny soratra, ny contrast an'ny loko, ary koa ny Mode Daltonien ho an'ny fahasalaman'ny maso.",
        descFr: "Ajustez la taille du texte, activez le contraste élevé ou l'assistance pour daltonisme pour bénéficier d'une lisibilité maximale en toutes circonstances.",
        target: "#contrastToggle"
      },
      {
        id: "badges",
        icon: "🏆",
        titleMg: "Mari-boninahitra sy Tokens dizitaly",
        titleFr: "Badges & Récompenses",
        descMg: "Mahazoa mari-pankasitrahana (Badges) sy Token dizitaly amin'ny fahavitan'ny lesona, ny fitazonana Streak 7 andro, na ny famitana reviziona SRS 100. Ny ezakao dia omena valisoa!",
        descFr: "Gagnez des badges prestigieux et accumulez des jetons digitaux en franchissant des jalons (série de 7 jours, 100 mots révisés). Vos efforts quotidiens sont récompensés !",
        target: null
      }
    ];

    const step = steps[this.currentTourStep];
    if (!step) return;

    const title = isMg ? step.titleMg : step.titleFr;
    const desc = isMg ? step.descMg : step.descFr;

    const overlay = document.createElement("div");
    overlay.id = "fz-tour-overlay";
    overlay.className = "fixed inset-0 z-[9999] pointer-events-none";

    const backdrop = document.createElement("div");
    backdrop.className = "absolute inset-0 bg-slate-950/60 backdrop-blur-xs pointer-events-auto transition-opacity duration-300";
    overlay.appendChild(backdrop);

    const card = document.createElement("div");
    card.className = "absolute bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 md:p-8 max-w-sm w-full pointer-events-auto transition-all duration-300 animate-fade-in flex flex-col gap-5";

    let targetEl: HTMLElement | null = null;
    if (step.target) {
      targetEl = this.querySelector(step.target) as HTMLElement;
    }

    if (targetEl) {
      this.clearTourHighlights();
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      targetEl.classList.add("fz-tour-highlighted");
      
      const rect = targetEl.getBoundingClientRect();
      const cardWidth = 380;
      const cardHeight = 240;
      const margin = 16;

      let top = rect.bottom + window.scrollY + margin;
      let left = rect.left + window.scrollX + (rect.width / 2) - (cardWidth / 2);

      if (left < margin) left = margin;
      if (left + cardWidth > window.innerWidth - margin) {
        left = window.innerWidth - cardWidth - margin;
      }
      if (top + cardHeight > window.innerHeight + window.scrollY - margin) {
        top = rect.top + window.scrollY - cardHeight - margin;
      }

      card.style.position = "absolute";
      card.style.top = `${top}px`;
      card.style.left = `${left}px`;
      card.style.width = `${cardWidth}px`;
    } else {
      this.clearTourHighlights();
      card.style.position = "fixed";
      card.style.top = "50%";
      card.style.left = "50%";
      card.style.transform = "translate(-50%, -50%)";
      card.style.width = "calc(100% - 32px)";
      card.style.maxWidth = "420px";
    }

    if (!document.getElementById("fz-tour-styles")) {
      const style = document.createElement("style");
      style.id = "fz-tour-styles";
      style.textContent = `
        .fz-tour-highlighted {
          position: relative !important;
          z-index: 10000 !important;
          outline: 4px solid #4f46e5 !important;
          outline-offset: 4px !important;
          box-shadow: 0 0 25px rgba(79, 70, 229, 0.4) !important;
          pointer-events: none !important;
          background-color: white !important;
        }
        @keyframes fzPulseRing {
          0% { transform: scale(0.95); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.5; }
          100% { transform: scale(0.95); opacity: 1; }
        }
        .fz-tour-pulse-pointer {
          position: absolute;
          width: 24px;
          height: 24px;
          border-radius: 9999px;
          background-color: #4f46e5;
          opacity: 0.7;
          animation: fzPulseRing 1.8s infinite ease-in-out;
          pointer-events: none;
          z-index: 10001;
        }
      `;
      document.head.appendChild(style);
    }

    if (targetEl) {
      const pointer = document.createElement("div");
      pointer.className = "fz-tour-pulse-pointer";
      const rect = targetEl.getBoundingClientRect();
      pointer.style.top = `${rect.top + window.scrollY - 12}px`;
      pointer.style.left = `${rect.left + window.scrollX - 12}px`;
      overlay.appendChild(pointer);
    }

    card.innerHTML = `
      <div class="space-y-2.5">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-mono font-bold text-indigo-600 uppercase bg-indigo-50 px-2.5 py-0.5 rounded-full">
            ${isMg ? `Dingana ${this.currentTourStep + 1} amin'ny ${steps.length}` : `Étape ${this.currentTourStep + 1} sur ${steps.length}`}
          </span>
          <button id="fz-tour-close" class="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer p-1">✕</button>
        </div>
        <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div class="bg-indigo-600 h-full rounded-full transition-all duration-300" style="width: ${((this.currentTourStep + 1) / steps.length) * 100}%"></div>
        </div>
      </div>

      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl shrink-0">
          <span>${step.icon}</span>
        </div>
        <div class="space-y-1.5 min-w-0 flex-1">
          <h4 class="font-extrabold text-slate-900 text-sm md:text-base tracking-tight leading-tight">${title}</h4>
          <p class="text-xs text-slate-500 font-medium leading-relaxed">${desc}</p>
        </div>
      </div>

      <div class="flex justify-between items-center gap-3 border-t border-slate-100 pt-4 mt-1">
        <button id="fz-tour-skip" class="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer">
          ${isMg ? "Hakatona" : "Passer"}
        </button>
        
        <div class="flex items-center gap-2">
          ${this.currentTourStep > 0 ? `
            <button id="fz-tour-prev" class="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-[11px] rounded-xl transition-all cursor-pointer">
              ${isMg ? "Miverina" : "Précédent"}
            </button>
          ` : ""}
          
          <button id="fz-tour-next" class="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-xl transition-all shadow-xs cursor-pointer">
            ${this.currentTourStep === steps.length - 1 ? (isMg ? "Vita" : "Terminer") : (isMg ? "Manaraka" : "Suivant")}
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    document.getElementById("fz-tour-close")?.addEventListener("click", () => this.endTour());
    document.getElementById("fz-tour-skip")?.addEventListener("click", () => this.endTour());
    document.getElementById("fz-tour-prev")?.addEventListener("click", () => {
      this.currentTourStep--;
      this.renderTour();
    });
    document.getElementById("fz-tour-next")?.addEventListener("click", () => {
      if (this.currentTourStep === steps.length - 1) {
        this.endTour();
      } else {
        this.currentTourStep++;
        this.renderTour();
      }
    });
    backdrop.addEventListener("click", () => this.endTour());
  }

  private async startMicTesting() {
    if (!this.db) return;
    const progress = this.db.getProgress();
    const isMg = progress.accessibility.language === "mg";

    const indicator = this.querySelector("#micStatusIndicator");
    const statusText = this.querySelector("#micStatusText");
    const testBtn = this.querySelector("#testMicBtn");
    const stopBtn = this.querySelector("#stopMicTestBtn");
    const container = this.querySelector("#micVisualizerContainer");
    const volumeBar = this.querySelector("#micVolumeBar") as HTMLElement;
    const volumeValue = this.querySelector("#micVolumeValue");
    const waveBars = this.querySelectorAll(".mic-wave-bar") as NodeListOf<HTMLElement>;

    try {
      if (indicator) indicator.className = "w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse";
      if (statusText) statusText.textContent = isMg ? "Mangataka fahazoan-dalana..." : "Demande d'accès...";

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.micStream = stream;

      // Update status to active
      if (indicator) indicator.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping";
      if (statusText) statusText.textContent = isMg ? "Mandeha tsara" : "Actif & Fonctionnel";
      if (testBtn) testBtn.classList.add("hidden");
      if (stopBtn) stopBtn.classList.remove("hidden");
      if (container) container.classList.remove("hidden");

      // Setup audio analyzer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx();
      this.micAudioContext = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64; // Small fft size for simpler bars
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeter = () => {
        if (!this.micStream) return;
        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume level
        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          total += dataArray[i];
        }
        const average = total / bufferLength;
        const volumePercent = Math.min(Math.round((average / 120) * 100), 100);

        if (volumeBar) {
          volumeBar.style.width = `${volumePercent}%`;
        }
        if (volumeValue) {
          volumeValue.textContent = `${volumePercent}%`;
        }

        // Animate wave bars based on frequency bins
        waveBars.forEach((bar, index) => {
          const dataIndex = index % bufferLength;
          const value = dataArray[dataIndex];
          // Scale to 4px - 36px height range
          const height = Math.max(4, Math.round((value / 255) * 36));
          bar.style.height = `${height}px`;
          // Map color intensity
          if (value > 150) {
            bar.className = "mic-wave-bar w-1.5 bg-emerald-500 rounded-full transition-all duration-75";
          } else if (value > 60) {
            bar.className = "mic-wave-bar w-1.5 bg-indigo-500 rounded-full transition-all duration-75";
          } else {
            bar.className = "mic-wave-bar w-1.5 bg-slate-600 rounded-full transition-all duration-75";
          }
        });

        this.micAnimationId = requestAnimationFrame(updateMeter);
      };

      updateMeter();

    } catch (err) {
      console.error("Failed to access microphone:", err);
      if (indicator) indicator.className = "w-2.5 h-2.5 rounded-full bg-rose-500";
      if (statusText) statusText.textContent = isMg ? "Fidirana nolavina!" : "Accès refusé !";
      alert(isMg 
        ? "Tsy afaka nampiasa ny mikraofona izahay. Jereo azafady ny fahazoan-dalana (permissions) amin'ny navigateur-nao." 
        : "Impossible d'accéder au microphone. Veuillez vérifier les autorisations dans votre navigateur.");
      this.stopMicTesting();
    }
  }

  private stopMicTesting() {
    if (this.micAnimationId) {
      cancelAnimationFrame(this.micAnimationId);
      this.micAnimationId = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
    if (this.micAudioContext) {
      this.micAudioContext.close().catch(() => {});
      this.micAudioContext = null;
    }

    // Reset UI to inoperative state
    const indicator = this.querySelector("#micStatusIndicator");
    const statusText = this.querySelector("#micStatusText");
    const testBtn = this.querySelector("#testMicBtn");
    const stopBtn = this.querySelector("#stopMicTestBtn");
    const container = this.querySelector("#micVisualizerContainer");

    if (indicator) {
      indicator.className = "w-2.5 h-2.5 rounded-full bg-slate-300";
    }
    if (statusText) {
      const progress = this.db?.getProgress();
      const isMg = progress?.accessibility.language === "mg";
      statusText.textContent = isMg ? "Tsy mbola mandeha" : "Inactif";
    }
    if (testBtn) testBtn.classList.remove("hidden");
    if (stopBtn) stopBtn.classList.add("hidden");
    if (container) container.classList.add("hidden");
  }
}

customElements.define("fz-settings", FzSettings);
