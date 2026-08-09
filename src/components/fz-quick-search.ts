/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseEngine } from "../core/DatabaseEngine";
import { AudioEngine } from "../core/AudioEngine";

export class FzQuickSearch extends HTMLElement {
  private db!: DatabaseEngine;
  private audio!: AudioEngine;

  private isOpen: boolean = false;
  private searchQuery: string = "";
  private selectedIndex: number = 0;
  private customWords: any[] = [];

  private handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl+K or Cmd+K shortcut
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      this.toggleModal();
      return;
    }

    if (!this.isOpen) return;

    if (e.key === "Escape") {
      e.preventDefault();
      this.closeModal();
      return;
    }

    const results = this.getSearchResults();

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length > 0) {
        this.selectedIndex = (this.selectedIndex + 1) % results.length;
        this.renderModalContentOnly();
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length > 0) {
        this.selectedIndex = (this.selectedIndex - 1 + results.length) % results.length;
        this.renderModalContentOnly();
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (results.length > 0 && results[this.selectedIndex]) {
        this.selectWordAndNavigate(results[this.selectedIndex].word);
      }
      return;
    }
  };

  private handleOpenEvent = () => {
    this.openModal();
  };

  constructor() {
    super();
  }

  connectedCallback() {
    this.db = (window as any).feheziko?.db;
    this.audio = (window as any).feheziko?.audio;
    this.loadCustomWords();

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("feheziko_open_quick_search", this.handleOpenEvent);

    this.render();
  }

  disconnectedCallback() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("feheziko_open_quick_search", this.handleOpenEvent);
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

  public openModal() {
    this.isOpen = true;
    this.searchQuery = "";
    this.selectedIndex = 0;
    this.loadCustomWords();
    this.render();

    setTimeout(() => {
      const input = this.querySelector("#quickSearchModalInput") as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }, 50);
  }

  public closeModal() {
    this.isOpen = false;
    this.render();
  }

  public toggleModal() {
    if (this.isOpen) {
      this.closeModal();
    } else {
      this.openModal();
    }
  }

  private getSearchResults(): any[] {
    if (!this.db) return [];
    return this.db.searchLocalDictionary(this.searchQuery, this.customWords);
  }

  private selectWordAndNavigate(word: string) {
    this.closeModal();
    if ((window as any).feheziko?.navigate) {
      (window as any).feheziko.navigate("dictionary");
    }
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("feheziko_select_dictionary_word", { detail: word }));
    }, 100);
  }

  private playSound(word: string, e?: Event) {
    if (e) e.stopPropagation();
    if (this.audio) {
      this.audio.speakFrench(word);
    }
  }

  private renderModalContentOnly() {
    const resultsContainer = this.querySelector("#quickSearchResultsList");
    const previewContainer = this.querySelector("#quickSearchPreviewPane");
    
    if (!resultsContainer || !previewContainer) {
      this.render();
      return;
    }

    const results = this.getSearchResults();
    const progress = this.db?.getProgress();
    const isMg = progress?.accessibility?.language === "mg";

    // Update results list HTML
    resultsContainer.innerHTML = this.renderResultsListHtml(results, isMg);
    previewContainer.innerHTML = this.renderPreviewPaneHtml(results[this.selectedIndex], isMg);

    this.attachDynamicListeners();
  }

  private renderResultsListHtml(results: any[], isMg: boolean): string {
    if (results.length === 0) {
      return `
        <div class="p-8 text-center text-slate-400 dark:text-slate-500 font-medium space-y-2">
          <div class="text-3xl">🔍</div>
          <p class="text-xs font-semibold">
            ${isMg ? "Tsy nisy teny hita amin'io karoka io." : "Aucun résultat trouvé pour cette recherche."}
          </p>
        </div>
      `;
    }

    return results
      .slice(0, 15)
      .map((item, idx) => {
        const isSelected = idx === this.selectedIndex;
        return `
          <div data-idx="${idx}" class="quickSearchItem cursor-pointer p-3 rounded-xl transition-all border ${
            isSelected
              ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20"
              : "bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700/80"
          } flex items-center justify-between gap-2">
            <div class="min-w-0 flex-1">
              <div class="flex items-center space-x-2">
                <span class="font-extrabold text-sm truncate">${item.word}</span>
                <span class="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                  isSelected
                    ? "bg-indigo-700 text-indigo-100"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                }">${item.type || "n."}</span>
              </div>
              <p class="text-xs ${isSelected ? "text-indigo-100" : "text-slate-500 dark:text-slate-400"} truncate mt-0.5">${item.translation}</p>

              <!-- Priority Badges -->
              <div class="flex flex-wrap gap-1 mt-1.5">
                ${
                  item.isMistake
                    ? `<span class="${isSelected ? "bg-rose-900/90 text-rose-100" : "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300"} text-[9px] font-black px-1.5 py-0.2 rounded">⚠️ ${isMg ? "Erreur" : "Erreur"}</span>`
                    : ""
                }
                ${
                  item.isCompletedLesson
                    ? `<span class="${isSelected ? "bg-emerald-900/90 text-emerald-100" : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"} text-[9px] font-black px-1.5 py-0.2 rounded">✅ ${isMg ? "Lesona" : "Leçon"}</span>`
                    : ""
                }
                ${
                  item.isBookmarked
                    ? `<span class="${isSelected ? "bg-indigo-900/90 text-indigo-100" : "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300"} text-[9px] font-black px-1.5 py-0.2 rounded">🔖 SRS</span>`
                    : ""
                }
              </div>
            </div>

            <button class="quickPlayBtn p-1.5 rounded-lg ${isSelected ? "bg-indigo-700 hover:bg-indigo-800 text-white" : "bg-white dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200"} text-xs transition-transform active:scale-90 shadow-2xs" data-word="${item.word}">
              🔊
            </button>
          </div>
        `;
      })
      .join("");
  }

  private renderPreviewPaneHtml(item: any, isMg: boolean): string {
    if (!item) {
      return `
        <div class="h-full flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 p-6 space-y-2">
          <div class="text-4xl opacity-50">📘</div>
          <p class="text-xs font-semibold">
            ${isMg ? "Mifidiana teny amin'ny havia mba hahitana ny antsipiriany" : "Sélectionnez un mot à gauche pour afficher ses détails."}
          </p>
        </div>
      `;
    }

    return `
      <div class="space-y-4">
        <div>
          <div class="flex items-center justify-between">
            <h3 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">${item.word}</h3>
            <button id="quickSearchPlayMainBtn" class="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-sm font-bold border border-indigo-200/80 dark:border-indigo-800/80 transition-all active:scale-95 flex items-center gap-1.5" data-word="${item.word}">
              <span>🔊</span>
              <span class="text-xs font-mono font-bold">${item.phonetic || "/.../"}</span>
            </button>
          </div>
          <p class="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1">${item.translation}</p>
        </div>

        ${
          item.isMistake
            ? `
            <div class="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-800 dark:text-rose-300 font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>${isMg ? "Erreur récente à travailler en priorité!" : "Erreur récente identifiée lors de vos exercices!"}</span>
            </div>
            `
            : ""
        }

        ${
          item.isCompletedLesson
            ? `
            <div class="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-2">
              <span>✅</span>
              <span>${isMg ? `Azo tao amin'ny lesona : "${item.completedLessonTitle || ""}"` : `Appris dans la leçon : "${item.completedLessonTitle || ""}"`}</span>
            </div>
            `
            : ""
        }

        <div class="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
          <span class="text-[10px] font-mono font-black uppercase text-slate-400 tracking-wider block">
            ${isMg ? "Famaritana sy Ohatra" : "Définition & Exemples"}
          </span>
          <p class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
            ${item.definition || item.translation}
          </p>
          ${
            item.example
              ? `
              <div class="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/90 text-xs text-slate-800 dark:text-slate-200 italic space-y-1">
                <p class="font-bold">"${item.example}"</p>
                ${item.exampleTranslation ? `<p class="text-slate-500 dark:text-slate-400 not-italic font-normal">→ ${item.exampleTranslation}</p>` : ""}
              </div>
              `
              : ""
          }
        </div>

        <div class="pt-3 border-t border-slate-200 dark:border-slate-800">
          <button id="quickSearchOpenInDictBtn" class="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer" data-word="${item.word}">
            <span>📖</span>
            <span>${isMg ? "Sokafy ao amin'ny Rakibolana" : "Ouvrir dans le Dictionnaire"}</span>
          </button>
        </div>
      </div>
    `;
  }

  private attachDynamicListeners() {
    this.querySelectorAll(".quickSearchItem").forEach((el: any) => {
      el.addEventListener("click", () => {
        const idx = parseInt(el.getAttribute("data-idx") || "0", 10);
        this.selectedIndex = idx;
        this.renderModalContentOnly();
      });
    });

    this.querySelectorAll(".quickPlayBtn").forEach((btn: any) => {
      btn.addEventListener("click", (e: Event) => {
        e.stopPropagation();
        const word = btn.getAttribute("data-word");
        if (word) this.playSound(word, e);
      });
    });

    this.querySelector("#quickSearchPlayMainBtn")?.addEventListener("click", (e: Event) => {
      const btn = e.currentTarget as HTMLElement;
      const word = btn.getAttribute("data-word");
      if (word) this.playSound(word, e);
    });

    this.querySelector("#quickSearchOpenInDictBtn")?.addEventListener("click", (e: Event) => {
      const btn = e.currentTarget as HTMLElement;
      const word = btn.getAttribute("data-word");
      if (word) this.selectWordAndNavigate(word);
    });
  }

  private render() {
    if (!this.isOpen) {
      this.innerHTML = "";
      return;
    }

    const progress = this.db?.getProgress();
    const isMg = progress?.accessibility?.language === "mg";
    const results = this.getSearchResults();

    this.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-slate-900/65 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in">
        <!-- Modal Backdrop Click Handler -->
        <div id="quickSearchBackdrop" class="absolute inset-0"></div>

        <!-- Main Modal Box -->
        <div class="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh] z-10 animate-scale-up">
          <!-- Header Search Input Bar -->
          <div class="p-3.5 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50/80 dark:bg-slate-900/80">
            <span class="text-lg text-slate-400 dark:text-slate-500">🔍</span>
            <input 
              id="quickSearchModalInput" 
              type="text" 
              value="${this.searchQuery}" 
              placeholder="${isMg ? "Karohy teny, fomba fiteny na dikanteny..." : "Rechercher un mot, expression ou traduction..."}" 
              class="flex-1 bg-transparent border-0 text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-0" 
            />
            
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="hidden sm:inline-block px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-mono font-bold shadow-2xs">Ctrl + K</span>
              <button id="quickSearchCloseBtn" class="p-2 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer">
                ✕
              </button>
            </div>
          </div>

          <!-- Body: Two-column layout (Results List + Live Preview) -->
          <div class="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 min-h-0">
            <!-- Results Column -->
            <div id="quickSearchResultsList" class="md:col-span-5 p-3 overflow-y-auto space-y-2 max-h-[320px] md:max-h-none">
              ${this.renderResultsListHtml(results, isMg)}
            </div>

            <!-- Detail Preview Pane Column -->
            <div id="quickSearchPreviewPane" class="md:col-span-7 p-5 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/40">
              ${this.renderPreviewPaneHtml(results[this.selectedIndex], isMg)}
            </div>
          </div>

          <!-- Footer Shortcut Bar -->
          <div class="p-3 bg-slate-100/80 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 flex-wrap gap-2">
            <div class="flex items-center gap-3">
              <span class="flex items-center gap-1"><span class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-bold text-[10px]">↑↓</span> ${isMg ? "Hifindra" : "Naviguer"}</span>
              <span class="flex items-center gap-1"><span class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-bold text-[10px]">↵</span> ${isMg ? "Sokafy" : "Sélectionner"}</span>
              <span class="flex items-center gap-1"><span class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-bold text-[10px]">ESC</span> ${isMg ? "Hakatona" : "Fermer"}</span>
            </div>

            <div class="flex items-center gap-1.5 font-sans font-bold text-indigo-600 dark:text-indigo-400">
              <span>⚡ Feheziko Quick Search</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Static event handlers for shell elements
    this.querySelector("#quickSearchBackdrop")?.addEventListener("click", () => this.closeModal());
    this.querySelector("#quickSearchCloseBtn")?.addEventListener("click", () => this.closeModal());

    this.querySelector("#quickSearchModalInput")?.addEventListener("input", (e: Event) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.selectedIndex = 0;
      this.renderModalContentOnly();
    });

    this.attachDynamicListeners();
  }
}

customElements.define("fz-quick-search", FzQuickSearch);
