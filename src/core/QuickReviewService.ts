import { phoneticsService } from "./PhoneticsService";

export interface ReviewItem {
  word: string;
  translationMg: string;
  translationFr: string;
  phonetic?: string;
  example?: string;
  lessonTitle?: string;
}

export class QuickReviewService {
  private static instance: QuickReviewService;
  private streak: number = 0;

  public static getInstance(): QuickReviewService {
    if (!QuickReviewService.instance) {
      QuickReviewService.instance = new QuickReviewService();
    }
    return QuickReviewService.instance;
  }

  private getDb(): any {
    return (window as any).feheziko?.db;
  }

  private getAudio(): any {
    return (window as any).feheziko?.audio;
  }

  /**
   * Gather all vocabulary and phrases from completed lessons (or fallback to all lessons)
   */
  public getAllReviewItems(): ReviewItem[] {
    const content = (window as any).feheziko?.languageContent;
    if (!content || !content.levels) return [];

    const db = this.getDb();
    const progress = db?.getProgress() || { completedLessons: [], accessibility: { language: "mg" } };
    const completedSet = new Set(progress.completedLessons || []);
    
    const items: ReviewItem[] = [];
    const seenWords = new Set<string>();

    content.levels.forEach((lvl: any) => {
      (lvl.lessons || []).forEach((les: any) => {
        const isCompleted = completedSet.has(les.id);
        const vocab = les.content?.vocabulary || [];
        
        vocab.forEach((v: any) => {
          if (v && v.word && !seenWords.has(v.word.toLowerCase().trim())) {
            seenWords.add(v.word.toLowerCase().trim());
            // Only add completed or prioritize completed
            if (completedSet.size === 0 || isCompleted || items.length < 15) {
              items.push({
                word: v.word,
                translationMg: v.translation_mg || v.translation || "",
                translationFr: v.translation_fr || v.translation || "",
                phonetic: v.phonetic,
                example: v.example,
                lessonTitle: les.title || les.id
              });
            }
          }
        });
      });
    });

    return items;
  }

  /**
   * Open the Quick Review Interactive Modal
   */
  public openQuickReviewModal(onCloseCallback?: () => void): void {
    const items = this.getAllReviewItems();
    if (items.length === 0) return;

    const db = this.getDb();
    const progress = db?.getProgress() || { accessibility: { language: "mg" } };
    const isMg = progress.accessibility?.language === "mg";

    // Remove existing modal if any
    const existingModal = document.getElementById("fz-quick-review-modal");
    if (existingModal) existingModal.remove();

    // Create container
    const modal = document.createElement("div");
    modal.id = "fz-quick-review-modal";
    modal.className = "fixed inset-0 z-[90] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-sans";

    document.body.appendChild(modal);

    let streakCount = this.streak;

    const pickRandomQuestion = () => {
      const currentItem = items[Math.floor(Math.random() * items.length)];
      
      // Determine mode randomly: 0 = FR->Translation, 1 = Translation->FR, 2 = Audio Listen
      const mode = Math.floor(Math.random() * 3);

      // Generate 3 distractors
      const otherItems = items.filter(i => i.word !== currentItem.word);
      const shuffledOthers = [...otherItems].sort(() => 0.5 - Math.random());
      const distractors = shuffledOthers.slice(0, 3);

      const correctAnswerText = mode === 1 ? currentItem.word : (isMg ? currentItem.translationMg : currentItem.translationFr);
      
      const options = [currentItem, ...distractors]
        .map(i => mode === 1 ? i.word : (isMg ? i.translationMg : i.translationFr))
        .sort(() => 0.5 - Math.random());

      return {
        item: currentItem,
        mode,
        correctAnswerText,
        options
      };
    };

    let q = pickRandomQuestion();

    const renderCard = () => {
      const { item, mode, correctAnswerText, options } = q;
      const targetTranslation = isMg ? item.translationMg : item.translationFr;

      let promptTitle = "";
      let promptContent = "";

      if (mode === 0) {
        promptTitle = isMg ? "Inona no dikan'ity teny frantsay ity?" : "Que signifie ce mot en français ?";
        promptContent = `<div class="text-3xl font-black text-white tracking-tight font-mono text-center my-2">${item.word}</div>
          ${item.phonetic ? `<div class="text-xs font-mono text-amber-300 text-center bg-slate-800/80 py-0.5 px-2.5 rounded-md font-bold w-fit mx-auto border border-amber-400/20">[${item.phonetic}]</div>` : ""}`;
      } else if (mode === 1) {
        promptTitle = isMg ? "Ahoana no ilazana ity teny ity amin'ny teny Frantsay?" : "Comment dit-on ceci en français ?";
        promptContent = `<div class="text-2xl font-black text-indigo-300 tracking-tight text-center my-2">"${targetTranslation}"</div>`;
      } else {
        promptTitle = isMg ? "Mihainoa tsara ary fidio ny dikan'ny feo neno" : "Écoutez attentivement et choisissez le sens";
        promptContent = `
          <div class="flex flex-col items-center justify-center my-3">
            <button id="quick-review-audio-play-btn" class="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 hover:from-indigo-500 hover:to-violet-400 text-white flex items-center justify-center text-2xl shadow-xl transition-transform active:scale-95 cursor-pointer animate-pulse">
              🔊
            </button>
            <span class="text-[11px] text-slate-400 mt-2 font-mono">${isMg ? "Tsindrio raha hanoina indray" : "Cliquez pour réécouter"}</span>
          </div>
        `;
      }

      const phoneticDetail = phoneticsService.getWordDetail(item.word);

      modal.innerHTML = `
        <div class="bg-slate-900 border border-slate-700 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative flex flex-col gap-5 overflow-hidden">
          <!-- Top bar header -->
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black shadow-xs flex items-center gap-1">
                <span>⚡</span> ${isMg ? "Famerenana Haingana" : "Quick Review"}
              </span>
              <span class="text-xs font-bold text-slate-400 flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700">
                <span>🔥</span> <span class="text-amber-400 font-black">${streakCount}</span>
              </span>
            </div>
            <button id="fz-qr-close-btn" class="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all cursor-pointer">✕</button>
          </div>

          <!-- Question prompt -->
          <div class="bg-slate-950/90 rounded-2xl p-4 border border-slate-800 flex flex-col items-center justify-center text-center">
            <span class="text-[11px] font-bold uppercase tracking-wider text-indigo-400">${promptTitle}</span>
            ${promptContent}
          </div>

          <!-- Options grid -->
          <div id="fz-qr-options-container" class="grid grid-cols-1 gap-2.5">
            ${options.map(opt => `
              <button class="fz-qr-option-btn bg-slate-800 hover:bg-indigo-900/60 border border-slate-700 hover:border-indigo-500/60 rounded-2xl p-3.5 text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between group active:scale-98" data-option="${opt.replace(/"/g, '&quot;')}">
                <span>${opt}</span>
                <span class="text-slate-500 group-hover:text-indigo-400 transition-colors text-sm">➔</span>
              </button>
            `).join('')}
          </div>

          <!-- Feedback & Result Area -->
          <div id="fz-qr-feedback-box" class="hidden flex flex-col gap-3 rounded-2xl p-4 animate-fade-in"></div>

          <!-- Action Footer -->
          <div id="fz-qr-footer-actions" class="hidden flex items-center gap-2">
            <button id="fz-qr-next-btn" class="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold py-3 px-4 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95">
              <span>${isMg ? "Teny manaraka" : "Question suivante"}</span>
              <span>➔</span>
            </button>
          </div>
        </div>
      `;

      // Auto-play audio on prompt if mode is audio or mode 0
      if (mode === 2 || mode === 0) {
        setTimeout(() => this.getAudio()?.speakFrench(item.word), 200);
      }

      // Bind audio button
      modal.querySelector("#quick-review-audio-play-btn")?.addEventListener("click", () => {
        this.getAudio()?.speakFrench(item.word);
      });

      // Bind close button
      modal.querySelector("#fz-qr-close-btn")?.addEventListener("click", () => {
        modal.remove();
        if (onCloseCallback) onCloseCallback();
      });

      // Bind options click
      modal.querySelectorAll(".fz-qr-option-btn").forEach((btn: any) => {
        btn.addEventListener("click", () => {
          const selected = btn.getAttribute("data-option");
          const isCorrect = selected === correctAnswerText;

          // Speak French word
          this.getAudio()?.speakFrench(item.word);

          // Disable options
          modal.querySelectorAll(".fz-qr-option-btn").forEach((b: any) => {
            b.disabled = true;
            b.classList.remove("hover:bg-indigo-900/60", "cursor-pointer");
            const optVal = b.getAttribute("data-option");
            if (optVal === correctAnswerText) {
              b.classList.add("bg-emerald-950/80", "border-emerald-500", "text-emerald-200");
            } else if (optVal === selected && !isCorrect) {
              b.classList.add("bg-rose-950/80", "border-rose-500", "text-rose-200");
            } else {
              b.classList.add("opacity-40");
            }
          });

          const feedbackBox = modal.querySelector("#fz-qr-feedback-box") as HTMLElement;
          const footerActions = modal.querySelector("#fz-qr-footer-actions") as HTMLElement;

          if (feedbackBox && footerActions) {
            feedbackBox.classList.remove("hidden");
            footerActions.classList.remove("hidden");

            if (isCorrect) {
              streakCount++;
              this.streak = streakCount;
              this.getDb()?.addXp(5);

              feedbackBox.className = "flex flex-col gap-2 rounded-2xl p-4 animate-fade-in bg-emerald-950/70 border border-emerald-500/40 text-emerald-200";
              feedbackBox.innerHTML = `
                <div class="flex items-center gap-2">
                  <span class="text-xl">✨</span>
                  <div>
                    <div class="font-extrabold text-xs text-emerald-300">${isMg ? "Mabosaka ! Marina tsara (+5 XP)" : "Excellent ! Bonne réponse (+5 XP)"}</div>
                    <div class="text-[11px] text-emerald-200/90 font-mono mt-0.5">${item.word} = ${targetTranslation}</div>
                  </div>
                </div>
              `;
            } else {
              streakCount = 0;
              this.streak = 0;
              this.getDb()?.recordMistake(item.word, targetTranslation);

              feedbackBox.className = "flex flex-col gap-2 rounded-2xl p-4 animate-fade-in bg-rose-950/70 border border-rose-500/40 text-rose-200";
              
              const tipMsg = phoneticDetail ? (isMg ? phoneticDetail.tipMg : phoneticDetail.tipFr) : "";

              feedbackBox.innerHTML = `
                <div class="flex items-start gap-2">
                  <span class="text-xl">⚠️</span>
                  <div class="flex-1">
                    <div class="font-extrabold text-xs text-rose-300">${isMg ? "Tsy izany no izy..." : "Pas tout à fait..."}</div>
                    <div class="text-[11px] text-slate-200 mt-1">
                      <strong>${isMg ? "Valiny marina:" : "Bonne réponse:"}</strong> <span class="font-bold text-amber-300 font-mono">${correctAnswerText}</span>
                    </div>
                    ${tipMsg ? `
                      <div class="mt-2 text-[10px] bg-slate-900/90 p-2 rounded-xl border border-rose-400/20 text-slate-300 leading-normal">
                        <strong>🎙️ ${isMg ? "Soso-kevitra fanononana:" : "Conseil d'articulation:"}</strong> ${tipMsg}
                      </div>
                    ` : ""}
                  </div>
                </div>
              `;
            }
          }

          modal.querySelector("#fz-qr-next-btn")?.addEventListener("click", () => {
            q = pickRandomQuestion();
            renderCard();
          });
        });
      });
    };

    renderCard();
  }
}

export const quickReviewService = QuickReviewService.getInstance();
