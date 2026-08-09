/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseEngine } from "../core/DatabaseEngine";
import { AudioEngine } from "../core/AudioEngine";

export class FzDictionary extends HTMLElement {
  private db!: DatabaseEngine;
  private audio!: AudioEngine;

  private searchQuery: string = "";
  private selectedWordIndex: number | null = null;
  private customWords: any[] = [];
  private showAddModal: boolean = false;
  private activeFilterTab: "all" | "mistakes" | "lessons" | "srs" = "all";

  // Flashcard Mode state
  private isFlashcardMode: boolean = false;
  private flashcardIndex: number = 0;
  private flashcardFlipped: boolean = false;
  private flashcardMasteredCount: number = 0;
  private flashcardReviewCount: number = 0;
  private flashcardFrontLanguage: "fr" | "mg" = "fr";

  constructor() {
    super();
  }

  connectedCallback() {
    this.db = (window as any).feheziko?.db;
    this.audio = (window as any).feheziko?.audio;
    this.loadCustomWords();
    this.render();

    window.addEventListener("feheziko_state_changed", () => {
      this.render();
    });

    window.addEventListener("feheziko_select_dictionary_word", (e: any) => {
      if (e.detail) {
        this.searchQuery = e.detail;
        this.selectedWordIndex = 0;
        this.render();
      }
    });
  }

  private loadCustomWords() {
    try {
      const stored = localStorage.getItem("feheziko_custom_words");
      if (stored) {
        this.customWords = JSON.parse(stored);
      }
    } catch {
      this.customWords = [];
    }
  }

  private saveCustomWords() {
    try {
      localStorage.setItem("feheziko_custom_words", JSON.stringify(this.customWords));
    } catch (e) {
      console.error(e);
    }
  }

  private render() {
    if (!this.db || !this.audio) return;

    const progress = this.db.getProgress();
    const content = (window as any).feheziko?.languageContent;
    if (!content) return;

    const isMg = progress.accessibility.language === "mg";
    const t = isMg ? {
      title: "Rakibolana malalaka (Dictionnaire Offline)",
      subtitle: "Hikaroka dikan-teny sy fitsipi-pitenenana frantsay mivantana.",
      searchPlaceholder: "Hikaroka teny (Rechercher un mot)...",
      addWord: "Ampidiro teny vaovao",
      noResults: "Tsy misy teny mifanaraka amin'ny karokao.",
      definition: "Dikan'ny teny (Définition) :",
      example: "Ohatra (Exemple) :",
      bookmark: "Ampidiro amin'ny fampiharana SRS (Bookmark)",
      bookmarked: "Efa voatahiry ao amin'ny SRS",
      customBadge: "Nataonao manokana",
      modalTitle: "Teny vaovao ampidirina (Ajouter un mot personnalisé)",
      wordLabel: "Teny frantsay (Mot en français)",
      transLabel: "Dikan-teny malagasy (Traduction en malagasy)",
      defLabel: "Famaritana fohy (Brève définition)",
      phoneticLabel: "Fanononana IPA (Prononciation IPA)",
      save: "Tahiry (Enregistrer)",
      cancel: "Aoka ihany (Annuler)",
      exportCSV: "Havoaka amin'ny Anki/CSV",
      exportCSVError: "Tsy misy teny voatahiry na voamarika azo havoaka.",
      flashcardBtn: "🎴 Flashcards Mode",
      exitFlashcard: "← Hiverina amin'ny Rakibolana",
      flipHint: "Tsindrio na safio hahitana ny dikan-teny",
      swipeLeftLabel: "👈 Mbola halalinina",
      swipeRightLabel: "👉 Haiko! (Maîtrisé)",
      masteredCount: "Voafehy",
      reviewCount: "Halalinina",
      flashcardCompletedTitle: "🎉 Vita ny fampiharana Flashcards!",
      restartDeck: "🔄 Averina ny deck",
      backToDict: "📖 Hiverina amin'ny rakibolana",
      frontLanguageLabel: "Sens de révision :",
      frontFr: "Frantsay → Malagasy",
      frontMg: "Malagasy → Frantsay",
    } : {
      title: "Dictionnaire Offline",
      subtitle: "Recherchez des définitions et des traductions instantanées.",
      searchPlaceholder: "Rechercher un mot...",
      addWord: "Ajouter un mot",
      noResults: "Aucun mot ne correspond à votre recherche.",
      definition: "Définition :",
      example: "Exemple :",
      bookmark: "Ajouter aux révisions SRS",
      bookmarked: "Ajouté au SRS",
      customBadge: "Personnalisé",
      modalTitle: "Ajouter un mot personnalisé",
      wordLabel: "Mot en français",
      transLabel: "Traduction en malagasy",
      defLabel: "Brève définition",
      phoneticLabel: "Prononciation IPA",
      save: "Enregistrer",
      cancel: "Annuler",
      exportCSV: "Exporter vers Anki/CSV",
      exportCSVError: "Aucun mot enregistré ou favori à exporter.",
      flashcardBtn: "🎴 Mode Flashcards",
      exitFlashcard: "← Retour au Dictionnaire",
      flipHint: "Cliquez ou glissez pour révéler la traduction",
      swipeLeftLabel: "👈 À revoir",
      swipeRightLabel: "👉 Maîtrisé !",
      masteredCount: "Maîtrisés",
      reviewCount: "À revoir",
      flashcardCompletedTitle: "🎉 Session Flashcards terminée !",
      restartDeck: "🔄 Recommencer la série",
      backToDict: "📖 Retour au dictionnaire",
      frontLanguageLabel: "Sens de révision :",
      frontFr: "Français → Malagasy",
      frontMg: "Malagasy → Français",
    };

    const textClass = progress.accessibility.textSize === "large" ? "text-base" : 
                      progress.accessibility.textSize === "extra" ? "text-lg" : "text-sm";

    const mistakeCount = (progress.recentMistakes || []).length;
    const completedVocabCount = this.db.getCompletedLessonWords().size;
    const srsCount = (progress.revisionDeck || []).length;

    // Query high-performance offline local search index from DatabaseEngine with auto-suggest priorities
    const filteredDict = this.db.searchLocalDictionary(this.searchQuery, this.customWords, this.activeFilterTab);

    if (this.isFlashcardMode) {
      this.innerHTML = this.renderFlashcardMode(t, filteredDict, isMg, progress);
      this.bindFlashcardEvents(filteredDict, progress);
      return;
    }

    this.innerHTML = `
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 class="text-2xl font-bold text-slate-800">${t.title}</h2>
            <p class="text-xs text-slate-500 mt-1">${t.subtitle}</p>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <button id="openFlashcardsBtn" class="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95">
              🎴 ${t.flashcardBtn}
            </button>
            <button id="exportAnkiCsvBtn" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer">
              📥 ${t.exportCSV}
            </button>
            <button id="openAddModalBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer">
              ➕ ${t.addWord}
            </button>
          </div>
        </div>

        <!-- Intelligent Recommendation Callout Box -->
        <div class="bg-gradient-to-r from-indigo-50/90 via-purple-50/60 to-slate-50 border border-indigo-100 rounded-2xl p-3.5 flex items-center justify-between text-xs font-semibold shadow-2xs">
          <div class="flex items-center space-x-2.5">
            <span class="p-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">⚡</span>
            <div>
              <span class="font-black text-slate-800 block text-xs">
                ${isMg ? "Auto-Suggest Intelligente : Torolalana Mipetraka" : "Auto-Suggest Intelligent & Priorités de Révision"}
              </span>
              <span class="text-[11px] text-slate-500 font-medium">
                ${isMg 
                  ? "Ny teny amin'ny lesona efa vitanao sy ny fahadisoana taloha no aseho voalohany amin'ny karoka." 
                  : "Les mots de vos leçons complétées et vos erreurs récentes sont automatiquement prioritaires."
                }
              </span>
            </div>
          </div>
        </div>

        <!-- Search Bar & Auto-Suggest Category Filter Chips -->
        <div class="space-y-3">
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">🔍</span>
            <input id="dictSearchInput" type="text" value="${this.searchQuery}" placeholder="${t.searchPlaceholder}" class="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-10 pr-4 text-sm font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs" />
          </div>

          <!-- Auto-Suggest Filter Tabs -->
          <div class="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono font-bold">
            <button class="filterTabBtn px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${this.activeFilterTab === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}" data-tab="all">
              ⚡ ${isMg ? "Soso-kevitra rehetra" : "Auto-suggestions (Toutes)"}
            </button>
            <button class="filterTabBtn px-3.5 py-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${this.activeFilterTab === 'mistakes' ? 'bg-rose-600 text-white border-rose-600 shadow-xs' : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'}" data-tab="mistakes">
              <span>⚠️ ${isMg ? "Fahadisoana" : "Erreurs"}</span>
              <span class="px-1.5 py-0.2 ${this.activeFilterTab === 'mistakes' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800'} rounded-full text-[10px] font-black">${mistakeCount}</span>
            </button>
            <button class="filterTabBtn px-3.5 py-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${this.activeFilterTab === 'lessons' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'}" data-tab="lessons">
              <span>✅ ${isMg ? "Lesona efa vita" : "Leçons complétées"}</span>
              <span class="px-1.5 py-0.2 ${this.activeFilterTab === 'lessons' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'} rounded-full text-[10px] font-black">${completedVocabCount}</span>
            </button>
            <button class="filterTabBtn px-3.5 py-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${this.activeFilterTab === 'srs' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'}" data-tab="srs">
              <span>🔖 ${isMg ? "Révisions SRS" : "Révisions SRS"}</span>
              <span class="px-1.5 py-0.2 ${this.activeFilterTab === 'srs' ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-800'} rounded-full text-[10px] font-black">${srsCount}</span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Word List Left -->
          <div class="md:col-span-1 bg-white border border-slate-200 rounded-2xl overflow-hidden max-h-[450px] overflow-y-auto">
            ${
              filteredDict.length === 0
                ? `<p class="p-5 text-xs text-slate-400 text-center italic">${t.noResults}</p>`
                : `
              <div class="divide-y divide-slate-100">
                ${filteredDict
                  .map((item: any, idx: number) => {
                    const isSelected = this.selectedWordIndex === idx;
                    return `
                      <div data-idx="${idx}" class="wordListItem cursor-pointer p-3.5 text-left transition-colors ${
                      isSelected ? "bg-indigo-50/70 border-l-4 border-indigo-600" : "hover:bg-slate-50/60"
                    }">
                        <div class="flex justify-between items-start gap-1">
                          <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-1.5">
                              <h4 class="font-extrabold text-slate-800 ${textClass}">${item.word}</h4>
                              <button data-word="${item.word.replace(/"/g, '&quot;')}" class="dictListTtsBtn p-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-xs transition-transform active:scale-90 cursor-pointer shrink-0 flex items-center justify-center leading-none" title="${isMg ? 'Mihaino fanononana' : 'Écouter la prononciation'}">
                                🔊
                              </button>
                            </div>
                            <p class="text-xs text-slate-500 mt-0.5 truncate">${item.translation}</p>
                          </div>
                          <span class="text-[9px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded shrink-0">${item.type || "n."}</span>
                        </div>

                        <!-- Priority & Context Badges -->
                        <div class="flex flex-wrap gap-1 mt-2">
                          ${
                            item.isMistake
                              ? `<span class="bg-rose-100 text-rose-800 border border-rose-200 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-1">⚠️ ${isMg ? "Erreur à revoir" : "Erreur récente"}</span>`
                              : ""
                          }
                          ${
                            item.isCompletedLesson
                              ? `<span class="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-1">✅ ${isMg ? "Lesona" : "Vu en leçon"}</span>`
                              : ""
                          }
                          ${
                            item.isBookmarked
                              ? `<span class="bg-indigo-100 text-indigo-800 border border-indigo-200 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-1">🔖 SRS</span>`
                              : ""
                          }
                        </div>
                      </div>
                    `;
                  })
                  .join("")}
              </div>
            `
            }
          </div>

          <!-- Word Detail View Right -->
          <div class="md:col-span-2">
            ${
              this.selectedWordIndex !== null && filteredDict[this.selectedWordIndex]
                ? (() => {
                    const word = filteredDict[this.selectedWordIndex];
                    const isBookmarked = progress.revisionDeck.some(i => i.word === word.word);

                    return `
                      <div class="bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-xs relative">
                        <div class="flex justify-between items-start flex-wrap gap-2">
                          <div>
                            <div class="flex items-center space-x-2">
                              <h3 class="text-3xl font-black text-slate-900 tracking-tight">${word.word}</h3>
                              ${
                                word.isCustom
                                  ? `<span class="bg-amber-50 text-amber-700 text-[9px] font-bold border border-amber-100 px-2 py-0.5 rounded-full">${t.customBadge}</span>`
                                  : ""
                              }
                            </div>
                            <p class="text-xs font-mono text-slate-400 mt-1">[ ${word.type || "mot"} • ${word.phonetic || ""} ]</p>
                          </div>

                          <div class="flex items-center space-x-2">
                            <button id="speakWordBtn" class="w-10 h-10 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-lg transition-transform active:scale-95" title="Read Aloud">
                              🔊
                            </button>
                            <button id="bookmarkWordBtn" class="h-10 px-3.5 rounded-xl border flex items-center space-x-1.5 text-xs font-bold transition-all ${
                              isBookmarked
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white hover:bg-slate-50 text-indigo-600 border-indigo-200"
                            }">
                              <span>🔖</span>
                              <span>${isBookmarked ? t.bookmarked : t.bookmark}</span>
                            </button>
                          </div>
                        </div>

                        <!-- Prioritization Context Callout Banners -->
                        ${
                          word.isMistake
                            ? `
                            <div class="bg-rose-50 border border-rose-200/80 rounded-2xl p-3.5 flex items-start space-x-3 text-xs text-rose-900">
                              <span class="text-lg">⚠️</span>
                              <div>
                                <span class="font-black block uppercase tracking-wider text-[10px] text-rose-700 font-mono">
                                  ${isMg ? "Fahadisoana matetika amin'ny fanadinana" : "Erreur fréquente identifiée"}
                                </span>
                                <p class="font-semibold text-xs text-rose-800 mt-0.5 leading-relaxed">
                                  ${isMg ? `Diso tamin'ny fanazaran-tena izao : "${word.mistakeReason || word.word}"` : `Erreur enregistrée lors des quiz/exercices : "${word.mistakeReason || word.word}". Une révision attentive est conseillée.`}
                                </p>
                              </div>
                            </div>
                            `
                            : ""
                        }

                        ${
                          word.isCompletedLesson
                            ? `
                            <div class="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 flex items-start space-x-3 text-xs text-emerald-900">
                              <span class="text-lg">✅</span>
                              <div>
                                <span class="font-black block uppercase tracking-wider text-[10px] text-emerald-700 font-mono">
                                  ${isMg ? "Voatahiry tao amin'ny lesona complétée" : "Acquis dans une leçon complétée"}
                                </span>
                                <p class="font-semibold text-xs text-emerald-800 mt-0.5 leading-relaxed">
                                  ${isMg ? `Ao amin'ny lesona : "${word.completedLessonTitle || ""}"` : `Vocabulaire officiel appris dans : "${word.completedLessonTitle || ""}"`}
                                </p>
                              </div>
                            </div>
                            `
                            : ""
                        }

                        <!-- Dictionary definitions -->
                        <div class="space-y-4 border-t border-slate-100 pt-5">
                          <div class="space-y-1.5">
                            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">${t.definition}</h4>
                            <p class="text-sm font-semibold text-slate-800 leading-relaxed">${word.definition || "Tsy misy famaritana."}</p>
                            <p class="text-sm text-indigo-600 font-bold mt-1">Dika malagasy : ${word.translation}</p>
                          </div>

                          ${
                            word.example_fr || word.example
                              ? `
                            <div class="space-y-1.5 bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                              <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${t.example}</h4>
                              <p class="text-xs font-mono font-medium text-slate-700 italic">"${word.example_fr || word.example}"</p>
                              <p class="text-xs text-slate-500">"${word.example_mg || word.example_translation || ""}"</p>
                            </div>
                            `
                              : ""
                          }
                        </div>
                      </div>
                    `;
                  })()
                : `
              <div class="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[250px]">
                <span class="text-4xl">📖</span>
                <p class="text-xs text-slate-400 mt-2 font-mono italic">Mifidiana teny eo amin'ny ankavia mba hampisehoana ny tsipiriany.</p>
              </div>
            `
            }
          </div>
        </div>

        <!-- Add Custom Word Modal Screen overlays -->
        ${
          this.showAddModal
            ? `
          <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-4">
            <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-up">
              <h3 class="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">${t.modalTitle}</h3>
              
              <div class="space-y-4 py-4">
                <div class="space-y-1">
                  <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">${t.wordLabel}</label>
                  <input id="modalWordIn" type="text" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">${t.transLabel}</label>
                  <input id="modalTransIn" type="text" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">${t.defLabel}</label>
                  <textarea id="modalDefIn" rows="2" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"></textarea>
                </div>
                <div class="space-y-1">
                  <div class="flex items-center justify-between">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">${t.phoneticLabel}</label>
                    <span class="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100/55 rounded px-1.5 py-0.5 font-bold uppercase select-none tracking-wide">Auto-généré</span>
                  </div>
                  <input id="modalPhoneticIn" type="text" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-mono text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="/.../" />
                </div>
              </div>

              <div class="flex space-x-3 pt-3 border-t border-slate-100">
                <button id="modalCancelBtn" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-colors border border-slate-200">${t.cancel}</button>
                <button id="modalSaveBtn" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition-colors shadow-md">${t.save}</button>
              </div>
            </div>
          </div>
          `
            : ""
        }
      </div>
    `;

    // ADD BINDINGS & LISTENERS
    this.querySelectorAll(".filterTabBtn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        this.activeFilterTab = btn.getAttribute("data-tab") as any;
        this.selectedWordIndex = null;
        this.render();
      });
    });

    this.querySelector("#dictSearchInput")?.addEventListener("input", (e: Event) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.selectedWordIndex = null; // Reset selection
      this.render();
    });

    // List item select triggers
    this.querySelectorAll(".wordListItem").forEach((item: any) => {
      item.addEventListener("click", () => {
        this.selectedWordIndex = parseInt(item.getAttribute("data-idx") || "0");
        this.render();
      });
    });

    // TTS audio playback triggers on dictionary list items
    this.querySelectorAll(".dictListTtsBtn").forEach((btn: any) => {
      btn.addEventListener("click", (e: Event) => {
        e.stopPropagation();
        const wordToSpeak = btn.getAttribute("data-word");
        if (wordToSpeak && this.audio) {
          this.audio.speakFrench(wordToSpeak);
        }
      });
    });

    // Details action handlers
    this.querySelector("#speakWordBtn")?.addEventListener("click", () => {
      if (this.selectedWordIndex !== null) {
        const word = filteredDict[this.selectedWordIndex];
        this.audio.speakFrench(word.word);
      }
    });

    this.querySelector("#bookmarkWordBtn")?.addEventListener("click", () => {
      if (this.selectedWordIndex !== null) {
        const word = filteredDict[this.selectedWordIndex];
        this.db.addToRevisionDeck(word.word);
        this.db.addXp(5); // Small bookmark xp boost
        window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
      }
    });

    // Modal view handlers
    this.querySelector("#openFlashcardsBtn")?.addEventListener("click", () => {
      this.isFlashcardMode = true;
      this.flashcardIndex = 0;
      this.flashcardFlipped = false;
      this.flashcardMasteredCount = 0;
      this.flashcardReviewCount = 0;
      this.render();
    });

    this.querySelector("#exportAnkiCsvBtn")?.addEventListener("click", () => {
      const progress = this.db.getProgress();
      const content = (window as any).feheziko?.languageContent;
      const combinedDict = [...(content?.dictionary || []), ...this.customWords];
      
      const bookmarkedWords = progress.revisionDeck.map((item: any) => item.word);
      const wordsToExportSet = new Set([...bookmarkedWords, ...this.customWords.map((w: any) => w.word)]);
      
      const exportList: any[] = [];
      wordsToExportSet.forEach((wordStr: string) => {
        const found = combinedDict.find((item: any) => item.word.toLowerCase() === wordStr.toLowerCase());
        if (found) {
          exportList.push(found);
        } else {
          exportList.push({
            word: wordStr,
            translation: "N/A",
            definition: "Bookmarked word",
            type: "mot",
            phonetic: ""
          });
        }
      });

      if (exportList.length === 0) {
        alert(t.exportCSVError);
        return;
      }

      // Generate CSV content with UTF-8 BOM
      let csvContent = "\ufeff";
      csvContent += `"Front","Back","Type","Phonetic","Example"\n`;
      
      exportList.forEach((item: any) => {
        const front = item.word.replace(/"/g, '""');
        const backDesc = `${item.translation}${item.definition ? ` (${item.definition})` : ""}`;
        const back = backDesc.replace(/"/g, '""');
        const type = (item.type || "mot").replace(/"/g, '""');
        const phonetic = (item.phonetic || "").replace(/"/g, '""');
        const example = (item.example_fr || item.example || "").replace(/"/g, '""');
        
        csvContent += `"${front}","${back}","${type}","${phonetic}","${example}"\n`;
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `feheziko_anki_export_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    this.querySelector("#openAddModalBtn")?.addEventListener("click", () => {
      this.showAddModal = true;
      this.render();
    });

    this.querySelector("#modalCancelBtn")?.addEventListener("click", () => {
      this.showAddModal = false;
      this.render();
    });

    this.querySelector("#modalSaveBtn")?.addEventListener("click", () => {
      this.handleSaveCustomWord();
    });

    // Real-time IPA phonetic generation as user types
    if (this.showAddModal) {
      const wordIn = this.querySelector("#modalWordIn") as HTMLInputElement;
      const phoneticIn = this.querySelector("#modalPhoneticIn") as HTMLInputElement;
      if (wordIn && phoneticIn) {
        wordIn.addEventListener("input", () => {
          phoneticIn.value = this.generateFrenchIPA(wordIn.value);
        });
      }
    }
  }

  private renderFlashcardMode(t: any, filteredDict: any[], isMg: boolean, progress: any): string {
    if (filteredDict.length === 0) {
      return `
        <div class="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-4 max-w-lg mx-auto shadow-xs font-sans">
          <span class="text-5xl block">🎴</span>
          <h3 class="text-lg font-extrabold text-slate-800">${isMg ? "Tsy misy teny azo ampiasaina" : "Aucun mot disponible"}</h3>
          <p class="text-xs text-slate-500">${t.noResults}</p>
          <button id="exitFlashcardBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer">
            ${t.backToDict}
          </button>
        </div>
      `;
    }

    if (this.flashcardIndex >= filteredDict.length) {
      const total = filteredDict.length;
      return `
        <div class="bg-gradient-to-b from-indigo-50/70 to-white border border-indigo-100 rounded-3xl p-8 text-center space-y-6 max-w-xl mx-auto shadow-sm animate-fade-in font-sans">
          <div class="inline-flex p-4 rounded-3xl bg-indigo-600 text-white text-4xl shadow-md">
            🎉
          </div>
          <div class="space-y-1">
            <h3 class="text-2xl font-black text-slate-900 tracking-tight">${t.flashcardCompletedTitle}</h3>
            <p class="text-xs text-slate-500 font-medium">
              ${isMg ? `Nahavita nandinika teny ${total} ianao.` : `Vous avez révisé ${total} mots de vocabulaire avec succès.`}
            </p>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div class="bg-white border border-slate-200 rounded-2xl p-4 text-center">
              <span class="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Total</span>
              <span class="text-xl font-black font-mono text-slate-800 mt-1 block">${total}</span>
            </div>
            <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
              <span class="text-[10px] font-mono font-bold text-emerald-600 uppercase tracking-wider block">${t.masteredCount}</span>
              <span class="text-xl font-black font-mono text-emerald-700 mt-1 block">✅ ${this.flashcardMasteredCount}</span>
            </div>
            <div class="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
              <span class="text-[10px] font-mono font-bold text-rose-600 uppercase tracking-wider block">${t.reviewCount}</span>
              <span class="text-xl font-black font-mono text-rose-700 mt-1 block">⚠️ ${this.flashcardReviewCount}</span>
            </div>
          </div>

          <div class="flex items-center justify-center gap-3 pt-2">
            <button id="restartFlashcardsBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95">
              ${t.restartDeck}
            </button>
            <button id="exitFlashcardBtn" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer active:scale-95">
              ${t.backToDict}
            </button>
          </div>
        </div>
      `;
    }

    const currentWord = filteredDict[this.flashcardIndex];
    const progressPercent = Math.round(((this.flashcardIndex + 1) / filteredDict.length) * 100);
    const isFrontFr = this.flashcardFrontLanguage === "fr";

    const frontText = isFrontFr ? currentWord.word : currentWord.translation;
    const backText = isFrontFr ? currentWord.translation : currentWord.word;
    const frontLangTitle = isFrontFr ? (isMg ? "Teny frantsay" : "Mot en français") : (isMg ? "Dikan-teny malagasy" : "Traduction malagasy");
    const backLangTitle = isFrontFr ? (isMg ? "Dikan-teny malagasy" : "Traduction malagasy") : (isMg ? "Teny frantsay" : "Mot en français");
    const isBookmarked = progress.revisionDeck?.some((i: any) => i.word === currentWord.word);

    return `
      <div class="space-y-6 max-w-2xl mx-auto font-sans">
        
        <!-- Flashcard Control Header -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <button id="exitFlashcardBtn" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0">
              ${t.exitFlashcard}
            </button>

            <!-- Language Direction Toggle -->
            <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-mono font-bold">
              <button id="toggleFrontLangFrBtn" class="px-2.5 py-1 rounded-lg transition-all cursor-pointer ${isFrontFr ? "bg-white text-indigo-900 shadow-2xs font-extrabold" : "text-slate-500 hover:text-slate-800"}">
                ${t.frontFr}
              </button>
              <button id="toggleFrontLangMgBtn" class="px-2.5 py-1 rounded-lg transition-all cursor-pointer ${!isFrontFr ? "bg-white text-indigo-900 shadow-2xs font-extrabold" : "text-slate-500 hover:text-slate-800"}">
                ${t.frontMg}
              </button>
            </div>
          </div>

          <!-- Counter indicators -->
          <div class="flex items-center gap-3 text-xs font-mono font-bold w-full sm:w-auto justify-between sm:justify-end">
            <span class="text-slate-500">Mot <span class="text-indigo-600 font-black">${this.flashcardIndex + 1}</span> / ${filteredDict.length}</span>
            <span class="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">✅ ${this.flashcardMasteredCount}</span>
            <span class="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full">⚠️ ${this.flashcardReviewCount}</span>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
          <div class="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-300" style="width: ${progressPercent}%"></div>
        </div>

        <!-- Interactive Flashcard Stage -->
        <div class="relative min-h-[340px] flex items-center justify-center select-none">
          
          <!-- Floating Swipe Badges overlay -->
          <div id="swipeOverlayRight" class="absolute right-6 top-6 z-20 pointer-events-none opacity-0 transition-opacity bg-emerald-500 text-white font-black text-xs uppercase font-mono px-3.5 py-1.5 rounded-full shadow-lg border-2 border-white flex items-center gap-1">
            <span>👉 MAÎTRISÉ (+5 XP)</span>
          </div>
          <div id="swipeOverlayLeft" class="absolute left-6 top-6 z-20 pointer-events-none opacity-0 transition-opacity bg-rose-500 text-white font-black text-xs uppercase font-mono px-3.5 py-1.5 rounded-full shadow-lg border-2 border-white flex items-center gap-1">
            <span>👈 À REVOIR (SRS)</span>
          </div>

          <!-- Main Interactive Card -->
          <div id="flashcardElement" class="w-full cursor-grab active:cursor-grabbing bg-white border-2 ${this.flashcardFlipped ? "border-indigo-500 shadow-lg ring-4 ring-indigo-50" : "border-slate-200 shadow-md"} rounded-3xl p-6 md:p-8 text-center transition-all duration-200 relative overflow-hidden flex flex-col items-center justify-between min-h-[340px] space-y-4 touch-none">

            <!-- Card Header: Category & Controls -->
            <div class="w-full flex items-center justify-between text-xs border-b border-slate-100 pb-3">
              <span class="text-[10px] font-bold uppercase font-mono bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md">
                ${currentWord.type || "mot"}
              </span>

              <div class="flex items-center gap-2">
                <button id="cardSpeakBtn" class="w-9 h-9 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-base transition-transform active:scale-95 cursor-pointer" title="Écouter la prononciation">
                  🔊
                </button>
                <button id="cardBookmarkBtn" class="w-9 h-9 rounded-full border flex items-center justify-center text-xs transition-all cursor-pointer ${
                  isBookmarked
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white hover:bg-slate-50 text-slate-400 border-slate-200"
                }" title="Bookmark aux révisions SRS">
                  🔖
                </button>
              </div>
            </div>

            <!-- Card Content Body -->
            ${!this.flashcardFlipped ? `
              <!-- Front Side -->
              <div class="space-y-3 py-6 my-auto animate-fade-in w-full">
                <span class="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">${frontLangTitle}</span>
                <h2 class="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">${frontText}</h2>
                ${currentWord.phonetic ? `<p class="text-sm font-mono text-indigo-600 font-semibold mt-1">[ ${currentWord.phonetic} ]</p>` : ""}
                <div class="pt-4">
                  <span class="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3.5 py-1.5 rounded-full">
                    👆 ${t.flipHint}
                  </span>
                </div>
              </div>
            ` : `
              <!-- Back Side (Answer Revealed) -->
              <div class="space-y-4 py-3 my-auto animate-fade-in w-full text-left">
                <div class="text-center border-b border-indigo-100 pb-3">
                  <span class="text-[10px] font-mono font-bold text-indigo-500 uppercase tracking-widest block">${backLangTitle}</span>
                  <h2 class="text-2xl md:text-3xl font-black text-indigo-900 tracking-tight mt-0.5">${backText}</h2>
                </div>

                <div class="space-y-2">
                  <div>
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">${t.definition}</span>
                    <p class="text-xs font-semibold text-slate-800 leading-relaxed">${currentWord.definition || "Tsy misy famaritana."}</p>
                  </div>

                  ${(currentWord.example_fr || currentWord.example) ? `
                    <div class="bg-slate-50 border border-slate-200/80 p-3 rounded-xl text-xs space-y-1">
                      <span class="text-[9px] font-bold text-slate-400 uppercase font-mono block">${t.example}</span>
                      <p class="font-mono italic text-slate-700">"${currentWord.example_fr || currentWord.example}"</p>
                      <p class="text-slate-500">"${currentWord.example_mg || currentWord.example_translation || ""}"</p>
                    </div>
                  ` : ""}
                </div>
              </div>
            `}

            <!-- Card Bottom Footer Hint -->
            <div class="w-full text-center border-t border-slate-100 pt-3">
              <span class="text-[10px] text-slate-400 font-mono font-medium">
                👈 Glissez à gauche pour réviser | Glissez à droite si maîtrisé 👉
              </span>
            </div>
          </div>
        </div>

        <!-- Swipe & Action Buttons -->
        <div class="grid grid-cols-3 gap-3">
          <button id="swipeLeftBtn" class="bg-white hover:bg-rose-50 border-2 border-rose-200 text-rose-700 font-extrabold text-xs py-3 rounded-2xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95">
            ${t.swipeLeftLabel}
          </button>

          <button id="flipCardBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3 rounded-2xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95">
            🔄 ${this.flashcardFlipped ? "Masquer" : "Révéler"}
          </button>

          <button id="swipeRightBtn" class="bg-white hover:bg-emerald-50 border-2 border-emerald-200 text-emerald-700 font-extrabold text-xs py-3 rounded-2xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95">
            ${t.swipeRightLabel}
          </button>
        </div>

      </div>
    `;
  }

  private bindFlashcardEvents(filteredDict: any[], progress: any) {
    this.querySelector("#exitFlashcardBtn")?.addEventListener("click", () => {
      this.isFlashcardMode = false;
      this.render();
    });

    this.querySelector("#restartFlashcardsBtn")?.addEventListener("click", () => {
      this.flashcardIndex = 0;
      this.flashcardFlipped = false;
      this.flashcardMasteredCount = 0;
      this.flashcardReviewCount = 0;
      this.render();
    });

    this.querySelector("#toggleFrontLangFrBtn")?.addEventListener("click", () => {
      this.flashcardFrontLanguage = "fr";
      this.render();
    });

    this.querySelector("#toggleFrontLangMgBtn")?.addEventListener("click", () => {
      this.flashcardFrontLanguage = "mg";
      this.render();
    });

    const currentWord = filteredDict[this.flashcardIndex];

    this.querySelector("#cardSpeakBtn")?.addEventListener("click", () => {
      if (currentWord) {
        this.audio.speakFrench(currentWord.word);
      }
    });

    this.querySelector("#cardBookmarkBtn")?.addEventListener("click", () => {
      if (currentWord) {
        this.db.addToRevisionDeck(currentWord.word);
        this.db.addXp(5);
        this.render();
        window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
      }
    });

    this.querySelector("#flipCardBtn")?.addEventListener("click", () => {
      this.flashcardFlipped = !this.flashcardFlipped;
      this.render();
    });

    this.querySelector("#swipeLeftBtn")?.addEventListener("click", () => {
      this.handleFlashcardSwipe(false, filteredDict);
    });

    this.querySelector("#swipeRightBtn")?.addEventListener("click", () => {
      this.handleFlashcardSwipe(true, filteredDict);
    });

    // POINTER SWIPE DRAG INTERACTION
    const cardEl = this.querySelector("#flashcardElement") as HTMLElement;
    if (cardEl) {
      let startX = 0;
      let isDragging = false;
      const overlayRight = this.querySelector("#swipeOverlayRight") as HTMLElement;
      const overlayLeft = this.querySelector("#swipeOverlayLeft") as HTMLElement;

      cardEl.addEventListener("pointerdown", (e: PointerEvent) => {
        if ((e.target as HTMLElement).closest("button")) return;
        startX = e.clientX;
        isDragging = true;
        cardEl.setPointerCapture(e.pointerId);
      });

      cardEl.addEventListener("pointermove", (e: PointerEvent) => {
        if (!isDragging) return;
        const deltaX = e.clientX - startX;
        cardEl.style.transform = `translateX(${deltaX}px) rotate(${deltaX * 0.04}deg)`;

        if (deltaX > 40) {
          if (overlayRight) overlayRight.style.opacity = "1";
          if (overlayLeft) overlayLeft.style.opacity = "0";
        } else if (deltaX < -40) {
          if (overlayLeft) overlayLeft.style.opacity = "1";
          if (overlayRight) overlayRight.style.opacity = "0";
        } else {
          if (overlayRight) overlayRight.style.opacity = "0";
          if (overlayLeft) overlayLeft.style.opacity = "0";
        }
      });

      const endDrag = (e: PointerEvent) => {
        if (!isDragging) return;
        isDragging = false;
        const deltaX = e.clientX - startX;
        if (overlayRight) overlayRight.style.opacity = "0";
        if (overlayLeft) overlayLeft.style.opacity = "0";

        if (deltaX > 80) {
          this.handleFlashcardSwipe(true, filteredDict);
        } else if (deltaX < -80) {
          this.handleFlashcardSwipe(false, filteredDict);
        } else {
          cardEl.style.transform = "none";
          if (Math.abs(deltaX) < 10) {
            this.flashcardFlipped = !this.flashcardFlipped;
            this.render();
          }
        }
      };

      cardEl.addEventListener("pointerup", endDrag);
      cardEl.addEventListener("pointercancel", endDrag);
    }
  }

  private handleFlashcardSwipe(isMastered: boolean, filteredDict: any[]) {
    const currentWord = filteredDict[this.flashcardIndex];
    if (isMastered) {
      this.flashcardMasteredCount++;
      this.db.addXp(5);
    } else {
      this.flashcardReviewCount++;
      if (currentWord) {
        this.db.addToRevisionDeck(currentWord.word);
      }
    }
    this.flashcardFlipped = false;
    this.flashcardIndex++;
    this.render();
  }

  private handleSaveCustomWord() {
    const wordIn = this.querySelector("#modalWordIn") as HTMLInputElement;
    const transIn = this.querySelector("#modalTransIn") as HTMLInputElement;
    const defIn = this.querySelector("#modalDefIn") as HTMLTextAreaElement;
    const phoneticIn = this.querySelector("#modalPhoneticIn") as HTMLInputElement;

    if (wordIn && transIn && wordIn.value.trim() && transIn.value.trim()) {
      let rawPhonetic = phoneticIn ? phoneticIn.value.trim() : "";
      if (!rawPhonetic) {
        rawPhonetic = this.generateFrenchIPA(wordIn.value.trim());
      }
      // Ensure leading/trailing slashes for standard phonetic representation
      if (rawPhonetic && !rawPhonetic.startsWith("/")) {
        rawPhonetic = "/" + rawPhonetic;
      }
      if (rawPhonetic && !rawPhonetic.endsWith("/")) {
        rawPhonetic = rawPhonetic + "/";
      }

      const newWord = {
        word: wordIn.value.trim(),
        translation: transIn.value.trim(),
        definition: defIn ? defIn.value.trim() : "",
        type: "Pers.",
        isCustom: true,
        phonetic: rawPhonetic || "/.../"
      };
      this.customWords.push(newWord);
      this.saveCustomWords();
      this.showAddModal = false;
      this.searchQuery = ""; // Reset query to find it
      this.selectedWordIndex = this.customWords.length + ((window as any).feheziko?.languageContent?.dictionary.length || 0) - 1; // Highlight new
      
      // Gain XP for offline word creation
      this.db.addXp(15);
      
      this.render();
      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
    } else {
      alert("Fenoy ny teny frantsay sy dikan-teny malagasy azafady.");
    }
  }

  public generateFrenchIPA(word: string): string {
    let clean = word.toLowerCase().trim();
    if (!clean) return "";

    // Monosyllables or common short word hardcoding for absolute accuracy:
    const shortWords: Record<string, string> = {
      "le": "lə", "la": "la", "les": "le", "un": "œ̃", "une": "yn", "des": "de",
      "en": "ɑ̃", "y": "i", "et": "e", "est": "ɛ", "es": "ɛ", "du": "dy", "de": "də",
      "dans": "dɑ̃", "sur": "syʁ", "pour": "puʁ", "avec": "avɛk", "par": "paʁ",
      "mais": "mɛ", "ou": "u", "où": "u", "quand": "k\u0251\u0303", "que": "k\u0259", "qui": "ki",
      "plus": "ply", "pas": "pa", "tout": "tu", "tous": "tus", "nous": "nu",
      "vous": "vu", "ils": "il", "elles": "\u025bI", "je": "\u0292\u0259", "tu_pron": "ty",
      "il_pron": "il", "elle": "\u025bl", "on": "\u0254\u0303", "bonjour": "b\u0254\u0303\u0292u\u0281", "salut": "saly",
      "merci": "m\u025b\u0281si", "bon": "b\u0254\u0303", "bien": "bj\u025b\u0303", "chat": "\u0283a", "chien": "\u0283j\u025b\u0303",
      "temps": "t\u0251\u0303", "sans": "s\u0251\u0303", "dans_prep": "d\u0251\u0303", "fran\u00e7ais": "f\u0281\u0251\u0303s\u025b",
      "gasy": "gasi"
    };

    if (shortWords[clean]) {
      return `/${shortWords[clean]}/`;
    }

    let phonetic = clean;

    // Replace common multi-character combinations to unique symbols/phonemes
    phonetic = phonetic.replace(/gn/g, "\u0272");
    phonetic = phonetic.replace(/ph/g, "f");
    phonetic = phonetic.replace(/th/g, "t");
    phonetic = phonetic.replace(/ch/g, "\u0283");

    // Nasals combinations:
    phonetic = phonetic.replace(/ien$/g, "j\u025b\u0303");
    phonetic = phonetic.replace(/ien(\s)/g, "j\u025b\u0303$1");
    phonetic = phonetic.replace(/ion/g, "j\u0254\u0303");
    
    // an, am, en, em when not followed by a vowel or another m/n.
    phonetic = phonetic.replace(/(am|an|em|en)([^aeiouy\u00e9\u00e8\u00ea\u00e0\u00e2\u00f4\u00fb\u00eemn]|$)/g, "\u0251\u0303$2");
    
    // on, om
    phonetic = phonetic.replace(/(om|on)([^aeiouy\u00e9\u00e8\u00ea\u00e0\u00e2\u00f4\u00fb\u00eemn]|$)/g, "\u0254\u0303$2");
    
    // in, im, ain, aim, ein, eim, un, um
    phonetic = phonetic.replace(/(ain|aim|ein|eim)([^aeiouy\u00e9\u00e8\u00ea\u00e0\u00e2\u00f4\u00fb\u00eemn]|$)/g, "\u025b\u0303$2");
    phonetic = phonetic.replace(/(im|in)([^aeiouy\u00e9\u00e8\u00ea\u00e0\u00e2\u00f4\u00fb\u00eemn]|$)/g, "\u025b\u0303$2");
    phonetic = phonetic.replace(/(um|un)([^aeiouy\u00e9\u00e8\u00ea\u00e0\u00e2\u00f4\u00fb\u00eemn]|$)/g, "\u0153\u0303$2");

    // Verbs ending in -er, -ez -> e
    if (phonetic.endsWith("er") && phonetic.length > 3) {
      phonetic = phonetic.slice(0, -2) + "e";
    } else if (phonetic.endsWith("ez")) {
      phonetic = phonetic.slice(0, -2) + "e";
    }

    // Silent final consonants: -s, -t, -d, -g, -p, -x, -z
    if (phonetic.length > 3) {
      phonetic = phonetic.replace(/([aeiouy\u00e9\u00e8\u00ea\u00e0\u00e2\u00f4\u00fb\u00ee\u0153])(s|t|d|g|p|x|z)$/g, "$1");
    }

    // Silent final -es (plural) or -e
    phonetic = phonetic.replace(/es$/g, "");
    if (phonetic.length > 2) {
      phonetic = phonetic.replace(/e$/g, "");
    }

    // c before e, i, y -> s, else k
    phonetic = phonetic.replace(/c([eiy\u00e9\u00e8\u00ea])/g, "s$1");
    phonetic = phonetic.replace(/c/g, "k");
    phonetic = phonetic.replace(/\u00e7/g, "s");
    phonetic = phonetic.replace(/qu/g, "k");
    phonetic = phonetic.replace(/q/g, "k");

    // g before e, i, y -> \u0292, else g
    phonetic = phonetic.replace(/gu([aeiou\u00e9\u00e8\u00ea\u00e0\u00e2\u00f4\u00fb\u00ee])/g, "g$1");
    phonetic = phonetic.replace(/g([eiy\u00e9\u00e8\u00ea])/g, "\u0292$1");

    // Vowels combinations
    phonetic = phonetic.replace(/oi/g, "wa");
    phonetic = phonetic.replace(/ou/g, "u");
    phonetic = phonetic.replace(/(eau|au)/g, "o");
    phonetic = phonetic.replace(/(oeu|eu)/g, "\u00f8");
    phonetic = phonetic.replace(/(ai|ei)/g, "\u025b");
    phonetic = phonetic.replace(/ui/g, "\u0265i");
    phonetic = phonetic.replace(/ill/g, "j");
    phonetic = phonetic.replace(/ail$/g, "aj");
    phonetic = phonetic.replace(/eil$/g, "\u025bj");
    phonetic = phonetic.replace(/euil$/g, "\u0153j");
    phonetic = phonetic.replace(/\u0153il$/g, "\u0153j");

    // Single vowels
    phonetic = phonetic.replace(/\u00e9/g, "e");
    phonetic = phonetic.replace(/[\u00e8\u00ea\u00eb]/g, "\u025b");
    phonetic = phonetic.replace(/[\u00e0\u00e2\u00e4]/g, "a");
    phonetic = phonetic.replace(/[\u00f4\u00f6]/g, "o");
    phonetic = phonetic.replace(/[\u00fb\u00fc]/g, "y");
    phonetic = phonetic.replace(/[\u00ee\u00ef]/g, "i");
    
    phonetic = phonetic.replace(/u/g, "y");
    phonetic = phonetic.replace(/o/g, "\u0254");
    phonetic = phonetic.replace(/r/g, "\u0281");
    phonetic = phonetic.replace(/j/g, "\u0292");

    // Double consonants to single
    phonetic = phonetic.replace(/([bdfgklmnp\u0281stvz])\1+/g, "$1");

    // h is silent
    phonetic = phonetic.replace(/h/g, "");

    // x -> ks
    phonetic = phonetic.replace(/x/g, "ks");

    // final silent e cleanup
    phonetic = phonetic.replace(/e$/g, "");

    if (!phonetic) phonetic = clean;

    return `/${phonetic}/`;
  }
}

customElements.define("fz-dictionary", FzDictionary);
