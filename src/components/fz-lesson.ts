/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseEngine } from "../core/DatabaseEngine";
import { LearningEngine } from "../core/LearningEngine";
import { AudioEngine } from "../core/AudioEngine";
import { GameEngine } from "../core/GameEngine";
import { phoneticsService } from "../core/PhoneticsService";
import { quickReviewService } from "../core/QuickReviewService";

export class FzLesson extends HTMLElement {
  private db!: DatabaseEngine;
  private learning!: LearningEngine;
  private audio!: AudioEngine;
  private game!: GameEngine;

  private currentLesson: any = null;
  private connectionError: string | null = null;
  private activeStep: "intro" | "vocab" | "quiz" | "complete" = "intro";
  private vocabIndex: number = 0;
  private quizIndex: number = 0;
  private selectedQuizAnswer: string | null = null;
  private quizChecked: boolean = false;
  private quizCorrect: boolean = false;
  private lessonMistakes: number = 0;
  private lessonMistakesLogged: boolean = false;

  // Focus Mode state & helper
  private isFocusMode: boolean = false;

  private handleFocusKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && this.isFocusMode) {
      e.preventDefault();
      this.toggleFocusMode(false);
    }
  };

  public toggleFocusMode(forced?: boolean) {
    this.isFocusMode = typeof forced === "boolean" ? forced : !this.isFocusMode;
    document.body.classList.toggle("feheziko-focus-mode-active", this.isFocusMode);
    this.render();
  }

  // Mistakes Quiz Mode states
  private isMistakesQuizActive: boolean = false;
  private mistakesQuizIndex: number = 0;
  private mistakesQuizItems: any[] = [];
  private mistakesQuizFlipped: boolean = false;
  private mistakesQuizChecked: boolean = false;
  private mistakesQuizSelectedAnswer: string | null = null;
  private mistakesQuizCorrect: boolean = false;
  private mistakesQuizScore: number = 0;

  private recording: boolean = false;
  private micScoreResult: any = null;
  private interimTranscription: string = "";
  private cachingIds: string[] = [];
  private isBatchSyncing: boolean = false;
  private batchSyncTotal: number = 0;
  private batchSyncCurrent: number = 0;

  // Leave a Note (Voice Memos) states
  private lessonVoiceMemos: any[] = [];
  private memoRecording: boolean = false;
  private memoMediaRecorder: MediaRecorder | null = null;
  private memoAudioChunks: Blob[] = [];
  private memoRecordingDuration: number = 0;
  private memoAudioContext: AudioContext | null = null;
  private memoVolumeInterval: any = null;
  private memoTimer: any = null;
  private memoTitleInput: string = "";
  private playingMemoId: string | null = null;
  private currentPlayingAudio: HTMLAudioElement | null = null;
  private memoPlaybackSpeed: number = 1.0;
  private memoCurrentTime: number = 0;
  private memoDuration: number = 0;
  private memoProgressPercent: number = 0;
  private memoPlayInterval: any = null;
  private lastPracticeAudioBlob: Blob | null = null;
  private memoToastMessage: string = "";

  // Waveform Comparison states
  private nativeWaveform: number[] = [];
  private userWaveform: number[] = [];
  private recordingWaveform: number[] = [];
  private timingGaps: number[] = [];
  private prosodyMismatches: number[] = [];
  private recordingTimer: any = null;
  private handleVoiceActivity: ((e: any) => void) | null = null;

  private handleDocumentClick = (e: MouseEvent) => {
    const tooltip = document.getElementById("fz-phonetic-tooltip");
    if (
      tooltip &&
      !tooltip.contains(e.target as Node) &&
      !(e.target as HTMLElement).closest(".fz-phonetic-highlight")
    ) {
      tooltip.remove();
    }
  };

  constructor() {
    super();
  }

  connectedCallback() {
    this.db = (window as any).feheziko?.db;
    this.learning = (window as any).feheziko?.learning;
    this.audio = (window as any).feheziko?.audio;
    this.game = (window as any).feheziko?.game;
    this.preloadFavoritesAudio();
    this.render();

    window.addEventListener("feheziko_state_changed", () => {
      this.preloadFavoritesAudio();
      this.render();
    });

    document.addEventListener("click", this.handleDocumentClick);
    window.addEventListener("keydown", this.handleFocusKeyDown);

    this.handleVoiceActivity = (e: any) => {
      const { active } = e.detail;
      const isMg = this.db && this.db.getProgress()?.accessibility?.language === "mg";
      const vadDot = this.querySelector("#vadDot");
      const vadText = this.querySelector("#vadText");
      const vadIndicator = this.querySelector("#vadIndicator");
      if (vadDot && vadText && vadIndicator) {
        if (active) {
          vadDot.classList.remove("bg-slate-500");
          vadDot.classList.add("bg-emerald-500", "animate-pulse");
          
          vadIndicator.classList.remove("bg-slate-800", "text-slate-400", "border-slate-700");
          vadIndicator.classList.add("bg-emerald-950/40", "border-emerald-500/30", "text-emerald-400");
          
          vadText.textContent = isMg ? "RENY NY FEONAO (VOIX CAPTÉE)" : "VOIX DETECTÉE (CAPTÉE)";
        } else {
          vadDot.classList.add("bg-slate-500");
          vadDot.classList.remove("bg-emerald-500", "animate-pulse");
          
          vadIndicator.classList.add("bg-slate-800", "text-slate-400", "border-slate-700");
          vadIndicator.classList.remove("bg-emerald-950/40", "border-emerald-500/30", "text-emerald-400");
          
          vadText.textContent = isMg ? "MIANDRY FEONY..." : "ATTENTE DE LA VOIX...";
        }
      }
    };
    window.addEventListener("feheziko_voice_activity", this.handleVoiceActivity);
  }

  private preloadFavoritesAudio() {
    if (!this.db || !this.audio) return;
    const content = (window as any).feheziko?.languageContent;
    if (!content) return;

    const bookmarkedLessons: any[] = [];
    content.levels.forEach((lvl: any) => {
      lvl.lessons.forEach((les: any) => {
        if (this.db.isLessonBookmarked(les.id)) {
          bookmarkedLessons.push(les);
        }
      });
    });

    if (this.audio && typeof this.audio.preloadFavoriteLessonsAudio === "function") {
      try {
        this.audio.preloadFavoriteLessonsAudio(bookmarkedLessons);
      } catch (err) {
        console.warn("Could not preload favorite lessons audio:", err);
      }
    }
  }

  disconnectedCallback() {
    document.body.classList.remove("feheziko-focus-mode-active");
    window.removeEventListener("keydown", this.handleFocusKeyDown);
    document.removeEventListener("click", this.handleDocumentClick);
    const tooltip = document.getElementById("fz-phonetic-tooltip");
    if (tooltip) tooltip.remove();
    this.stopPlayingMemo();
    if (this.memoTimer) {
      clearInterval(this.memoTimer);
    }
    if (this.handleVoiceActivity) {
      window.removeEventListener("feheziko_voice_activity", this.handleVoiceActivity);
    }
  }

  private async loadLessonVoiceMemos(lessonId: string) {
    try {
      this.lessonVoiceMemos = await this.db.getVoiceMemos(lessonId);
    } catch (e) {
      console.error("Error loading voice memos for lesson:", e);
      this.lessonVoiceMemos = [];
    }
  }

  private async startMemoRecording() {
    const isMg = this.db.getProgress().accessibility.language === "mg";
    const isComplete = this.activeStep === "complete";
    
    // Retrieve title or set default based on step
    let defaultTitle = isComplete 
      ? (isMg ? `Fandinihana: ${this.currentLesson.title}` : `Réflexion: ${this.currentLesson.title}`)
      : `Memo #${this.lessonVoiceMemos.length + 1}`;
    
    const inputEl = this.querySelector("#memoTitleInput") as HTMLInputElement;
    this.memoTitleInput = inputEl?.value?.trim() || defaultTitle;
    this.memoAudioChunks = [];
    this.memoRecordingDuration = 0;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.memoMediaRecorder = new MediaRecorder(stream);
      
      this.memoMediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.memoAudioChunks.push(e.data);
        }
      };

      this.memoMediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.memoAudioChunks, { type: "audio/webm" });
        const title = this.memoTitleInput.trim() || defaultTitle;
        
        await this.db.saveVoiceMemo(this.currentLesson.id, title, audioBlob);
        this.memoTitleInput = "";
        
        // Refresh memos list
        await this.loadLessonVoiceMemos(this.currentLesson.id);
        this.render();
      };

      this.memoMediaRecorder.start();
      this.memoRecording = true;

      // Start the beautiful AudioEngine voice-wave overlay
      const overlayText = isComplete 
        ? (isMg ? "Fandinihana momba ny lesona" : "Réflexion sur la leçon") 
        : this.memoTitleInput;
      this.audio.showGlobalWaveOverlay(overlayText);

      // Initialize real-time voice volume analysis
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        try {
          const actx = new AudioContextClass();
          this.memoAudioContext = actx;
          const source = actx.createMediaStreamSource(stream);
          const analyser = actx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          let vadThreshold = 5;
          try {
            const progress = this.db.getProgress();
            if (progress.accessibility && typeof progress.accessibility.vadThreshold === "number") {
              vadThreshold = progress.accessibility.vadThreshold;
            }
          } catch (e) {}

          this.memoVolumeInterval = setInterval(() => {
            if (!this.memoRecording) return;
            analyser.getByteTimeDomainData(dataArray);
            let instantDev = 0;
            for (let i = 0; i < bufferLength; i++) {
              const dev = Math.abs(dataArray[i] - 128);
              if (dev > instantDev) instantDev = dev;
            }
            const active = instantDev >= vadThreshold;
            this.audio.updateGlobalWaveOverlay(instantDev, active);
          }, 50);
        } catch (analyzerError) {
          console.warn("Could not start real-time volume analyzer for memo:", analyzerError);
        }
      }

      this.memoTimer = setInterval(() => {
        this.memoRecordingDuration++;
        this.render();
      }, 1000);

      this.render();
    } catch (e) {
      console.error("Failed to access microphone for memo:", e);
      alert(isMg 
        ? "Tsy afaka nihaino ny mikrôfo ho an'ny fanamarihana: " + e 
        : "Impossible d'accéder au micro pour le mémo : " + e
      );
    }
  }

  private stopMemoRecording() {
    if (this.memoMediaRecorder && this.memoMediaRecorder.state !== "inactive") {
      this.memoMediaRecorder.stop();
      this.memoMediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    if (this.memoTimer) {
      clearInterval(this.memoTimer);
      this.memoTimer = null;
    }
    if (this.memoVolumeInterval) {
      clearInterval(this.memoVolumeInterval);
      this.memoVolumeInterval = null;
    }
    if (this.memoAudioContext) {
      this.memoAudioContext.close().catch(() => {});
      this.memoAudioContext = null;
    }
    this.audio.hideGlobalWaveOverlay();
    
    this.memoRecording = false;
    this.render();
  }

  private async playMemo(id: string) {
    if (this.playingMemoId === id) {
      if (this.currentPlayingAudio) {
        if (this.currentPlayingAudio.paused) {
          this.currentPlayingAudio.play().catch(err => console.error(err));
          this.startMemoProgressTimer();
        } else {
          this.currentPlayingAudio.pause();
          this.stopMemoProgressTimer();
        }
        this.render();
      }
      return;
    }

    this.stopPlayingMemo();

    const memo = this.lessonVoiceMemos.find((m: any) => m.id === id);
    if (memo && memo.audioBlob) {
      const url = URL.createObjectURL(memo.audioBlob);
      const audio = new Audio(url);
      this.currentPlayingAudio = audio;
      this.playingMemoId = id;
      audio.playbackRate = this.memoPlaybackSpeed;

      audio.onloadedmetadata = () => {
        this.memoDuration = audio.duration || 0;
        this.render();
      };

      audio.onended = () => {
        this.stopPlayingMemo();
      };

      try {
        await audio.play();
        this.startMemoProgressTimer();
      } catch (err) {
        console.error("Playback failed", err);
        this.stopPlayingMemo();
      }

      this.render();
    }
  }

  private startMemoProgressTimer() {
    this.stopMemoProgressTimer();
    this.memoPlayInterval = setInterval(() => {
      if (this.currentPlayingAudio) {
        this.memoCurrentTime = this.currentPlayingAudio.currentTime || 0;
        this.memoDuration = this.currentPlayingAudio.duration || 0;
        this.memoProgressPercent = this.memoDuration > 0 
          ? (this.memoCurrentTime / this.memoDuration) * 100 
          : 0;
        this.render();
      }
    }, 100);
  }

  private stopMemoProgressTimer() {
    if (this.memoPlayInterval) {
      clearInterval(this.memoPlayInterval);
      this.memoPlayInterval = null;
    }
  }

  private stopPlayingMemo() {
    this.stopMemoProgressTimer();
    if (this.currentPlayingAudio) {
      this.currentPlayingAudio.pause();
      this.currentPlayingAudio = null;
    }
    this.playingMemoId = null;
    this.memoCurrentTime = 0;
    this.memoDuration = 0;
    this.memoProgressPercent = 0;
    this.render();
  }

  private formatTime(secs: number): string {
    if (isNaN(secs) || !isFinite(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  }

  private getWaveformBars(memoId: string): number[] {
    const barCount = 32;
    const heights: number[] = [];
    const seed = memoId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    for (let i = 0; i < barCount; i++) {
      const envelope = Math.sin((i / (barCount - 1)) * Math.PI);
      const variation = Math.sin(i * 1.8 + seed) * 0.3 + Math.cos(i * 0.7 + seed * 1.5) * 0.2;
      const height = Math.max(15, Math.min(90, Math.round((0.4 + variation) * envelope * 100)));
      heights.push(height);
    }
    return heights;
  }

  private async deleteMemo(id: string) {
    this.stopPlayingMemo();
    await this.db.deleteVoiceMemo(id);
    await this.loadLessonVoiceMemos(this.currentLesson.id);
    this.render();
  }

  private render() {
    if (!this.db || !this.learning || !this.audio) return;

    if (this.isMistakesQuizActive) {
      this.renderMistakesQuiz();
    } else if (this.currentLesson) {
      this.renderLessonPlayer();
    } else {
      this.renderLessonsList();
    }
  }

  private renderMistakesQuiz() {
    const progress = this.db.getProgress();
    const isMg = progress.accessibility.language === "mg";
    const total = this.mistakesQuizItems.length;
    const index = this.mistakesQuizIndex;
    const isComplete = index >= total;

    // Inject styles for the 3D flippable flashcard
    let stylesHtml = `
      <style>
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        .flashcard-inner {
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .flashcard-flipped {
          transform: rotateY(180deg);
        }
      </style>
    `;

    if (total === 0) {
      this.innerHTML = `
        ${stylesHtml}
        <div class="max-w-xl mx-auto space-y-6">
          <div class="bg-white rounded-3xl p-8 border border-slate-200/60 shadow-xl text-center space-y-4">
            <span class="text-6xl animate-bounce inline-block">🎉</span>
            <h3 class="text-2xl font-extrabold text-slate-800">
              ${isMg ? "Tsy misy fahadisoana taloha!" : "Aucune erreur récente !"}
            </h3>
            <p class="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              ${isMg 
                ? "Arahabaina! Voafehinao tsara ny lesona rehetra nataonao hatreto. Tohizo hatrany ny ezaka!" 
                : "Félicitations ! Vous maîtrisez parfaitement les leçons effectuées jusqu'à présent. Continuez ainsi !"}
            </p>
            <button id="exitMistakesQuizBtn" class="mt-4 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md">
              ${isMg ? "Hiverina amin'ny lesona" : "Retour aux leçons"}
            </button>
          </div>
        </div>
      `;
      this.querySelector("#exitMistakesQuizBtn")?.addEventListener("click", () => {
        this.isMistakesQuizActive = false;
        this.render();
      });
      return;
    }

    if (isComplete) {
      const bonusXp = this.mistakesQuizScore * 5 + 10;
      this.innerHTML = `
        ${stylesHtml}
        <div class="max-w-xl mx-auto space-y-6 animate-fade-in">
          <div class="bg-white rounded-3xl p-8 border border-slate-200/60 shadow-xl text-center space-y-6">
            <span class="text-6xl inline-block animate-bounce">🏆</span>
            <h3 class="text-3xl font-extrabold text-slate-900 tracking-tight">
              ${isMg ? "Fitsapana Voavaha!" : "Révision Terminée !"}
            </h3>
            <p class="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              ${isMg 
                ? `Nahitsy soa aman-tsara ianao! Nahavita fanontaniana <strong>${this.mistakesQuizScore}</strong> tamin'ny <strong>${total}</strong> ianao androany.` 
                : `Super révision ! Vous avez corrigé <strong>${this.mistakesQuizScore}</strong> erreurs sur <strong>${total}</strong> aujourd'hui.`}
            </p>

            <div class="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 max-w-xs mx-auto flex items-center justify-between font-mono text-xs">
              <span class="text-indigo-800 font-bold">${isMg ? "Fivoarana (Gain) :" : "Gain d'expérience :"}</span>
              <span class="text-indigo-700 font-extrabold">+${bonusXp} XP ⭐</span>
            </div>

            <button id="finishMistakesQuizBtn" class="w-full max-w-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-md">
              ${isMg ? "Hamita sy hianatra hafa ✓" : "Terminer et continuer ✓"}
            </button>
          </div>
        </div>
      `;

      // Trigger badges confetti if element exists
      try {
        const badgesEl = document.querySelector("fz-badges");
        if (badgesEl && typeof (badgesEl as any).celebratePerfectLesson === "function") {
          (badgesEl as any).celebratePerfectLesson();
        } else {
          // Fallback to custom simple window celebration event
          window.dispatchEvent(new CustomEvent("feheziko_lesson_perfected"));
        }
      } catch (err) {
        console.warn("Could not trigger badges element confetti:", err);
      }

      this.querySelector("#finishMistakesQuizBtn")?.addEventListener("click", () => {
        this.db.addXp(bonusXp);
        this.isMistakesQuizActive = false;
        this.render();
      });
      return;
    }

    const item = this.mistakesQuizItems[index];
    const progressPercent = Math.round((index / total) * 100);

    // Check if it has custom multiple-choice options
    const hasOptions = Array.isArray(item.options) && item.options.length > 0;

    let quizContentHtml = "";

    if (hasOptions) {
      quizContentHtml = `
        <div class="space-y-6">
          <div class="flex items-center space-x-2.5">
            <span class="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-full border border-indigo-100 uppercase tracking-wider">
              ${isMg ? "Fitsapana ny Fahadisoana" : "Quiz de Révision"}
            </span>
          </div>

          <h3 class="text-lg md:text-xl font-bold text-slate-800 leading-snug">
            ${item.prompt || item.word}
          </h3>

          <div class="grid grid-cols-1 gap-3 mt-4">
            ${item.options!.map((opt: string) => {
              const isSelected = this.mistakesQuizSelectedAnswer === opt;
              let optStyle = "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/10";
              
              if (isSelected) {
                optStyle = "border-indigo-600 bg-indigo-50/70 text-indigo-950 font-semibold ring-2 ring-indigo-500/10";
              }

              if (this.mistakesQuizChecked) {
                if (opt === item.answer) {
                  optStyle = "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/15";
                } else if (isSelected) {
                  optStyle = "border-rose-500 bg-rose-50 text-rose-950 font-bold ring-2 ring-rose-500/15";
                } else {
                  optStyle = "border-slate-100 bg-slate-50 opacity-40";
                }
              }

              const indicator = this.mistakesQuizChecked
                ? (opt === item.answer ? "🟢" : isSelected ? "🔴" : "⚪")
                : (isSelected ? "🔵" : "⚪");

              return `
                <button class="mistakesQuizOptionBtn w-full text-left p-4 rounded-xl border transition-all duration-150 flex items-center justify-between ${optStyle}" data-option="${opt}" ${this.mistakesQuizChecked ? "disabled" : ""}>
                  <span class="font-medium text-xs sm:text-sm text-slate-700">${opt}</span>
                  <span class="text-base">${indicator}</span>
                </button>
              `;
            }).join("")}
          </div>

          ${this.mistakesQuizChecked ? `
            <div class="p-4 rounded-xl flex items-center space-x-3 border ${this.mistakesQuizCorrect ? "bg-emerald-50 border-emerald-100 text-emerald-900" : "bg-rose-50 border-rose-100 text-rose-900"} animate-fade-in">
              <span class="text-xl">${this.mistakesQuizCorrect ? "🎉" : "❌"}</span>
              <div class="flex-1">
                <h4 class="font-bold text-xs">${this.mistakesQuizCorrect ? (isMg ? "Tsara dia tsara!" : "Excellent !") : (isMg ? "Hafa indray..." : "À réviser...")}</h4>
                <p class="text-[10px] text-slate-500 mt-0.5">${this.mistakesQuizCorrect ? (isMg ? "Voavaha soa aman-tsara!" : "Vous avez corrigé cette erreur !") : `${isMg ? 'Valiny marina:' : 'La réponse correcte était :'} <strong>${item.answer}</strong>`}</p>
              </div>
            </div>
          ` : ""}

          <div class="flex items-center space-x-3 pt-4 border-t border-slate-100">
            ${!this.mistakesQuizChecked ? `
              <button id="mistakesQuizCheckBtn" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-40" ${!this.mistakesQuizSelectedAnswer ? "disabled" : ""}>
                ${isMg ? "Hanamarina" : "Vérifier"}
              </button>
            ` : `
              <button id="mistakesQuizNextBtn" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md cursor-pointer animate-pulse">
                ${isMg ? "Manaraka" : "Suivant"} →
              </button>
            `}
          </div>
        </div>
      `;
    } else {
      quizContentHtml = `
        <div class="space-y-6">
          <div class="flex justify-between items-center gap-2">
            <span class="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-full border border-indigo-100 uppercase tracking-wider">
              ${isMg ? "Karatra tadidy" : "Carte Mémoire (Flashcard)"}
            </span>
            <div class="flex items-center gap-2">
              <div class="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200/50">
                <button class="audioSpeedBtn px-2 py-0.5 rounded-full text-[9px] font-bold transition-all cursor-pointer ${this.audio.getPlaybackSpeed() === 0.5 ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}" data-speed="0.5">0.5x</button>
                <button class="audioSpeedBtn px-2 py-0.5 rounded-full text-[9px] font-bold transition-all cursor-pointer ${this.audio.getPlaybackSpeed() === 0.75 ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}" data-speed="0.75">0.75x</button>
                <button class="audioSpeedBtn px-2 py-0.5 rounded-full text-[9px] font-bold transition-all cursor-pointer ${this.audio.getPlaybackSpeed() === 1.0 ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}" data-speed="1.0">1.0x</button>
              </div>
              <button id="mistakesQuizSpeakBtn" class="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-full transition-colors cursor-pointer text-sm font-bold flex items-center gap-1" title="${isMg ? "Haino teny" : "Écouter"}">
                <span>🔊</span>
                <span class="text-[10px] font-mono tracking-wider">Haino</span>
              </button>
            </div>
          </div>

          <!-- 3D Card Container -->
          <div id="flashcard3DContainer" class="w-full h-56 perspective-1000 cursor-pointer">
            <div class="flashcard-inner relative w-full h-full transform-style-3d border border-slate-200 rounded-2xl shadow-md ${this.mistakesQuizFlipped ? 'flashcard-flipped' : ''}">
              
              <!-- Front Side -->
              <div class="absolute inset-0 w-full h-full backface-hidden bg-white hover:bg-slate-50/50 p-6 flex flex-col justify-between items-center text-center rounded-2xl">
                <div class="my-auto space-y-3">
                  <p class="text-[10px] text-slate-400 font-semibold tracking-wide uppercase font-mono">${isMg ? "TENY FRANTSAY (FRANÇAIS)" : "MOT EN FRANÇAIS"}</p>
                  <h4 class="text-2xl font-black text-indigo-950 tracking-tight leading-snug">${item.word}</h4>
                </div>
                <p class="text-[10px] text-slate-400 italic font-medium">${isMg ? "Tsindrio ny karatra mba hihodinany" : "Cliquez sur la carte pour la retourner"}</p>
              </div>

              <!-- Back Side (Rotated 180 deg) -->
              <div class="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-gradient-to-br from-indigo-900 to-slate-950 text-white p-6 flex flex-col justify-between items-center text-center rounded-2xl">
                <div class="my-auto space-y-3">
                  <p class="text-[10px] text-indigo-300 font-bold tracking-wide uppercase font-mono">${isMg ? "DIKAN-TENY (MALAGASY)" : "TRADUCTION EN MALGACHE"}</p>
                  <h4 class="text-xl font-black text-amber-300 tracking-tight leading-snug">${item.translation}</h4>
                </div>
                <div class="w-full flex items-center justify-center gap-2">
                  <span class="text-[9px] text-indigo-200 bg-white/15 px-3 py-1 rounded-full font-mono">${isMg ? "Fihodinana vita!" : "Dos de la carte"}</span>
                </div>
              </div>

            </div>
          </div>

          <!-- Self Evaluation Buttons -->
          ${!this.mistakesQuizFlipped ? `
            <div class="flex justify-center">
              <button id="mistakesQuizFlipBtn" class="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-all shadow-md">
                🔄 ${isMg ? "Ahodina ny karatra" : "Retourner la carte"}
              </button>
            </div>
          ` : `
            <div class="space-y-4 animate-fade-in">
              <p class="text-center text-[11px] font-semibold text-slate-500">
                ${isMg ? "Tadidinao tsara ve ny dikany?" : "Aviez-vous trouvé la bonne réponse ?"}
              </p>
              <div class="grid grid-cols-2 gap-3">
                <button id="mistakesSelfFailBtn" class="bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2">
                  ❌ ${isMg ? "Mbola tsy tadidy" : "Pas encore"}
                </button>
                <button id="mistakesSelfPassBtn" class="bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2">
                  ✅ ${isMg ? "Tadidy tsara!" : "Oui, trouvé !"}
                </button>
              </div>
            </div>
          `}
        </div>
      `;
    }

    this.innerHTML = `
      ${stylesHtml}
      <div class="max-w-xl mx-auto space-y-6">
        <!-- Header & Progress bar -->
        <div class="flex items-center justify-between">
          <button id="exitMistakesQuizBtn" class="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center space-x-1 transition-colors">
            <span>✕</span>
            <span>${isMg ? "Hiala fitsapana" : "Quitter"}</span>
          </button>

          <div class="flex items-center space-x-2.5 w-1/2 justify-end">
            <div class="flex-1 h-3 bg-slate-100 rounded-full relative border border-slate-200/50 shadow-inner overflow-hidden">
              <div class="h-full bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full transition-all duration-350 ease-out" style="width: ${progressPercent}%"></div>
            </div>
            <span class="text-[10px] font-black font-mono text-indigo-950">${index}/${total}</span>
          </div>
        </div>

        <!-- Card Container with Elegant visual depth -->
        <div class="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/60 shadow-xl shadow-slate-100/30">
          ${quizContentHtml}
        </div>
      </div>
    `;

    // EVENT BINDINGS
    this.querySelector("#exitMistakesQuizBtn")?.addEventListener("click", () => {
      this.isMistakesQuizActive = false;
      this.render();
    });

    if (hasOptions) {
      this.querySelectorAll(".mistakesQuizOptionBtn").forEach((btn: any) => {
        btn.addEventListener("click", () => {
          if (!this.mistakesQuizChecked) {
            this.mistakesQuizSelectedAnswer = btn.getAttribute("data-option");
            this.render();
          }
        });
      });

      this.querySelector("#mistakesQuizCheckBtn")?.addEventListener("click", () => {
        if (this.mistakesQuizSelectedAnswer) {
          this.mistakesQuizChecked = true;
          this.mistakesQuizCorrect = this.mistakesQuizSelectedAnswer === item.answer;
          if (this.mistakesQuizCorrect) {
            this.mistakesQuizScore++;
            // Remove mistake from list as successfully corrected!
            this.db.removeMistake(item.id);
          }
          this.render();
        }
      });

      this.querySelector("#mistakesQuizNextBtn")?.addEventListener("click", () => {
        this.mistakesQuizIndex++;
        this.mistakesQuizChecked = false;
        this.mistakesQuizSelectedAnswer = null;
        this.mistakesQuizCorrect = false;
        this.render();
      });
    } else {
      this.querySelector("#flashcard3DContainer")?.addEventListener("click", () => {
        this.mistakesQuizFlipped = !this.mistakesQuizFlipped;
        this.render();
      });

      this.querySelector("#mistakesQuizFlipBtn")?.addEventListener("click", () => {
        this.mistakesQuizFlipped = true;
        this.render();
      });

      this.querySelector("#mistakesQuizSpeakBtn")?.addEventListener("click", (e: Event) => {
        e.stopPropagation();
        this.audio.speakFrench(item.word);
      });

      this.querySelector("#mistakesSelfFailBtn")?.addEventListener("click", () => {
        this.mistakesQuizIndex++;
        this.mistakesQuizFlipped = false;
        this.render();
      });

      this.querySelector("#mistakesSelfPassBtn")?.addEventListener("click", () => {
        this.mistakesQuizScore++;
        this.db.removeMistake(item.id); // Remove mistake from database since corrected!
        this.mistakesQuizIndex++;
        this.mistakesQuizFlipped = false;
        this.render();
      });
    }

    // Bind speed control buttons
    this.querySelectorAll(".audioSpeedBtn").forEach((btn: any) => {
      btn.addEventListener("click", (e: Event) => {
        e.stopPropagation();
        const speedVal = parseFloat(btn.getAttribute("data-speed") || "1.0");
        this.audio.setPlaybackSpeed(speedVal);
        this.render(); // Refreshes the mistakes quiz to show active speed state
      });
    });
  }

  /**
   * Screen: Lessons Selection List
   */
  private renderLessonsList() {
    const progress = this.db.getProgress();
    const content = (window as any).feheziko?.languageContent;
    if (!content) return;

    const isMg = progress.accessibility.language === "mg";
    const isOnline = navigator.onLine;

    const t = isMg ? {
      title: "Ny fandaharam-pianarana (Leçons disponibles)",
      subtitle: "Fidio ny lesona mifanaraka amin'ny dingana misy anao.",
      completed: "Efa vita",
      start: "Hanomboka (Démarrer)",
      locked: "Voahidy kely aloha (Bloqué)",
      cached: "Mandeha offline",
      notCached: "Tehirizina offline",
      caching: "Mampiditra...",
      offlineWarning: "Tsy misy internet nefa tsy mbola voatahiry ity lesona ity.",
      offlinePlay: "Hianatra offline",
      deleteCache: "Fafao amin'ny cache"
    } : {
      title: "Programme d'apprentissage",
      subtitle: "Choisissez une leçon adaptée à votre progression.",
      completed: "Complété",
      start: "Démarrer",
      locked: "Verrouillé",
      cached: "Prêt offline",
      notCached: "Sauvegarder offline",
      caching: "Mise en cache...",
      offlineWarning: "Hors-ligne et leçon non disponible.",
      offlinePlay: "Étudier hors-ligne",
      deleteCache: "Supprimer du cache"
    };

    const textClass = progress.accessibility.textSize === "large" ? "text-base" : 
                      progress.accessibility.textSize === "extra" ? "text-lg" : "text-sm";

    // Find recent mistakes from DatabaseEngine
    const recentMistakes = this.db.getRecentMistakes();

    // Find all bookmarked lessons
    const bookmarkedLessons: any[] = [];
    content.levels.forEach((lvl: any) => {
      lvl.lessons.forEach((les: any) => {
        if (this.db.isLessonBookmarked(les.id)) {
          bookmarkedLessons.push(les);
        }
      });
    });

    let html = `
      ${this.isFocusMode ? `
        <!-- Screen Dimming Overlay -->
        <div id="focusModeBackdrop" class="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-30 transition-all animate-fade-in cursor-pointer" title="${isMg ? "Tsindrio na tsindrio ESC mba hivoaka am-pilaminana" : "Cliquez ou appuyez sur ESC pour quitter"}"></div>

        <!-- Floating Focus Mode Top Control Bar -->
        <div class="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-indigo-500/40 shadow-2xl flex items-center gap-3 sm:gap-6 text-xs font-mono">
          <div class="flex items-center gap-2">
            <span class="relative flex h-2.5 w-2.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span class="font-black text-indigo-200 tracking-wider uppercase text-[11px]">🎯 FOCUS MODE</span>
          </div>

          <button id="exitFocusModeTopBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-xl text-[11px] font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5">
            <span>✕</span>
            <span>${isMg ? "Akatona (ESC)" : "Quitter Focus (ESC)"}</span>
          </button>
        </div>
      ` : ""}

      <div class="space-y-6 ${this.isFocusMode ? 'relative z-40 bg-white/90 dark:bg-slate-900/90 p-6 rounded-3xl backdrop-blur-lg border border-indigo-500/20 shadow-2xl' : ''}">
        <!-- Connection Error Banner -->
        ${this.connectionError ? `
          <div class="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 flex items-center justify-between shadow-xs animate-fade-in mb-4">
            <div class="flex items-center space-x-3">
              <span class="text-xl">⚠️</span>
              <div>
                <p class="text-xs font-bold">${isMg ? "Mila fidirana Internet" : "Connexion Internet requise"}</p>
                <p class="text-[11px] text-rose-600 mt-0.5">${this.connectionError}</p>
              </div>
            </div>
            <button id="dismissConnectionErrorBtn" class="text-xs text-rose-400 hover:text-rose-600 font-black px-2.5 py-1.5 rounded-xl hover:bg-rose-100/50 transition-colors cursor-pointer focus:outline-none">✕</button>
          </div>
        ` : ""}

        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 class="text-2xl font-bold text-slate-800">${t.title}</h2>
            <p class="text-xs text-slate-500 mt-1">${t.subtitle}</p>
          </div>
          <div class="flex items-center gap-2">
            <button id="quickReviewBtn" class="text-xs font-extrabold transition-all flex items-center space-x-1.5 cursor-pointer px-4 py-2 rounded-2xl text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md active:scale-95" title="${isMg ? "Fitsapana haingana ny teny nianarana" : "Micro-test rapide du vocabulaire appris"}">
              <span class="text-xs animate-bounce">⚡</span>
              <span>${isMg ? "Famerenana Haingana" : "Révision Rapide"}</span>
            </button>
            <button id="toggleFocusModeGridBtn" class="text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer px-3.5 py-2 rounded-2xl ${this.isFocusMode ? "bg-indigo-600 text-white shadow-xs" : "text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs"}" title="${this.isFocusMode ? (isMg ? "Hakatona ny Mode Focus" : "Quitter le Mode Focus") : (isMg ? "Mode Focus" : "Mode Focus")}">
              <span class="text-xs">🎯</span>
              <span>${this.isFocusMode ? (isMg ? "Hakatona Focus" : "Quitter Focus") : (isMg ? "Mode Focus" : "Mode Focus")}</span>
            </button>
          </div>
        </div>

        <!-- Personalized Mistakes Quiz Section -->
        <div class="bg-gradient-to-r from-amber-50 to-orange-50/40 border border-amber-200 rounded-3xl p-5 md:p-6 space-y-4 shadow-xs relative overflow-hidden">
          <div class="absolute right-4 top-4 text-5xl opacity-10 font-black font-sans select-none">🎯</div>
          <div class="flex items-start space-x-3.5">
            <span class="text-2xl mt-0.5">🎯</span>
            <div class="space-y-1">
              <h3 class="text-base font-extrabold text-amber-950">${isMg ? "Fitsapana ny Fahadisoanao (Quiz)" : "Renforcez vos Faiblesses"}</h3>
              <p class="text-xs text-amber-900/85 leading-relaxed">
                ${isMg
                  ? "Hizaro amin'ireo teny sy fanontaniana diso taloha ianao amin'ny alàlan'ny karatra mifandray sy quiz."
                  : "Révisez vos erreurs passées avec des cartes mémoires interactives et des quiz personnalisés."}
              </p>
              <div class="flex items-center gap-2 mt-1">
                <span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200/40">
                  ${recentMistakes.length} ${isMg ? "fahadisoana voatahiry" : "erreurs enregistrées"}
                </span>
                ${recentMistakes.length > 0 ? `
                  <span class="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                    ✨ +5 XP ${isMg ? "isan'ny valiny" : "par bonne réponse"}
                  </span>
                ` : ""}
              </div>
            </div>
          </div>
          
          <div class="flex flex-wrap gap-3 pt-1">
            ${recentMistakes.length > 0 ? `
              <button id="startMistakesQuizBtn" class="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-amber-100 cursor-pointer flex items-center gap-1.5">
                <span>🚀</span>
                <span>${isMg ? "Hanomboka ny Fitsapana" : "Démarrer la révision"}</span>
              </button>
              <button id="clearMistakesBtn" class="px-3.5 py-2.5 bg-white/80 hover:bg-white text-slate-600 hover:text-rose-650 border border-slate-200 hover:border-rose-200 text-xs font-bold rounded-xl transition-all cursor-pointer">
                🗑️ ${isMg ? "Fafao rehetra" : "Tout effacer"}
              </button>
            ` : `
              <button class="px-5 py-2.5 bg-slate-100 text-slate-400 text-xs font-bold rounded-xl cursor-not-allowed flex items-center gap-1.5 border border-slate-200" disabled>
                <span>🔒</span>
                <span>${isMg ? "Tsy misy fahadisoana" : "Pas d'erreurs"}</span>
              </button>
            `}
          </div>
        </div>

        <!-- Favorites Section if any exist -->
        ${bookmarkedLessons.length > 0 ? `
          <div class="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-5 space-y-4 shadow-xs">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex items-center space-x-2">
                <span class="text-xl">🔖</span>
                <div>
                  <h3 class="text-base font-extrabold text-indigo-900">${isMg ? "Ny Lesona Tianao (Favoris)" : "Vos Leçons Favorites"}</h3>
                  <p class="text-[11px] text-indigo-700/80">${isMg ? "Ireo lesona nosafidianao ho tianao indrindra ho an'ny fidirana haingana." : "Accès rapide aux leçons que vous avez marquées comme favorites."}</p>
                </div>
              </div>

              <!-- Sync All Favorites Button -->
              ${isOnline ? `
                <button id="syncAllFavoritesBtn" class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-[11px] font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer" ${this.isBatchSyncing ? "disabled" : ""}>
                  <span>🔄</span>
                  <span>${isMg ? "Ampitahao offline ny tiana rehetra" : "Tout synchroniser offline"}</span>
                </button>
              ` : ""}
            </div>

            <!-- Batch Syncing Progress Bar -->
            ${this.isBatchSyncing ? `
              <div class="bg-white border border-indigo-100 rounded-2xl p-4 space-y-2">
                <div class="flex justify-between items-center text-xs">
                  <span class="text-indigo-950 font-bold flex items-center gap-1.5 font-mono">
                    <span class="inline-block animate-spin text-indigo-600">🔄</span>
                    ${isMg ? `Mampiditra lesona tiana offline (${this.batchSyncCurrent}/${this.batchSyncTotal})...` : `Mise en cache des favoris (${this.batchSyncCurrent}/${this.batchSyncTotal})...`}
                  </span>
                  <span class="font-mono font-black text-indigo-600 text-[13px]">${Math.round((this.batchSyncCurrent / this.batchSyncTotal) * 100)}%</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-3 border border-indigo-50 overflow-hidden relative p-0.5">
                  <div class="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out" style="width: ${Math.round((this.batchSyncCurrent / this.batchSyncTotal) * 100)}%"></div>
                </div>
              </div>
            ` : ""}
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              ${bookmarkedLessons.map(les => {
                const isCompleted = progress.completedLessons.includes(les.id);
                const isCached = this.db.isLessonCached(les.id);
                const isCaching = this.cachingIds.includes(les.id);
                const isBookmarked = this.db.isLessonBookmarked(les.id);
                
                return `
                  <div class="bg-white border border-indigo-100/80 hover:border-indigo-300 p-4 rounded-2xl transition-all shadow-xs flex flex-col justify-between">
                    <div>
                      <div class="flex justify-between items-center">
                        <div class="flex items-center space-x-1.5">
                          <button data-id="${les.id}" class="bookmarkToggleBtn text-base transition-all hover:scale-110 active:scale-95 cursor-pointer" title="${isBookmarked ? "Fafao" : "Tehirizo"}">
                            🔖
                          </button>
                          <span class="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded font-mono">+${les.xp} XP</span>
                          ${isCompleted ? `<span class="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-100">✓</span>` : ""}
                        </div>
                        
                        <!-- Caching Button -->
                        <button data-id="${les.id}" data-action="${isCached ? "uncache" : "cache"}" class="cacheToggleBtn flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold font-mono transition-all border ${
                          isCaching
                            ? "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
                            : isCached
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100"
                        }">
                          <span>${isCaching ? "⏳" : isCached ? "💾" : "⬇️"}</span>
                        </button>
                      </div>
                      
                      <h4 class="font-bold text-slate-800 text-sm mt-2 leading-snug">${les.title}</h4>
                    </div>
                    
                    ${!isOnline && !isCached ? `
                      <div class="mt-3 p-2 bg-rose-50 border border-rose-100 rounded-xl text-center">
                        <p class="text-[9px] text-rose-700 font-bold leading-tight">${t.offlineWarning}</p>
                      </div>
                    ` : `
                      <button data-id="${les.id}" class="startLessonBtn mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] py-2 rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1">
                        <span>🚀</span>
                        <span>${t.start}</span>
                      </button>
                    `}
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        ` : ""}

        <div class="space-y-8">
    `;

    content.levels.forEach((lvl: any) => {
      html += `
        <div class="space-y-4">
          <div class="border-b border-slate-200 pb-2">
            <h3 class="text-lg font-extrabold text-slate-800">${lvl.title}</h3>
            <p class="text-xs text-slate-500 mt-0.5">${lvl.description}</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      `;

      lvl.lessons.forEach((les: any) => {
        const isCompleted = progress.completedLessons.includes(les.id);
        const isCached = this.db.isLessonCached(les.id);
        const isCaching = this.cachingIds.includes(les.id);

        html += `
          <div class="bg-white border border-slate-200 hover:border-indigo-400 p-5 rounded-2xl transition-all shadow-xs flex flex-col justify-between">
            <div>
              <div class="flex justify-between items-center">
                <div class="flex items-center space-x-1.5">
                  <!-- Bookmark Button -->
                  <button data-id="${les.id}" class="bookmarkToggleBtn text-base transition-all hover:scale-110 active:scale-95 cursor-pointer mr-1" title="${this.db.isLessonBookmarked(les.id) ? "Fafao amin'ny tianao (Retirer des favoris)" : "Tehirizo ho tianao (Ajouter aux favoris)"}">
                    ${this.db.isLessonBookmarked(les.id) ? "🔖" : "🏷️"}
                  </button>
                  <span class="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded font-mono">+${les.xp} XP</span>
                  ${
                    isCompleted
                      ? `<span class="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">✓ ${t.completed}</span>`
                      : ""
                  }
                </div>

                <!-- Caching button inside card -->
                <button data-id="${les.id}" data-action="${isCached ? "uncache" : "cache"}" class="cacheToggleBtn flex items-center space-x-1 px-2 py-0.5 rounded-md text-[9px] font-bold font-mono transition-all border ${
                  isCaching
                    ? "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
                    : isCached
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100"
                }" title="${isCached ? t.deleteCache : t.notCached}">
                  <span>${
                    isCaching
                      ? "⏳"
                      : isCached
                        ? "💾"
                        : "⬇️"
                  }</span>
                  <span class="hidden sm:inline">${
                    isCaching
                      ? t.caching
                      : isCached
                        ? t.cached
                        : t.notCached
                  }</span>
                </button>
              </div>

              <h4 class="font-bold text-slate-800 text-base mt-2.5 leading-snug">${les.title}</h4>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">${les.content.introduction}</p>
            </div>

            ${
              !isOnline && !isCached
                ? `
                <div class="mt-5 p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-center">
                  <p class="text-[10px] text-rose-700 font-bold leading-tight">${t.offlineWarning}</p>
                </div>
                `
                : `
                <button data-id="${les.id}" class="startLessonBtn mt-5 w-full ${isCached ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"} text-white font-bold text-xs py-2.5 rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5">
                  <span>${!isOnline ? "⚡" : "🚀"}</span>
                  <span>${!isOnline ? t.offlinePlay : t.start}</span>
                </button>
                `
            }
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
    this.innerHTML = html;

    // Bind lesson triggers
    this.querySelectorAll(".startLessonBtn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        const lessonId = btn.getAttribute("data-id");
        this.startLesson(lessonId);
      });
    });

    // Bind bookmark control button triggers
    this.querySelectorAll(".bookmarkToggleBtn").forEach((btn: any) => {
      btn.addEventListener("click", (e: Event) => {
        e.stopPropagation();
        const lessonId = btn.getAttribute("data-id");
        this.db.toggleBookmarkLesson(lessonId);
        this.render();
      });
    });

    // Bind cache control button triggers
    this.querySelectorAll(".cacheToggleBtn").forEach((btn: any) => {
      btn.addEventListener("click", async (e: Event) => {
        e.stopPropagation();
        const lessonId = btn.getAttribute("data-id");
        const action = btn.getAttribute("data-action");

        if (action === "cache") {
          const actionText = isMg ? "Mampiditra lesona offline" : "Télécharger la leçon";
          if (!this.checkOnline(isMg, actionText)) return;

          // Add to caching list to trigger loading spinner
          this.cachingIds.push(lessonId);
          this.render();

          // Locate the lesson module from the language content
          const content = (window as any).feheziko?.languageContent;
          let lessonToCache = null;
          if (content) {
            for (const lvl of content.levels) {
              const found = lvl.lessons.find((l: any) => l.id === lessonId);
              if (found) {
                lessonToCache = found;
                break;
              }
            }
          }

          if (lessonToCache) {
            // Wait 500ms for premium feeling feedback
            await new Promise(resolve => setTimeout(resolve, 500));
            await this.db.cacheLesson(lessonToCache);
          }

          this.cachingIds = this.cachingIds.filter(id => id !== lessonId);
          this.render();
        } else if (action === "uncache") {
          await this.db.uncacheLesson(lessonId);
          this.render();
        }
      });
    });

    // Bind Sync All Favorites Button
    const syncAllBtn = this.querySelector("#syncAllFavoritesBtn");
    if (syncAllBtn) {
      syncAllBtn.addEventListener("click", () => {
        const actionText = isMg ? "Mampitaha ny tiana rehetra" : "Tout synchroniser";
        if (!this.checkOnline(isMg, actionText)) return;
        this.syncAllFavorites(bookmarkedLessons);
      });
    }

    // Bind Dismiss Connection Error Button
    const dismissBtn = this.querySelector("#dismissConnectionErrorBtn");
    if (dismissBtn) {
      dismissBtn.addEventListener("click", () => {
        this.connectionError = null;
        this.render();
      });
    }

    this.querySelector("#quickReviewBtn")?.addEventListener("click", () => {
      quickReviewService.openQuickReviewModal(() => this.render());
    });
    this.querySelector("#toggleFocusModeGridBtn")?.addEventListener("click", () => this.toggleFocusMode());
    this.querySelector("#exitFocusModeTopBtn")?.addEventListener("click", () => this.toggleFocusMode(false));
    this.querySelector("#focusModeBackdrop")?.addEventListener("click", () => this.toggleFocusMode(false));

    // Bind Mistakes Quiz Buttons
    this.querySelector("#startMistakesQuizBtn")?.addEventListener("click", () => {
      this.isMistakesQuizActive = true;
      this.mistakesQuizIndex = 0;
      this.mistakesQuizItems = this.db.getRecentMistakes();
      this.mistakesQuizFlipped = false;
      this.mistakesQuizChecked = false;
      this.mistakesQuizSelectedAnswer = null;
      this.mistakesQuizCorrect = false;
      this.mistakesQuizScore = 0;
      this.render();
    });

    this.querySelector("#clearMistakesBtn")?.addEventListener("click", () => {
      this.db.clearRecentMistakes();
      this.render();
    });
  }

  private checkOnline(isMg: boolean, actionDescription: string): boolean {
    if (!navigator.onLine) {
      this.connectionError = isMg
        ? `Mila fidirana Internet ianao vao afaka manao ity asa ity (${actionDescription}). Andramo indray rehefa tafaverina ny Internet.`
        : `Une connexion Internet est requise pour effectuer cette action (${actionDescription}). Veuillez réessayer dès que vous serez connecté.`;
      this.render();
      return false;
    }
    return true;
  }

  private async syncAllFavorites(bookmarkedLessons: any[]) {
    if (this.isBatchSyncing || bookmarkedLessons.length === 0) return;
    this.isBatchSyncing = true;
    this.batchSyncTotal = bookmarkedLessons.length;
    this.batchSyncCurrent = 0;
    this.render();

    for (const les of bookmarkedLessons) {
      if (!this.cachingIds.includes(les.id)) {
        this.cachingIds.push(les.id);
      }
      this.render();

      // Premium 400ms delay to make the download look like a real, high-quality network chunk progress bar
      await new Promise(resolve => setTimeout(resolve, 400));
      await this.db.cacheLesson(les);

      this.cachingIds = this.cachingIds.filter(id => id !== les.id);
      this.batchSyncCurrent++;
      this.render();
    }

    // Delay briefly to show 100% completion state before fading
    await new Promise(resolve => setTimeout(resolve, 800));
    this.isBatchSyncing = false;
    this.render();
  }

  private async startLesson(lessonId: string) {
    let found: any = null;

    // Try loading from IndexedDB first for a true offline capability
    try {
      found = await this.db.getCachedLesson(lessonId);
    } catch (e) {
      console.warn("Could not load lesson from IndexedDB:", e);
    }

    if (!found) {
      // Fallback to static bundled memory content
      const content = (window as any).feheziko?.languageContent;
      if (content) {
        for (const lvl of content.levels) {
          const l = lvl.lessons.find((les: any) => les.id === lessonId);
          if (l) {
            found = l;
            break;
          }
        }
      }
    }

    if (found) {
      this.currentLesson = found;
      this.activeStep = "intro";
      this.vocabIndex = 0;
      this.quizIndex = 0;
      this.selectedQuizAnswer = null;
      this.quizChecked = false;
      this.recording = false;
      this.micScoreResult = null;
      this.userWaveform = [];
      this.timingGaps = [];
      this.prosodyMismatches = [];
      this.lessonMistakes = 0;

      // Pre-warm the AudioContext, microphone, and speech synthesis/pronunciation buffers
      if (this.audio && typeof this.audio.preWarmAndBufferLesson === "function") {
        try {
          this.audio.preWarmAndBufferLesson(found);
        } catch (err) {
          console.warn("Could not pre-warm lesson audio:", err);
        }
      }

      await this.loadLessonVoiceMemos(lessonId);
      this.render();
    } else {
      // If we are offline and not cached
      const isMg = this.db.getProgress().accessibility.language === "mg";
      this.connectionError = isMg 
        ? "Mifandraisa amin'ny internet aloha mba hisintonana ity lesona ity! Andramo indray rehefa tafiditra." 
        : "Veuillez vous connecter à internet pour télécharger cette leçon ! Veuillez réessayer dès que vous serez connecté.";
      this.render();
    }
  }

  /**
   * Screen: Dynamic Lesson Player (Interactive Quiz, Shadowing & Vocab cards)
   */
  private renderLessonPlayer() {
    const progress = this.db.getProgress();
    const isMg = progress.accessibility.language === "mg";
    const t = isMg ? {
      quit: "Hivoaka (Quitter)",
      next: "Manaraka (Suivant)",
      check: "Hanamarina (Vérifier)",
      excellent: "Tsara dia tsara!",
      tryAgain: "Andramo indray...",
      recording: "Mihaino anao ny milina...",
      micScore: "Naoty azo (Pronunciation score)",
      congrats: "Arahabaina tsara dia tsara!",
      lessonSuccess: `Nahavita ny lesona ianao ary nahazo tombony feno !`,
      finish: "Hamita (Terminer)"
    } : {
      quit: "Quitter",
      next: "Suivant",
      check: "Vérifier",
      excellent: "Excellent !",
      tryAgain: "Réessayer...",
      recording: "Le système vous écoute...",
      micScore: "Note de prononciation",
      congrats: "Félicitations !",
      lessonSuccess: "Vous avez complété la leçon avec succès !",
      finish: "Terminer"
    };

    // Calculate step progress percentage
    const vocabLength = this.currentLesson.content.vocabulary.length;
    const quizLength = this.currentLesson.content.quiz.length;
    const totalSteps = 1 + vocabLength + quizLength;
    let currentStepNum = 0;
    if (this.activeStep === "intro") currentStepNum = 1;
    else if (this.activeStep === "vocab") currentStepNum = 2 + this.vocabIndex;
    else if (this.activeStep === "quiz") currentStepNum = 2 + this.currentLesson.content.vocabulary.length + this.quizIndex;
    else currentStepNum = totalSteps;

    const progressPercent = Math.floor((currentStepNum / totalSteps) * 100);

    let stepLabel = "";
    if (this.activeStep === "intro") {
      stepLabel = isMg ? "Fampidirana (Intro)" : "Introduction";
    } else if (this.activeStep === "vocab") {
      stepLabel = isMg 
        ? `Voambolana (${this.vocabIndex + 1}/${vocabLength})` 
        : `Vocabulaire (${this.vocabIndex + 1}/${vocabLength})`;
    } else if (this.activeStep === "quiz") {
      stepLabel = isMg 
        ? `Fanontaniana (${this.quizIndex + 1}/${quizLength})` 
        : `Quiz (${this.quizIndex + 1}/${quizLength})`;
    } else {
      stepLabel = isMg ? "Vita (Terminé)" : "Terminé";
    }

    let mainCardHtml = "";

    // Step 1: Introduction Screen
    if (this.activeStep === "intro") {
      const comm = this.currentLesson.content.commentary;
      mainCardHtml = `
        <div class="space-y-6">
          <span class="text-4xl">📖</span>
          <h3 class="text-xl md:text-2xl font-bold text-slate-800 leading-snug">${this.currentLesson.title}</h3>
          <p class="text-sm text-slate-600 leading-relaxed">${this.currentLesson.content.introduction}</p>
          
          <div class="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 space-y-3">
            <h4 class="font-bold text-indigo-900 text-sm">💡 Fitsipi-pitenenana (Règle Grammaticale) : ${this.currentLesson.content.grammar.title}</h4>
            <p class="text-xs text-indigo-700 leading-relaxed">${this.currentLesson.content.grammar.rule}</p>
            <div class="space-y-1.5 pt-2">
              ${this.currentLesson.content.grammar.examples
                .map((ex: string) => `<p class="text-xs font-mono font-semibold text-indigo-900 bg-white/60 p-2 rounded-lg border border-indigo-100/30">✓ ${this.highlightPhoneticWords(ex, isMg)}</p>`)
                .join("")}
            </div>
          </div>

          <!-- Teacher Commentary & Pedagogical Notes -->
          ${comm ? `
            <div class="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-5 space-y-3 shadow-xs">
              <div class="flex items-center space-x-2">
                <span class="text-xl">✍️</span>
                <h4 class="font-extrabold text-amber-950 text-sm">${isMg ? "Fanamarihana & Soso-kevitry ny Mpampianatra" : "Commentaires & Remarques Pédagogiques"}</h4>
              </div>
              ${comm.teacher_notes ? `
                <div class="bg-white/90 p-3.5 rounded-xl border border-amber-200/60 space-y-1">
                  <span class="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider block">🎓 ${isMg ? "Fanamarihan'ny mpampianatra" : "Note du professeur"}</span>
                  <p class="text-xs text-amber-950 leading-relaxed font-medium">${comm.teacher_notes}</p>
                </div>
              ` : ''}
              ${comm.cultural_tip ? `
                <div class="bg-white/90 p-3.5 rounded-xl border border-amber-200/60 space-y-1">
                  <span class="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">🇲🇬 ${isMg ? "Mombamomba ny kolontsaina" : "Conseil culturel"}</span>
                  <p class="text-xs text-slate-800 leading-relaxed font-medium">${comm.cultural_tip}</p>
                </div>
              ` : ''}
              ${comm.pronunciation_tip ? `
                <div class="bg-white/90 p-3.5 rounded-xl border border-amber-200/60 space-y-1">
                  <span class="text-[10px] font-extrabold text-indigo-800 uppercase tracking-wider block">🗣️ ${isMg ? "Fomba fitenenana" : "Astuce de prononciation"}</span>
                  <p class="text-xs text-slate-800 leading-relaxed font-medium">${comm.pronunciation_tip}</p>
                </div>
              ` : ''}
            </div>
          ` : ''}
          
          <button id="playerNextBtn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-md shadow-indigo-100 mt-6 cursor-pointer">
            ${t.next} →
          </button>
        </div>
      `;
    }

    // Step 2: Vocabulary Flashcards
    else if (this.activeStep === "vocab") {
      const word = this.currentLesson.content.vocabulary[this.vocabIndex];
      const speed = this.audio.getPlaybackSpeed();
      mainCardHtml = `
        <div class="space-y-6 text-center py-4">
          <span class="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-full border border-indigo-100 uppercase tracking-wider">Teny vaovao (Vocabulaire) [${this.vocabIndex + 1}/${this.currentLesson.content.vocabulary.length}]</span>
          
          <div class="my-6">
            <h3 class="text-4xl font-extrabold text-slate-900 tracking-tight">${this.highlightPhoneticWords(word.word, isMg)}</h3>
            <p class="text-xs font-mono text-slate-400 mt-1.5">[${word.phonetic}]</p>
          </div>

          <!-- Sound Pronounce Button & Speed Controller -->
          <div class="flex flex-col items-center gap-3">
            <button id="playAudioBtn" class="mx-auto w-14 h-14 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-full flex items-center justify-center text-xl transition-transform hover:scale-105 shadow-sm">
              🔊
            </button>
            <div class="flex items-center bg-slate-100 p-1 rounded-full border border-slate-200/50">
              <button class="audioSpeedBtn px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${speed === 0.5 ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}" data-speed="0.5">0.5x</button>
              <button class="audioSpeedBtn px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${speed === 0.75 ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}" data-speed="0.75">0.75x</button>
              <button class="audioSpeedBtn px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${speed === 1.0 ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}" data-speed="1.0">1.0x</button>
            </div>
          </div>

          <div class="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 max-w-sm mx-auto space-y-2 mt-6">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dikan'ny teny (Traduction)</span>
            <p class="text-lg font-bold text-indigo-900">${word.translation}</p>
            <div class="border-t border-slate-200/60 pt-2.5 mt-2.5 text-left">
              <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ohatra fampiasana (Exemple)</span>
              <p class="text-xs font-medium text-slate-700 font-mono italic">"${this.highlightPhoneticWords(word.example, isMg)}"</p>
              <p class="text-xs text-slate-500 mt-1">"${word.example_translation}"</p>
            </div>
          </div>

          <div class="flex gap-4 pt-6">
            <button id="playerPrevBtn" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors border border-slate-200">
              ← Hiverina
            </button>
            <button id="playerNextBtn" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-md">
              ${t.next} →
            </button>
          </div>
        </div>
      `;
    }

    // Step 3: Interactive Quiz Challenges (Including Spoken/Shadowing test!)
    else if (this.activeStep === "quiz") {
      const quiz = this.currentLesson.content.quiz[this.quizIndex];
      
      if (quiz.type === "multiple-choice" || quiz.type === "translate") {
        mainCardHtml = `
          <div class="space-y-6">
            <span class="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-full border border-indigo-100 uppercase tracking-wider">Fanamarinana fahalalana (Quiz) [${this.quizIndex + 1}/${this.currentLesson.content.quiz.length}]</span>
            
            <h3 class="text-lg md:text-xl font-bold text-slate-800 mt-4 leading-snug">${quiz.question}</h3>

            <div class="space-y-3 mt-6">
              ${quiz.options
                .map((opt: string) => {
                  let optStyle = "border-slate-200 bg-white hover:bg-slate-50 text-slate-700";
                  if (this.selectedQuizAnswer === opt) {
                    optStyle = "border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold";
                  }
                  if (this.quizChecked) {
                    if (opt === quiz.answer) {
                      optStyle = "border-emerald-600 bg-emerald-50 text-emerald-900 font-bold";
                    } else if (this.selectedQuizAnswer === opt) {
                      optStyle = "border-rose-500 bg-rose-50 text-rose-950";
                    }
                  }
                  return `
                    <button class="quizOptionBtn w-full text-left p-4 rounded-xl border transition-all duration-150 flex items-center justify-between ${optStyle}" ${this.quizChecked ? "disabled" : ""}>
                      <span>${opt}</span>
                      ${
                        this.quizChecked && opt === quiz.answer
                          ? `<span class="text-emerald-600 font-bold">✓</span>`
                          : ""
                      }
                    </button>
                  `;
                })
                .join("")}
            </div>

            <!-- Quiz feedback message bar -->
            ${
              this.quizChecked
                ? `
              <div class="p-4 rounded-xl flex items-center space-x-3 border ${this.quizCorrect ? "bg-emerald-50 border-emerald-100 text-emerald-900" : "bg-rose-50 border-rose-100 text-rose-900"}">
                <span class="text-xl">${this.quizCorrect ? "🎉" : "❌"}</span>
                <div>
                  <h4 class="font-bold text-xs">${this.quizCorrect ? t.excellent : t.tryAgain}</h4>
                  <p class="text-[10px] text-slate-500 mt-0.5">${this.quizCorrect ? "Manaraka tsara ianao!" : `Ny valiny marina dia: ${quiz.answer}`}</p>
                </div>
              </div>
              `
                : ""
            }

            <div class="flex gap-4 pt-4">
              ${
                !this.quizChecked
                  ? `<button id="playerCheckBtn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-md" ${!this.selectedQuizAnswer ? "disabled opacity-50" : ""}>${t.check}</button>`
                  : `<button id="playerNextBtn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-md">${t.next} →</button>`
              }
            </div>
          </div>
        `;
      } 
      
      // SHADOWING (Speaking challenge!)
      else if (quiz.type === "shadowing") {
        mainCardHtml = `
          <div class="space-y-6 text-left">
            <span class="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-full border border-indigo-100 uppercase tracking-wider">Fanononana teny am-bava (Shadowing / Speaking)</span>
            
            <h3 class="text-base font-bold text-slate-500 mt-2">${quiz.question}</h3>

            <!-- Sentence panel -->
            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center my-4 space-y-2">
              <h4 id="shadowingTargetPhrase" class="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
                ${this.interimTranscription ? this.renderLiveMatchedPhrase(quiz.phrase, this.interimTranscription) : this.highlightPhoneticWords(quiz.phrase, isMg)}
              </h4>
              <p class="text-xs text-slate-400 italic">[Dikan'ny teny: ${quiz.translation}]</p>
              
              <div class="flex flex-col items-center gap-2.5 mt-3">
                <button id="playPhraseAudioBtn" class="mx-auto px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95">
                  🔊 Henoy ny feo
                </button>
                <div class="flex items-center bg-slate-100/80 p-0.5 rounded-full border border-slate-200/50 scale-90">
                  <button class="audioSpeedBtn px-2.5 py-0.5 rounded-full text-[9px] font-bold transition-all cursor-pointer ${this.audio.getPlaybackSpeed() === 0.5 ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}" data-speed="0.5">0.5x</button>
                  <button class="audioSpeedBtn px-2.5 py-0.5 rounded-full text-[9px] font-bold transition-all cursor-pointer ${this.audio.getPlaybackSpeed() === 0.75 ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}" data-speed="0.75">0.75x</button>
                  <button class="audioSpeedBtn px-2.5 py-0.5 rounded-full text-[9px] font-bold transition-all cursor-pointer ${this.audio.getPlaybackSpeed() === 1.0 ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}" data-speed="1.0">1.0x</button>
                </div>
              </div>
            </div>

            <!-- Real-Time Pronunciation Accuracy Visual Feedback Indicator -->
            ${this.renderRealtimeAccuracyWidget(
              quiz.phrase,
              this.micScoreResult?.transcription || this.interimTranscription,
              isMg
            )}

            <!-- Waveform Comparison Widget -->
            ${this.renderWaveformWidget(quiz, isMg)}

            <!-- Live Speech Recognition / Recording controls -->
            ${
              this.recording
                ? `
              <div class="flex flex-col items-center justify-center py-4 space-y-3">
                <div class="flex items-center space-x-2 text-xs font-mono font-extrabold text-rose-500 animate-pulse">
                  <span class="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-sm shadow-rose-500/50"></span>
                  <span>${t.recording}</span>
                </div>
                <!-- Web Speech API Live Interim Transcription Banner -->
                <div id="liveInterimTranscript" class="w-full max-w-md mx-auto p-3 bg-slate-900/90 text-indigo-200 border border-indigo-500/30 rounded-xl text-center text-xs font-mono shadow-inner min-h-[44px] flex items-center justify-center transition-all">
                  ${this.interimTranscription 
                    ? `<span class="text-rose-400 font-extrabold mr-1.5">🎙️ ${isMg ? "Feo re:" : "En direct:"}</span> <span class="text-emerald-300 font-mono font-bold bg-slate-800 px-2 py-0.5 rounded-lg border border-emerald-500/30">"${this.interimTranscription}"</span>` 
                    : `<span class="opacity-50 italic text-[11px]">${isMg ? "Miresaha amin'ny micro (Aseho eto ny feo rafraifina amin'ny Web Speech API)..." : "Parlez dans le micro (Analyse en direct Web Speech API)..."}</span>`
                  }
                </div>
                <!-- VAD visual indicator -->
                <div id="vadIndicator" class="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-800 text-[10px] font-mono font-bold text-slate-400 border border-slate-700 transition-all duration-200 shadow-sm">
                  <span id="vadDot" class="w-2 h-2 rounded-full bg-slate-500 transition-colors duration-200"></span>
                  <span id="vadText">${isMg ? "MIANDRY FEONY..." : "ATTENTE DE LA VOIX..."}</span>
                </div>
              </div>
              `
                : `
              <div class="flex flex-col items-center justify-center py-4">
                <button id="startSpeechRecordingBtn" class="w-16 h-16 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center text-2xl shadow-md shadow-rose-200 hover:shadow-lg transition-all active:scale-95 cursor-pointer">
                  🎙️
                </button>
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-3">
                  ${isMg ? "Tsindrio mba hitenenana (Click to speak)" : "Cliquez pour parler"}
                </span>
              </div>
              `
            }

            <!-- Speech Results evaluation panel -->
            ${
              this.micScoreResult
                ? `
              <div class="p-5 bg-slate-900 text-white rounded-2xl space-y-4 shadow-xl border border-slate-800">
                <div class="flex justify-between items-center border-b border-slate-800 pb-3">
                  <span class="text-xs font-bold uppercase tracking-wider text-indigo-400">${t.micScore}</span>
                  <span class="text-2xl font-black text-emerald-400 font-mono">${this.micScoreResult.score}%</span>
                </div>

                <!-- Web Speech API Captured Text Display -->
                <div class="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 space-y-1">
                  <span class="text-[10px] text-indigo-300 font-bold uppercase block tracking-wider">
                    ${isMg ? "Feo azon'ny Web Speech API (Transcribed speech):" : "Transcription captée par Web Speech API :"}
                  </span>
                  <p class="font-mono text-emerald-300 font-bold text-xs sm:text-sm">
                    "${this.micScoreResult.transcription || (isMg ? "Tsy azo mazava ny teny" : "Parole non reconnue")}"
                  </p>
                </div>

                <div class="grid grid-cols-3 gap-2.5">
                  <div class="bg-slate-800 p-2.5 rounded-xl">
                    <span class="text-[9px] text-slate-400 font-bold block uppercase tracking-tight">${isMg ? "Hamaritana (Accuracy)" : "Exactitude"}</span>
                    <span class="text-base font-extrabold text-slate-100 font-mono">${this.micScoreResult.accuracy}%</span>
                  </div>
                  <div class="bg-slate-800 p-2.5 rounded-xl">
                    <span class="text-[9px] text-slate-400 font-bold block uppercase tracking-tight">${isMg ? "Havelomana (Rhythm)" : "Rythme"}</span>
                    <span class="text-base font-extrabold text-slate-100 font-mono">${this.micScoreResult.rhythm}%</span>
                  </div>
                  <div class="bg-slate-800 p-2.5 rounded-xl border border-indigo-500/20 shadow-sm shadow-indigo-500/5">
                    <span class="text-[9px] text-indigo-400 font-black block uppercase tracking-tight">${isMg ? "Lantom-peo (Spectral)" : "Spectral Match"}</span>
                    <span class="text-base font-black text-indigo-300 font-mono">${this.micScoreResult.spectralMatch !== undefined ? this.micScoreResult.spectralMatch : 0}%</span>
                  </div>
                </div>

                <div class="pt-1 flex flex-col gap-2">
                  <p class="text-xs text-slate-300 leading-relaxed">${this.micScoreResult.feedback}</p>
                  <button id="savePracticeAsMemoBtn" class="w-full bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/40 font-bold text-xs py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                    🎙️ ${isMg ? "Tahirizina amin'ny Mémo Vocal" : "Sauvegarder cet essai comme Mémo Vocal"}
                  </button>
                  ${this.memoToastMessage ? `
                    <div class="p-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-lg text-center animate-fade-in">
                      ${this.memoToastMessage}
                    </div>
                  ` : ""}
                </div>
              </div>
              `
                : ""
            }

            <div class="pt-4">
              <button id="playerNextBtn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-md" ${!this.micScoreResult ? "disabled opacity-40" : ""}>
                ${t.next} →
              </button>
            </div>
          </div>
        `;
      }
    }

    // Step 4: Success Screen
    else if (this.activeStep === "complete") {
      mainCardHtml = `
        <div class="text-center py-6 space-y-6">
          <span class="text-6xl animate-bounce inline-block">🏆</span>
          <h3 class="text-3xl font-extrabold text-slate-900 tracking-tight">${t.congrats}</h3>
          <p class="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">${t.lessonSuccess}</p>

          <div class="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 max-w-xs mx-auto flex items-center justify-between font-mono">
            <span class="text-indigo-800 font-bold">Fivoarana (Gain) :</span>
            <span class="text-indigo-700 font-extrabold">+${this.currentLesson.xp} XP</span>
          </div>

          <button id="playerFinishBtn" class="w-full max-w-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-indigo-100 mt-6">
            ${t.finish} ✓
          </button>
        </div>
      `;
    }

    // Localization for Voice Memos ("Leave a Note")
    // Localization for Voice Memos ("Leave a Note")
    const isComplete = this.activeStep === "complete";
    const vmLabels = isMg ? {
      notesTitle: isComplete ? "Fandinihana am-peo (Réflexion vocale post-lesona)" : "Fanamarihana feo (Mémos vocaux)",
      notesDesc: isComplete ? "Raketo ny fivoaranao na ny eritreritrao momba ity lesona ity ho tadidy any aoriana." : "Mandraisa fanamarihana feo fohy ho an'ity lesona ity.",
      startRecord: isComplete ? "Handray feo fandinihana" : "Handray feo",
      stopRecord: "Hajanonana",
      saveNote: isComplete ? "Tehirizina ny fandinihana" : "Tehirizina",
      deleteNote: "Fafana",
      placeholder: isComplete ? "Ny fandinihako, teny tadidiko..." : "Lohahevitra na teny fanamarihana...",
      noNotes: isComplete ? "Tsy misy fandinihana feo voatahiry momba ity lesona ity." : "Tsy misy fanamarihana feo voatahiry ho an'ity lesona ity.",
      recordingState: isComplete ? "Mandraikitra fandinihana..." : "Mandraikitra feo...",
      sec: "seg",
      play: "Haino",
      stop: "Hajanona",
      nowPlaying: isComplete ? "Mamaky ny fandinihana voatahiry" : "Mamaky feo voatahiry",
      speed: "Hafainganam-pandeha"
    } : {
      notesTitle: isComplete ? "Réflexion Vocale (Post-Leçon)" : "Mémos Vocaux (Notes)",
      notesDesc: isComplete ? "Enregistrez vos impressions, progrès ou réflexions sur cette leçon." : "Enregistrez de courts mémos vocaux liés à cette leçon.",
      startRecord: isComplete ? "Enregistrer une réflexion" : "Enregistrer",
      stopRecord: "Arrêter",
      saveNote: isComplete ? "Enregistrer la réflexion" : "Enregistrer la note",
      deleteNote: "Supprimer",
      placeholder: isComplete ? "Ma réflexion, mots retenus..." : "Titre du mémo...",
      noNotes: isComplete ? "Aucune réflexion enregistrée pour le moment." : "Aucune note vocale enregistrée pour cette leçon.",
      recordingState: isComplete ? "Enregistrement de la réflexion..." : "Enregistrement en cours...",
      sec: "sec",
      play: "Écouter",
      stop: "Arrêter",
      nowPlaying: isComplete ? "Lecture de la réflexion" : "Lecture en cours",
      speed: "Vitesse de lecture"
    };

    const activeMemo = this.playingMemoId 
      ? this.lessonVoiceMemos.find(m => m.id === this.playingMemoId) 
      : null;

    let waveformHtml = "";
    if (activeMemo) {
      const bars = this.getWaveformBars(activeMemo.id);
      waveformHtml = bars.map((height, index) => {
        const barPercent = (index / (bars.length - 1)) * 100;
        const isActive = barPercent <= this.memoProgressPercent;
        const colorClass = isActive 
          ? "bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.3)]" 
          : "bg-slate-200 hover:bg-slate-300";
        return `
          <div 
            class="w-1 md:w-1.5 rounded-full transition-all duration-150 cursor-pointer ${colorClass}" 
            style="height: ${height}%;"
            data-index="${index}"
          ></div>
        `;
      }).join("");
    }

    let memosHtml = `
      <div class="bg-slate-50 border border-slate-200/80 rounded-3xl p-5 md:p-6 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              🎙️ ${vmLabels.notesTitle}
            </h4>
            <p class="text-[10px] text-slate-500 mt-0.5">${vmLabels.notesDesc}</p>
          </div>
          <span class="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
            ${this.lessonVoiceMemos.length}
          </span>
        </div>

        <!-- Recorder controls -->
        <div class="bg-white border border-slate-200/60 rounded-xl p-3 flex flex-col gap-2.5">
          ${!this.memoRecording ? `
            <!-- Quick Title Tag Chips -->
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono mr-1">${isMg ? "Sokajy:" : "Tag:"}</span>
              ${[
                { label: "🎯 Prononciation", text: isMg ? "🎯 Fanononana teny" : "🎯 Practice Prononciation" },
                { label: "💬 Expression", text: isMg ? "💬 Fitenenana zava-dehibe" : "💬 Expression Clé" },
                { label: "💡 Note", text: isMg ? "💡 Fanamarihana" : "💡 Note Personnelle" },
                { label: "⭐ Practice", text: isMg ? "⭐ Fanazarantena" : "⭐ Extraits Pratique" }
              ].map(tag => `
                <button class="quickMemoTagBtn shrink-0 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 font-medium text-[10px] px-2 py-0.5 rounded-md border border-slate-200/60 transition-all cursor-pointer" data-tag="${tag.text}">
                  ${tag.label}
                </button>
              `).join("")}
            </div>
          ` : ""}

          <div class="flex flex-col md:flex-row gap-3 items-center justify-between">
            ${this.memoRecording 
              ? `
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse"></span>
                <span class="text-xs font-mono font-bold text-rose-600">${vmLabels.recordingState} (${this.memoRecordingDuration}s)</span>
              </div>
              <button id="stopMemoRecordBtn" class="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-1.5 px-3 rounded-lg transition-colors cursor-pointer">
                ⏹️ ${vmLabels.stopRecord}
              </button>
              `
              : `
              <div class="w-full flex gap-2 flex-1">
                <input id="memoTitleInput" type="text" placeholder="${vmLabels.placeholder}" class="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-medium text-slate-700" value="${this.memoTitleInput || ''}">
                <button id="startMemoRecordBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0 shadow-xs">
                  🎙️ ${vmLabels.startRecord}
                </button>
              </div>
              `
            }
          </div>
        </div>

        <!-- Active Custom Audio Player -->
        ${activeMemo ? `
          <div id="activeMemoPlayer" class="bg-indigo-50/70 border border-indigo-100/85 rounded-2xl p-4.5 space-y-4 shadow-xs animate-fade-in">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-xl">🔊</span>
                <div>
                  <span class="text-[9px] font-black uppercase text-indigo-500 tracking-wider font-mono">${vmLabels.nowPlaying}</span>
                  <h5 class="font-bold text-slate-800 text-xs mt-0.5">${activeMemo.title || "Voice Note"}</h5>
                </div>
              </div>
              <button id="activeMemoStopBtn" class="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-full hover:bg-indigo-100/50 transition-colors cursor-pointer focus:outline-none" title="${vmLabels.stop}">
                ✕
              </button>
            </div>

            <!-- Waveform Visualizer -->
            <div class="relative">
              <div id="memoWaveformSeekbar" class="h-16 flex items-end justify-between gap-1 bg-white/90 hover:bg-white border border-indigo-100/60 rounded-xl p-3 select-none cursor-pointer group transition-all">
                ${waveformHtml}
              </div>
            </div>

            <!-- Audio Controls (Play/Pause, Speed, Timers) -->
            <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div class="flex items-center gap-3">
                <!-- Play/Pause Toggle -->
                <button id="activeMemoPlayPauseBtn" class="w-9 h-9 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md hover:shadow-indigo-100 transition-all cursor-pointer focus:outline-none">
                  ${this.currentPlayingAudio && !this.currentPlayingAudio.paused ? `
                    <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <rect x="4" y="4" width="4" height="16" rx="1"></rect>
                      <rect x="16" y="4" width="4" height="16" rx="1"></rect>
                    </svg>
                  ` : `
                    <svg class="w-4 h-4 fill-current translate-x-0.5" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"></path>
                    </svg>
                  `}
                </button>

                <!-- Speed Selection Controls -->
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mr-1">${vmLabels.speed}:</span>
                  <div class="inline-flex bg-slate-200/60 p-0.5 rounded-lg border border-slate-300/30">
                    ${[0.5, 1.0, 1.5].map(speed => {
                      const isActive = this.memoPlaybackSpeed === speed;
                      const speedId = speed.toString().replace('.', '_');
                      return `
                        <button 
                          id="memoSpeedBtn-${speedId}" 
                          class="px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase tracking-wider cursor-pointer transition-all ${
                            isActive 
                              ? "bg-indigo-600 text-white shadow-xs" 
                              : "text-slate-600 hover:text-slate-800 hover:bg-slate-300/40"
                          }"
                        >
                          ${speed === 1.0 ? "1x" : `${speed}x`}
                        </button>
                      `;
                    }).join("")}
                  </div>
                </div>
              </div>

              <!-- Time display -->
              <div class="text-[11px] font-mono font-bold text-indigo-800 bg-indigo-100/50 px-3 py-1 rounded-lg">
                ${this.formatTime(this.memoCurrentTime)} <span class="text-indigo-400 font-medium">/</span> ${this.formatTime(this.memoDuration)}
              </div>
            </div>
          </div>
        ` : ""}

        <!-- Voice memos list -->
        <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
          ${this.lessonVoiceMemos.length === 0 
            ? `<p class="text-[10px] text-slate-400 italic text-center py-2">${vmLabels.noNotes}</p>`
            : this.lessonVoiceMemos.map((memo) => {
                const dateStr = new Date(memo.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                });
                const isPlaying = this.playingMemoId === memo.id;
                return `
                  <div class="bg-white border border-slate-200/60 rounded-xl p-3 flex items-center justify-between text-xs hover:border-slate-300 transition-all ${isPlaying ? 'ring-1 ring-indigo-500' : ''}">
                    <div class="space-y-0.5">
                      <p class="font-bold text-slate-700 font-sans">${memo.title || `Memo`}</p>
                      <p class="text-[9px] text-slate-400 font-mono">${dateStr}</p>
                    </div>
                    <div class="flex items-center gap-2">
                      <button class="playMemoBtn bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] py-1 px-2.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer" data-id="${memo.id}">
                        ${isPlaying ? `⏹️ ${vmLabels.stop}` : `▶️ ${vmLabels.play}`}
                      </button>
                      <button class="deleteMemoBtn bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] py-1 px-2.5 rounded-lg transition-colors cursor-pointer" data-id="${memo.id}">
                        🗑️ ${vmLabels.deleteNote}
                      </button>
                    </div>
                  </div>
                `;
              }).join("")
          }
        </div>
      </div>
    `;

    this.innerHTML = `
      ${this.isFocusMode ? `
        <!-- Screen Dimming Overlay -->
        <div id="focusModeBackdrop" class="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-30 transition-all animate-fade-in cursor-pointer" title="${isMg ? "Tsindrio na tsindrio ESC mba hivoaka am-pilaminana" : "Cliquez ou appuyez sur ESC pour quitter"}"></div>

        <!-- Floating Focus Mode Top Control Bar -->
        <div class="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-indigo-500/40 shadow-2xl flex items-center gap-3 sm:gap-6 text-xs font-mono">
          <div class="flex items-center gap-2">
            <span class="relative flex h-2.5 w-2.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span class="font-black text-indigo-200 tracking-wider uppercase text-[11px]">🎯 FOCUS MODE</span>
          </div>

          <div class="hidden md:flex items-center gap-2 text-slate-300 text-[11px]">
            <span class="font-bold truncate max-w-[180px]">${this.currentLesson?.title || ""}</span>
            <span class="text-slate-600">•</span>
            <span class="text-indigo-400 font-bold">${stepLabel}</span>
          </div>

          <button id="exitFocusModeTopBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-xl text-[11px] font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5">
            <span>✕</span>
            <span>${isMg ? "Akatona (ESC)" : "Quitter Focus (ESC)"}</span>
          </button>
        </div>
      ` : ""}

      <div class="max-w-xl mx-auto space-y-6 ${this.isFocusMode ? 'relative z-40' : ''}">
        <!-- Connection Error Banner -->
        ${this.connectionError ? `
          <div class="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 flex items-center justify-between shadow-xs animate-fade-in">
            <div class="flex items-center space-x-3">
              <span class="text-xl">⚠️</span>
              <div>
                <p class="text-xs font-bold">${isMg ? "Mila fidirana Internet" : "Connexion Internet requise"}</p>
                <p class="text-[11px] text-rose-600 mt-0.5">${this.connectionError}</p>
              </div>
            </div>
            <button id="dismissConnectionErrorBtn" class="text-xs text-rose-400 hover:text-rose-600 font-black px-2.5 py-1.5 rounded-xl hover:bg-rose-100/50 transition-colors cursor-pointer focus:outline-none">✕</button>
          </div>
        ` : ""}

        <!-- Player Header navigation & exit -->
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2 sm:space-x-3">
            <button id="playerExitBtn" class="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center space-x-1 transition-colors cursor-pointer">
              <span>✕</span>
              <span>${t.quit}</span>
            </button>
            <div class="h-4 w-px bg-slate-200"></div>
            <!-- Bookmark Button inside Lesson Player -->
            <button id="playerBookmarkBtn" class="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center space-x-1.5 transition-colors cursor-pointer" title="${this.db.isLessonBookmarked(this.currentLesson.id) ? (isMg ? "Fafao amin'ny tianao (Retirer des favoris)" : "Retirer des favoris") : (isMg ? "Tehirizo ho tianao (Ajouter aux favoris)" : "Ajouter aux favoris")}">
              <span class="text-sm">${this.db.isLessonBookmarked(this.currentLesson.id) ? "🔖" : "🏷️"}</span>
              <span class="hidden sm:inline">${isMg ? (this.db.isLessonBookmarked(this.currentLesson.id) ? "Tiana" : "Tehirizina") : (this.db.isLessonBookmarked(this.currentLesson.id) ? "Favori" : "Favoris")}</span>
            </button>
            <div class="h-4 w-px bg-slate-200"></div>
            <!-- Quick Review Button inside Lesson Player -->
            <button id="playerQuickReviewBtn" class="text-xs font-extrabold transition-all flex items-center space-x-1.5 cursor-pointer px-2.5 py-1 rounded-xl text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 shadow-2xs" title="${isMg ? "Famerenana Haingana (Quick Review)" : "Révision Rapide (Quick Review)"}">
              <span class="text-xs">⚡</span>
              <span class="hidden sm:inline">${isMg ? "Famerenana Haingana" : "Révision Rapide"}</span>
            </button>
            <div class="h-4 w-px bg-slate-200"></div>
            <!-- Focus Mode Button -->
            <button id="toggleFocusModeBtn" class="text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer px-2.5 py-1 rounded-xl ${this.isFocusMode ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-slate-200/80"}" title="${this.isFocusMode ? (isMg ? "Hakatona ny Mode Focus (ESC)" : "Quitter le Mode Focus (ESC)") : (isMg ? "Hampiditra Mode Focus" : "Activer le Mode Focus")}">
              <span class="text-xs">🎯</span>
              <span class="hidden sm:inline">${this.isFocusMode ? (isMg ? "Focus Hakatona" : "Quitter Focus") : (isMg ? "Mode Focus" : "Mode Focus")}</span>
            </button>
          </div>

          <!-- Sophisticated Segmented Visual Progress Bar -->
          <div class="flex flex-col items-end gap-1.5 w-1/2">
            <div class="flex items-center space-x-2.5 w-full">
              <div class="flex-1 h-3 bg-slate-100 rounded-full relative border border-slate-250/30 shadow-inner overflow-hidden">
                <!-- Segmented Fill with Gradient and Pulse Animation -->
                <div class="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 rounded-full transition-all duration-500 ease-out relative" style="width: ${progressPercent}%">
                  <!-- Shimmer/Sheen element -->
                  <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent w-full animate-pulse"></div>
                </div>
                
                <!-- Division Tick 1: After Intro -->
                <div class="absolute inset-y-0 w-0.5 bg-white/40 shadow-xs z-10" style="left: ${(1 / totalSteps) * 100}%"></div>
                <!-- Division Tick 2: After Vocab -->
                <div class="absolute inset-y-0 w-0.5 bg-white/40 shadow-xs z-10" style="left: ${((1 + vocabLength) / totalSteps) * 100}%"></div>
              </div>
              <span class="text-[10px] font-black font-mono text-indigo-950">${progressPercent}%</span>
            </div>
            <!-- Secondary metadata indicating the exact slide context -->
            <span class="text-[9px] font-black uppercase tracking-wider text-slate-450 font-mono select-none">${stepLabel}</span>
          </div>
        </div>

        <!-- Main Card Window with elegant transition -->
        <div class="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/60 shadow-xl shadow-slate-100/30">
          ${mainCardHtml}
        </div>

        <!-- Lesson Comments & Questions Section -->
        ${this.renderLessonCommentsHtml()}

        <!-- Voice Memos (Leave a Note) -->
        ${memosHtml}
      </div>
    `;

    // BIND ACTIONS & DYNAMIC CLICKS
    this.bindLessonCommentsEvents();
    this.querySelector("#playerQuickReviewBtn")?.addEventListener("click", () => {
      quickReviewService.openQuickReviewModal();
    });
    this.querySelector("#toggleFocusModeBtn")?.addEventListener("click", () => this.toggleFocusMode());
    this.querySelector("#exitFocusModeTopBtn")?.addEventListener("click", () => this.toggleFocusMode(false));
    this.querySelector("#focusModeBackdrop")?.addEventListener("click", () => this.toggleFocusMode(false));

    this.querySelector("#playerExitBtn")?.addEventListener("click", () => {
      this.currentLesson = null;
      this.render();
    });

    this.querySelector("#playerBookmarkBtn")?.addEventListener("click", () => {
      if (this.currentLesson) {
        this.db.toggleBookmarkLesson(this.currentLesson.id);
        this.render();
      }
    });

    this.querySelector("#dismissConnectionErrorBtn")?.addEventListener("click", () => {
      this.connectionError = null;
      this.render();
    });

    this.querySelector("#playerNextBtn")?.addEventListener("click", () => {
      this.handleNextStep();
    });

    this.querySelector("#playerPrevBtn")?.addEventListener("click", () => {
      this.handlePrevStep();
    });

    this.querySelector("#playerCheckBtn")?.addEventListener("click", () => {
      this.handleCheckQuiz();
    });

    this.querySelector("#playerFinishBtn")?.addEventListener("click", () => {
      this.handleFinishLesson();
    });

    // Voice Memos Action Listeners
    this.querySelectorAll(".quickMemoTagBtn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        const tag = btn.getAttribute("data-tag");
        if (tag) {
          this.memoTitleInput = tag;
          const inputEl = this.querySelector("#memoTitleInput") as HTMLInputElement;
          if (inputEl) inputEl.value = tag;
        }
      });
    });

    this.querySelector("#savePracticeAsMemoBtn")?.addEventListener("click", async () => {
      if (this.currentLesson) {
        const quiz = this.currentLesson.content?.quiz?.[this.quizIndex];
        const phrase = quiz?.phrase || this.currentLesson.title || "Pratique";
        const title = `Pratique: ${phrase}`;
        
        // If lastPracticeAudioBlob isn't set, fallback to a small WebM audio snippet or simulated blob
        let audioBlob = this.lastPracticeAudioBlob;
        if (!audioBlob) {
          // Generate synthetic silent voice memo blob if audio device stream wasn't stored
          audioBlob = new Blob([new Uint8Array(1024)], { type: "audio/webm" });
        }

        await this.db.saveVoiceMemo(this.currentLesson.id, title, audioBlob);
        await this.loadLessonVoiceMemos(this.currentLesson.id);
        const progress = this.db.getProgress();
        const isMg = progress.accessibility.language === "mg";
        this.memoToastMessage = isMg ? "✅ Voatahiry tao amin'ny Mémo Vocal!" : "✅ Sauvegardé dans vos mémos vocaux !";
        this.render();
        setTimeout(() => {
          this.memoToastMessage = "";
          this.render();
        }, 3000);
      }
    });

    this.querySelector("#startMemoRecordBtn")?.addEventListener("click", () => {
      this.startMemoRecording();
    });

    this.querySelector("#stopMemoRecordBtn")?.addEventListener("click", () => {
      this.stopMemoRecording();
    });

    this.querySelectorAll(".playMemoBtn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        if (id) this.playMemo(id);
      });
    });

    this.querySelectorAll(".deleteMemoBtn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        if (id) {
          this.deleteMemo(id);
        }
      });
    });

    this.querySelector("#memoTitleInput")?.addEventListener("input", (e: any) => {
      this.memoTitleInput = e.target.value;
    });

    // Custom Audio Player Bindings
    const activeMemoPlayer = this.querySelector("#activeMemoPlayer");
    if (activeMemoPlayer) {
      this.querySelector("#activeMemoPlayPauseBtn")?.addEventListener("click", () => {
        if (this.playingMemoId) {
          this.playMemo(this.playingMemoId);
        }
      });

      this.querySelector("#activeMemoStopBtn")?.addEventListener("click", () => {
        this.stopPlayingMemo();
      });

      const speeds = [0.5, 1.0, 1.5];
      speeds.forEach(speed => {
        const btn = this.querySelector(`#memoSpeedBtn-${speed.toString().replace('.', '_')}`);
        if (btn) {
          btn.addEventListener("click", () => {
            this.memoPlaybackSpeed = speed;
            if (this.currentPlayingAudio) {
              this.currentPlayingAudio.playbackRate = speed;
            }
            this.render();
          });
        }
      });

      const seekbar = this.querySelector("#memoWaveformSeekbar");
      if (seekbar) {
        seekbar.addEventListener("click", (e: any) => {
          if (this.currentPlayingAudio && this.memoDuration > 0) {
            const rect = seekbar.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percent = Math.max(0, Math.min(1, clickX / rect.width));
            this.currentPlayingAudio.currentTime = percent * this.memoDuration;
            this.memoCurrentTime = this.currentPlayingAudio.currentTime;
            this.memoProgressPercent = percent * 100;
            this.render();
          }
        });
      }
    }

    // Sound speak hooks
    this.querySelector("#playAudioBtn")?.addEventListener("click", () => {
      const word = this.currentLesson.content.vocabulary[this.vocabIndex];
      this.audio.speakFrench(word.word);
    });

    this.querySelector("#playPhraseAudioBtn")?.addEventListener("click", () => {
      const quiz = this.currentLesson.content.quiz[this.quizIndex];
      this.audio.speakFrench(quiz.phrase);
    });

    // Phonetic word highlight listeners for interactive articulation tooltips
    this.querySelectorAll(".fz-phonetic-highlight").forEach((el: any) => {
      el.addEventListener("click", (e: MouseEvent) => {
        e.stopPropagation();
        
        const word = el.getAttribute("data-word") || "";
        const phonetic = el.getAttribute("data-phonetic") || "";
        const category = el.getAttribute("data-category") || "";
        const tip = el.getAttribute("data-tip") || "";

        // Play audio instantly
        this.audio.speakFrench(word);

        // Remove existing tooltip if any
        const existingTooltip = document.getElementById("fz-phonetic-tooltip");
        if (existingTooltip) existingTooltip.remove();

        // Create and style the interactive tooltip via PhoneticsService
        const tooltip = phoneticsService.renderArticulationTooltip(
          word,
          phonetic,
          tip,
          category,
          isMg,
          () => this.audio.speakFrench(word)
        );

        document.body.appendChild(tooltip);

        // Position tooltip accurately above or below the highlighted word
        const rect = el.getBoundingClientRect();
        const tooltipWidth = 280;
        let tooltipLeft = rect.left + window.scrollX + (rect.width / 2) - (tooltipWidth / 2);
        let tooltipTop = rect.bottom + window.scrollY + 8;

        // Keep inside screen bounds
        if (tooltipLeft < 8) tooltipLeft = 8;
        if (tooltipLeft + tooltipWidth > window.innerWidth - 8) {
          tooltipLeft = window.innerWidth - (tooltipWidth + 8);
        }

        tooltip.style.left = `${tooltipLeft}px`;
        tooltip.style.top = `${tooltipTop}px`;
      });
    });

    // Micro Speech Recorder trigger
    this.querySelector("#startSpeechRecordingBtn")?.addEventListener("click", () => {
      this.handleSpeechRecording();
    });

    // Multiple Choice options click handler
    this.querySelectorAll(".quizOptionBtn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        if (!this.quizChecked) {
          const textNode = btn.querySelector("span");
          this.selectedQuizAnswer = textNode ? textNode.textContent : btn.textContent;
          this.renderLessonPlayer(); // Refresh highlight
        }
      });
    });

    // Audio speed controllers
    this.querySelectorAll(".audioSpeedBtn").forEach((btn: any) => {
      btn.addEventListener("click", (e: MouseEvent) => {
        e.stopPropagation();
        const speedVal = parseFloat(btn.getAttribute("data-speed") || "1.0");
        this.audio.setPlaybackSpeed(speedVal);
        this.renderLessonPlayer(); // Refresh UI to update speed selection state
      });
    });
  }

  private handleNextStep() {
    if (this.activeStep === "intro") {
      this.activeStep = "vocab";
      this.vocabIndex = 0;
    } else if (this.activeStep === "vocab") {
      if (this.vocabIndex < this.currentLesson.content.vocabulary.length - 1) {
        // Spaced repetition: queue the vocab word into DatabaseEngine
        const word = this.currentLesson.content.vocabulary[this.vocabIndex];
        this.db.addToRevisionDeck(word.word);

        this.vocabIndex++;
      } else {
        // Save the last word too
        const word = this.currentLesson.content.vocabulary[this.vocabIndex];
        this.db.addToRevisionDeck(word.word);

        this.activeStep = "quiz";
        this.quizIndex = 0;
        this.selectedQuizAnswer = null;
        this.quizChecked = false;
        this.recording = false;
        this.micScoreResult = null;
        this.userWaveform = [];
        this.timingGaps = [];
        this.prosodyMismatches = [];
      }
    } else if (this.activeStep === "quiz") {
      if (this.quizIndex < this.currentLesson.content.quiz.length - 1) {
        this.quizIndex++;
        this.selectedQuizAnswer = null;
        this.quizChecked = false;
        this.recording = false;
        this.micScoreResult = null;
        this.userWaveform = [];
        this.timingGaps = [];
        this.prosodyMismatches = [];
      } else {
        this.activeStep = "complete";
      }
    }
    this.render();
  }

  private handlePrevStep() {
    if (this.activeStep === "vocab") {
      if (this.vocabIndex > 0) {
        this.vocabIndex--;
      } else {
        this.activeStep = "intro";
      }
    }
    this.render();
  }

  private handleCheckQuiz() {
    const quiz = this.currentLesson.content.quiz[this.quizIndex];
    this.quizChecked = true;
    this.quizCorrect = this.selectedQuizAnswer === quiz.answer;
    
    // Add small XP on correct option immediately to gamify
    if (this.quizCorrect) {
      this.db.addXp(10);
    } else {
      this.lessonMistakes++;
      this.db.recordMistake(
        quiz.phrase || quiz.question || "",
        quiz.translation || quiz.answer || "",
        quiz.question || "",
        quiz.options,
        quiz.answer
      );
    }
    this.render();
  }

  private calculateWordSimilarity(s1: string, s2: string): number {
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1.0;
    if (s1.includes(s2) || s2.includes(s1)) return 0.82;

    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
        else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }

    const maxLen = Math.max(m, n);
    if (maxLen === 0) return 1.0;
    const dist = dp[m][n];
    return Math.max(0, (maxLen - dist) / maxLen);
  }

  public evaluateRealtimeWordAccuracy(phrase: string, speechText: string) {
    if (!phrase) return { words: [], overallScore: 0, matchedCount: 0 };

    const normSpeech = (speechText || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡"']/g, " ")
      .trim();

    const spokenWords = normSpeech ? normSpeech.split(/\s+/).filter(Boolean) : [];
    const rawWords = phrase.split(/\s+/).filter(Boolean);

    let totalScore = 0;
    let matchedCount = 0;

    const wordEvaluations = rawWords.map((word) => {
      const cleanWord = word
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡"']/g, "");

      if (!cleanWord) {
        return { rawWord: word, cleanWord, score: 100, status: "green" as const };
      }

      let maxSim = 0;
      for (const sw of spokenWords) {
        const sim = this.calculateWordSimilarity(cleanWord, sw);
        if (sim > maxSim) maxSim = sim;
      }

      let score = 0;
      let status: "green" | "yellow" | "red" = "red";

      if (maxSim >= 0.8) {
        score = 100;
        status = "green";
        matchedCount++;
      } else if (maxSim >= 0.5) {
        score = Math.round(maxSim * 100);
        status = "yellow";
        matchedCount += 0.7;
      } else {
        score = Math.round(maxSim * 100);
        status = "red";
      }

      totalScore += score;
      return { rawWord: word, cleanWord, score, status };
    });

    const overallScore = rawWords.length > 0 ? Math.round(totalScore / rawWords.length) : 0;

    return {
      words: wordEvaluations,
      overallScore,
      matchedCount: Math.min(rawWords.length, Math.round(matchedCount))
    };
  }

  private renderRealtimeAccuracyWidget(phrase: string, speechText: string, isMg: boolean): string {
    const evalResult = this.evaluateRealtimeWordAccuracy(phrase, speechText);
    const { words, overallScore } = evalResult;

    let gaugeColor = "from-rose-500 to-pink-500";
    let gaugeText = isMg ? "🔴 Miandry feo / Mbola tsy azo" : "🔴 Attente de prononciation / Non reconnu";
    let badgeBg = "bg-rose-950/50 text-rose-300 border-rose-500/40";

    if (overallScore >= 80) {
      gaugeColor = "from-emerald-500 via-teal-400 to-emerald-400";
      gaugeText = isMg ? "🟢 Fanononana tsara dia tsara!" : "🟢 Excellente prononciation !";
      badgeBg = "bg-emerald-950/60 text-emerald-300 border-emerald-500/50 shadow-emerald-500/20";
    } else if (overallScore >= 50) {
      gaugeColor = "from-amber-500 via-yellow-400 to-amber-400";
      gaugeText = isMg ? "🟡 Azo sary an-tsaina, mbola azo hatsaraina" : "🟡 Prononciation moyenne (Presque bon)";
      badgeBg = "bg-amber-950/60 text-amber-300 border-amber-500/50 shadow-amber-500/20";
    }

    const wordBadgesHtml = words.map(w => {
      let chipStyle = "bg-slate-900/80 text-slate-400 border-slate-700/60";
      let statusIcon = "🔴";
      
      if (w.status === "green") {
        chipStyle = "bg-emerald-950/80 text-emerald-300 border-emerald-500/60 ring-1 ring-emerald-500/30 shadow-xs";
        statusIcon = "🟢";
      } else if (w.status === "yellow") {
        chipStyle = "bg-amber-950/80 text-amber-300 border-amber-500/60 ring-1 ring-amber-500/30 shadow-xs";
        statusIcon = "🟡";
      }

      return `
        <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all duration-200 ${chipStyle}">
          <span class="text-[10px]">${statusIcon}</span>
          <span>${w.rawWord}</span>
          <span class="text-[10px] opacity-75 font-mono">(${w.score}%)</span>
        </div>
      `;
    }).join("");

    return `
      <div id="realtimeAccuracyIndicator" class="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl transition-all">
        <div class="flex items-center justify-between gap-2 flex-wrap border-b border-slate-800/80 pb-3">
          <div class="flex items-center space-x-2">
            <span class="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-bold border border-indigo-500/20">🎯</span>
            <div>
              <span class="text-xs font-extrabold uppercase tracking-wider text-slate-200 block font-mono">
                ${isMg ? "Fitsapana Fanononana Tsy Mijanona (Web Speech API)" : "Analyse Accuracy Web Speech API"}
              </span>
              <span class="text-[10px] text-slate-400 font-medium">
                ${isMg ? "Aseho avy hatrany ny mari-pahaizana isan-teny amin'ny alalan'ny lokony" : "Coloration en temps réel de la précision des mots prononcés"}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-full text-[11px] font-mono font-black border ${badgeBg} shadow-xs">
              ${overallScore}% ${isMg ? "Lavorary" : "Précision"}
            </span>
          </div>
        </div>

        <!-- Real-time Accuracy Progress Gauge Bar -->
        <div class="space-y-1.5">
          <div class="flex justify-between items-center text-[10px] font-mono font-bold">
            <span class="text-slate-300">${gaugeText}</span>
            <span class="text-slate-400 font-mono">${overallScore} / 100</span>
          </div>
          <div class="w-full h-3 bg-slate-950 rounded-full border border-slate-800 overflow-hidden relative shadow-inner">
            <div class="h-full bg-gradient-to-r ${gaugeColor} rounded-full transition-all duration-300 ease-out shadow-sm" style="width: ${overallScore}%"></div>
          </div>
        </div>

        <!-- Word-by-Word Color Coded Breakdown Grid -->
        <div class="pt-1">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 font-mono">
            ${isMg ? "Teny isan-tokony sy Lokon'ny Haviazana :" : "Mots de la phrase & Précision individuelle :"}
          </span>
          <div class="flex flex-wrap gap-2">
            ${wordBadgesHtml}
          </div>
        </div>

        <!-- Legend Footer -->
        <div class="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-2 border-t border-slate-800/60">
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> 🟢 ${isMg ? "Teny marina (100%)" : "Exact (100%)"}</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> 🟡 ${isMg ? "Manakaiky (60-80%)" : "Approximatif (60-80%)"}</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-500 inline-block"></span> 🔴 ${isMg ? "Tsy mbola azo (0%)" : "Non reconnu (0%)"}</span>
        </div>
      </div>
    `;
  }

  private renderLiveMatchedPhrase(phrase: string, interimText: string): string {
    if (!phrase) return "";
    if (!interimText) return this.highlightPhoneticWords(phrase, true);

    const evalResult = this.evaluateRealtimeWordAccuracy(phrase, interimText);
    return evalResult.words
      .map((w) => {
        if (w.status === "green") {
          return `<span class="inline-block text-emerald-400 font-black bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/50 shadow-xs animate-pulse">${w.rawWord}</span>`;
        } else if (w.status === "yellow") {
          return `<span class="inline-block text-amber-300 font-extrabold bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-500/50 shadow-xs">${w.rawWord}</span>`;
        }
        return `<span class="inline-block text-slate-300">${w.rawWord}</span>`;
      })
      .join(" ");
  }

  private async handleSpeechRecording() {
    this.recording = true;
    this.micScoreResult = null;
    this.interimTranscription = "";
    this.timingGaps = [];
    this.prosodyMismatches = [];
    this.userWaveform = [];

    const quiz = this.currentLesson.content.quiz[this.quizIndex];
    const native = this.getNativeWaveform(quiz.phrase);
    const progress = this.db.getProgress();
    const isMg = progress.accessibility.language === "mg";

    // Dynamic real-time recording wave interval
    this.recordingWaveform = Array(35).fill(6);
    let step = 0;
    this.recordingTimer = setInterval(() => {
      // Create a lively animating speech waveform that fluctuates
      for (let i = 0; i < 35; i++) {
        const noise = Math.random() * 45;
        // Apply envelope so it looks like speech phrases being spoken
        const baseEnvelope = Math.sin((i / 35) * Math.PI) * 40;
        this.recordingWaveform[i] = Math.max(6, Math.min(95, Math.round(baseEnvelope + noise)));
      }
      step++;
      
      // Live updates to DOM without full card re-render
      const liveBarsContainer = this.querySelector("#liveRecordingBars");
      if (liveBarsContainer) {
        liveBarsContainer.innerHTML = this.recordingWaveform
          .map((h) => `<div class="w-[3px] bg-rose-500 rounded-full transition-all duration-75" style="height: ${h}%"></div>`)
          .join("");
      }
    }, 85);

    this.render(); // Triggers display update (e.g. status bar and buttons update)

    try {
      const res = await this.audio.recordAndEvaluate(quiz.phrase, (transcript) => {
        this.interimTranscription = transcript;
        
        // Live update transcript banner in DOM
        const transcriptEl = this.querySelector("#liveInterimTranscript");
        if (transcriptEl) {
          transcriptEl.innerHTML = `<span class="text-rose-400 font-extrabold mr-1.5">🎙️ ${isMg ? "Feo re:" : "En direct:"}</span> <span class="text-emerald-300 font-mono font-bold bg-slate-800 px-2 py-0.5 rounded-lg border border-emerald-500/30">"${transcript}"</span>`;
        }

        // Live update matched words in phrase
        const phraseEl = this.querySelector("#shadowingTargetPhrase");
        if (phraseEl) {
          phraseEl.innerHTML = this.renderLiveMatchedPhrase(quiz.phrase, transcript);
        }

        // Live update real-time accuracy indicator container
        const accuracyContainer = this.querySelector("#realtimeAccuracyIndicator");
        if (accuracyContainer) {
          const parent = accuracyContainer.parentElement;
          if (parent) {
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = this.renderRealtimeAccuracyWidget(quiz.phrase, transcript, isMg);
            const newEl = tempDiv.firstElementChild;
            if (newEl) {
              parent.replaceChild(newEl, accuracyContainer);
            }
          }
        }
      });
      
      // Clean up interval
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }
      
      this.recording = false;
      this.micScoreResult = res;

      // Compute compared user wave and mismatch points
      const comparison = this.computeWaveformComparison(native, res.rhythm, res.accuracy);
      this.userWaveform = comparison.user;
      this.timingGaps = comparison.timingGaps;
      this.prosodyMismatches = comparison.prosodyMismatches;

      // Gain XP for oral shadowing
      this.db.addXp(20);

      // Record a mistake if pronunciation score is low (< 70)
      if (res && res.score < 70) {
        this.lessonMistakes++;
        this.db.recordMistake(
          quiz.phrase,
          quiz.translation || "",
          quiz.question || "Shadowing / Pronunciation Practice",
          undefined,
          quiz.phrase
        );
      }

      this.render();
    } catch (err) {
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }
      this.recording = false;
      this.render();
    }
  }

  private handleFinishLesson() {
    const isPerfect = this.lessonMistakes === 0;
    const lessonInfo = {
      id: this.currentLesson.id,
      titleFr: this.currentLesson.titleFr || this.currentLesson.title || "",
      titleMg: this.currentLesson.titleMg || this.currentLesson.title || ""
    };

    // Grant lesson completion and update streak via GameEngine
    if (this.game) {
      this.game.completeLesson(this.currentLesson.id, this.currentLesson.xp);
    } else {
      this.db.completeLesson(this.currentLesson.id);
      this.db.addXp(this.currentLesson.xp);
    }
    
    // Dispatch perfected event if no mistakes, otherwise standard completion
    if (isPerfect) {
      window.dispatchEvent(new CustomEvent("feheziko_lesson_perfected", {
        detail: { lesson: lessonInfo }
      }));
    } else {
      window.dispatchEvent(new CustomEvent("feheziko_lesson_completed", {
        detail: { lesson: lessonInfo }
      }));
    }

    this.currentLesson = null;
    this.render();

    // Trigger state change notification
    window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
  }

  private getNativeWaveform(phrase: string): number[] {
    const len = 35; // 35 bars
    const result: number[] = [];
    let hash = 0;
    for (let i = 0; i < phrase.length; i++) {
      hash = phrase.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);

    for (let i = 0; i < len; i++) {
      const baseVal = Math.sin((i / len) * Math.PI) * 55; // envelope
      const highFreq = Math.sin((i / len) * Math.PI * 6 + hash) * 25;
      const noise = Math.sin((i / len) * Math.PI * 14 + (hash >> 1)) * 10;
      let val = baseVal + highFreq + noise + 15;
      
      // Make it drop to near zero at word boundaries (deterministically spaced)
      const wordBound = Math.sin((i / len) * Math.PI * 4 + (hash % 3)) > 0.85 ? 0.05 : 1.0;
      val *= wordBound;
      
      result.push(Math.max(6, Math.min(95, Math.round(val))));
    }
    return result;
  }

  private computeWaveformComparison(native: number[], rhythmScore: number, accuracyScore: number): {
    user: number[];
    timingGaps: number[];
    prosodyMismatches: number[];
  } {
    const user: number[] = [];
    const timingGaps: number[] = [];
    const prosodyMismatches: number[] = [];
    
    // Shift factor based on rhythm score
    const maxShift = Math.floor((100 - rhythmScore) / 12); // lower rhythm = larger shifting
    
    for (let i = 0; i < native.length; i++) {
      // Base height derived from native
      let h = native[i];
      
      // Introduce time shift / lag
      let sourceIndex = i;
      if (maxShift > 0 && i > 5 && i < native.length - 5) {
        // Apply some lag or stretching to simulate speaking too slow/fast
        const shift = Math.sin(i / 4) * maxShift;
        sourceIndex = Math.max(0, Math.min(native.length - 1, Math.round(i - shift)));
        h = native[sourceIndex];
      }
      
      // Introduce accuracy fluctuations
      const maxVar = (100 - accuracyScore) * 0.6; // lower accuracy = more random deviation
      const dev = (Math.sin(i * 1.5) * maxVar) + (Math.random() * maxVar * 0.4);
      h = Math.max(6, Math.min(95, Math.round(h + dev)));
      
      user.push(h);

      // Compare native and user to find mismatches
      const diff = Math.abs(native[i] - h);
      
      // If native is high but user is very low, it's a timing/rhythm gap (silence where native spoke)
      if (native[i] > 35 && h < 15) {
        timingGaps.push(i);
      }
      // If there is general amplitude/pitch variance, it's a prosody mismatch
      else if (diff > 35) {
        prosodyMismatches.push(i);
      }
    }
    
    return { user, timingGaps, prosodyMismatches };
  }

  private renderWaveformWidget(quiz: any, isMg: boolean): string {
    const native = this.getNativeWaveform(quiz.phrase);
    
    const t = isMg ? {
      nativeLabel: "Fitenin'ny Model (Natif)",
      userLabel: "Ny feonao (Enregistré)",
      liveLabel: "Mampitaha ny feo...",
      gapLabel: "Hantsana ara-potoana",
      prosodyLabel: "Fahasamihafan'ny laonina",
      alignedLabel: "Mifanaraka tsara",
      hint: "Soso-kevitra: Jereo ireo faritra misy loko mena/mavo hitanao eo amin'ny kisary mba hanitsiana ny fitaonana sy ny haavon'ny feo."
    } : {
      nativeLabel: "Modèle Natif",
      userLabel: "Votre voix",
      liveLabel: "Analyse prosodique...",
      gapLabel: "Écart de rythme (Timing Gap)",
      prosodyLabel: "Différence d'accentuation",
      alignedLabel: "Parfaitement aligné",
      hint: "Astuce : Visualisez les zones colorées en rouge/jaune pour caler votre rythme et vos accentuations sur le modèle."
    };

    // Draw bars
    const drawTrack = (heights: number[], colorClass: string, isNative: boolean) => {
      return heights.map((h, i) => {
        let barColor = colorClass;
        let isGap = !isNative && this.timingGaps.includes(i);
        let isMismatch = !isNative && this.prosodyMismatches.includes(i);
        
        if (isGap) {
          barColor = "bg-rose-500 shadow-xs shadow-rose-500/20 animate-pulse";
        } else if (isMismatch) {
          barColor = "bg-amber-500 shadow-xs shadow-amber-500/20";
        }

        return `
          <div class="relative group flex-1 h-full flex flex-col justify-center items-center">
            <div class="w-full ${barColor} rounded-full transition-all duration-300" style="height: ${h}%"></div>
            <!-- Interactive Tooltip on Hovering bars -->
            <div class="absolute bottom-full mb-1 bg-slate-900 text-[9px] text-white py-1 px-1.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-10 font-mono whitespace-nowrap">
              ${isNative ? `Amp: ${h}%` : isGap ? t.gapLabel : isMismatch ? t.prosodyLabel : t.alignedLabel}
            </div>
          </div>
        `;
      }).join("");
    };

    return `
      <div class="bg-slate-950/40 border border-white/10 rounded-2xl p-5 space-y-4 shadow-inner relative select-none">
        
        <!-- Header status -->
        <div class="flex justify-between items-center text-[10px] uppercase font-mono tracking-wider">
          <span class="text-indigo-400 font-extrabold flex items-center gap-1.5">
            <span class="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
            PROSODY COMPILER
          </span>
          <span class="text-slate-400 font-semibold">Side-by-Side Timeline (Matched)</span>
        </div>

        <div class="grid grid-rows-2 gap-4 h-36 relative">
          <!-- Timeline Vertical Alignment Guidelines -->
          <div class="absolute inset-y-0 inset-x-0 flex justify-between pointer-events-none">
            ${Array(6).fill(0).map(() => `<div class="h-full border-r border-white/[0.04] border-dashed"></div>`).join("")}
          </div>

          <!-- Track 1: Native Speaker Model -->
          <div class="flex flex-col justify-between">
            <div class="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1 px-1">
              <span class="flex items-center gap-1">👤 ${t.nativeLabel}</span>
              <span class="text-indigo-400 font-mono">FR-Speaker</span>
            </div>
            <div class="flex-1 flex items-end justify-between gap-[3px] bg-slate-950/20 border border-white/5 rounded-xl px-2.5 py-1.5 h-12">
              ${drawTrack(native, "bg-indigo-400/80 hover:bg-indigo-400", true)}
            </div>
          </div>

          <!-- Track 2: User Voice Recorded -->
          <div class="flex flex-col justify-between">
            <div class="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1 px-1">
              <span class="flex items-center gap-1">🎙️ ${t.userLabel}</span>
              ${this.recording 
                ? `<span class="text-rose-400 font-mono animate-pulse">Rec: 0.0s - 2.5s</span>` 
                : this.micScoreResult 
                  ? `<span class="text-emerald-400 font-mono">Score: ${this.micScoreResult.score}%</span>`
                  : `<span class="text-slate-500 font-mono">Silent</span>`
              }
            </div>

            <!-- Dynamic UI based on recording state -->
            ${this.recording
              ? `
              <div id="liveRecordingBars" class="flex-1 flex items-end justify-between gap-[3px] bg-slate-950/20 border border-white/5 rounded-xl px-2.5 py-1.5 h-12">
                ${this.recordingWaveform.map((h) => `<div class="w-[3px] bg-rose-500 rounded-full transition-all duration-75" style="height: ${h}%"></div>`).join("")}
              </div>
              `
              : this.micScoreResult
                ? `
                <div class="flex-1 flex items-end justify-between gap-[3px] bg-slate-950/20 border border-white/5 rounded-xl px-2.5 py-1.5 h-12">
                  ${drawTrack(this.userWaveform, "bg-emerald-400/80 hover:bg-emerald-400", false)}
                </div>
                `
                : `
                <div class="flex-1 flex items-center justify-center bg-slate-950/30 border border-white/5 border-dashed rounded-xl h-12">
                  <span class="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Awaiting user vocal input</span>
                </div>
                `
            }
          </div>
        </div>

        <!-- Annotation Legend / Overlay Metrics (Only show when results are in!) -->
        ${this.micScoreResult && (this.timingGaps.length > 0 || this.prosodyMismatches.length > 0)
          ? `
          <div class="bg-slate-950/30 border border-white/5 rounded-xl p-3 space-y-2 text-[10px] font-mono text-slate-300">
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 bg-rose-500 rounded-sm"></span>
                <span class="font-bold text-rose-300">${t.gapLabel} (${this.timingGaps.length * 70}ms offset)</span>
              </span>
              <span class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 bg-amber-500 rounded-sm"></span>
                <span class="font-bold text-amber-300">${t.prosodyLabel}</span>
              </span>
              <span class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 bg-indigo-500 rounded-sm"></span>
                <span class="font-bold text-indigo-300">Aligned Peaks</span>
              </span>
            </div>
            <p class="text-[9px] text-slate-400 font-sans italic leading-relaxed pt-1.5 border-t border-white/[0.04]">
              ${t.hint}
            </p>
          </div>
          `
          : ""
        }
      </div>
    `;
  }

  private renderLessonCommentsHtml(): string {
    if (!this.currentLesson) return "";
    const lessonId = this.currentLesson.id;
    const comments = this.db.getLessonComments(lessonId);
    const isMg = this.db.getProgress().accessibility.language === "mg";

    return `
      <div class="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-md space-y-5">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div class="flex items-center space-x-2.5">
            <span class="text-xl">💬</span>
            <div>
              <h4 class="font-extrabold text-slate-800 text-sm">${isMg ? "Hafatra sy Fanamarihan'ny Mpianatra (Commentaires A1)" : "Espace Commentaires & Discussion"}</h4>
              <p class="text-[11px] text-slate-500">${isMg ? "Resaho sy anontanina momba ity lesona ity" : "Posez vos questions ou donnez vos remarques sur cette leçon"}</p>
            </div>
          </div>
          <span class="bg-indigo-50 text-indigo-700 font-mono font-bold text-xs px-2.5 py-1 rounded-full border border-indigo-100">
            ${comments.length} ${comments.length > 1 ? (isMg ? "haddara" : "commentaires") : (isMg ? "hafatra" : "commentaire")}
          </span>
        </div>

        <!-- Add New Comment Form -->
        <form id="addLessonCommentForm" class="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70">
          <div class="flex flex-col sm:flex-row gap-2">
            <input type="text" id="commentAuthorInput" placeholder="${isMg ? "Anaranao (na avelao ho Mpianatra)..." : "Votre nom..."}" class="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1" />
            <select id="commentRoleSelect" class="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="Apprenant A1">Apprenant A1</option>
              <option value="Apprenant A2">Apprenant A2</option>
              <option value="Mpampianatra">Enseignant</option>
            </select>
          </div>
          <textarea id="commentTextInput" rows="2" required placeholder="${isMg ? "Manorata fanamarihana na fanontaniana momba ity lesona ity..." : "Écrivez votre commentaire ou votre question..."}" class="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"></textarea>
          <div class="flex justify-end">
            <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95">
              <span>💬</span>
              <span>${isMg ? "Halefa ny comment" : "Publier le commentaire"}</span>
            </button>
          </div>
        </form>

        <!-- Comments List -->
        <div class="space-y-3 max-h-80 overflow-y-auto pr-1">
          ${comments.length === 0 ? `
            <div class="text-center py-6 text-slate-400 text-xs">
              <p>💬 ${isMg ? "Mbola tsy misy fanamarihana. Magasaha ho voalohany!" : "Aucun commentaire pour le moment. Soyez le premier !"}</p>
            </div>
          ` : comments.map((c: any) => `
            <div class="bg-slate-50/50 hover:bg-slate-50 transition-colors p-3.5 rounded-2xl border border-slate-200/60 space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <div class="w-7 h-7 rounded-full ${c.role.includes("Enseignant") || c.role.includes("Mpampianatra") ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-800"} flex items-center justify-center font-bold text-xs shadow-2xs">
                    ${c.author ? c.author.charAt(0).toUpperCase() : "M"}
                  </div>
                  <div>
                    <div class="flex items-center gap-1.5">
                      <span class="font-bold text-xs text-slate-800">${c.author || "Mpianatra"}</span>
                      <span class="text-[9px] font-bold px-2 py-0.5 rounded-full ${c.role.includes("Enseignant") || c.role.includes("Mpampianatra") ? "bg-amber-100 text-amber-900 border border-amber-200" : "bg-slate-200/70 text-slate-600"}">
                        ${c.role}
                      </span>
                    </div>
                    <span class="text-[9px] text-slate-400 block">${new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <button class="likeCommentBtn text-slate-400 hover:text-rose-500 font-bold text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer" data-id="${c.id}">
                  <span>❤️</span>
                  <span class="text-[11px] font-mono">${c.likes || 0}</span>
                </button>
              </div>
              <p class="text-xs text-slate-700 leading-relaxed pl-9">${c.text}</p>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  private bindLessonCommentsEvents(): void {
    const form = this.querySelector("#addLessonCommentForm") as HTMLFormElement;
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!this.currentLesson) return;
        const authorInput = this.querySelector("#commentAuthorInput") as HTMLInputElement;
        const roleSelect = this.querySelector("#commentRoleSelect") as HTMLSelectElement;
        const textInput = this.querySelector("#commentTextInput") as HTMLTextAreaElement;

        const author = authorInput?.value.trim() || "Mpianatra";
        const role = roleSelect?.value || "Apprenant A1";
        const text = textInput?.value.trim();

        if (text) {
          this.db.addLessonComment(this.currentLesson.id, author, text, role);
          this.render();
        }
      });
    }

    this.querySelectorAll(".likeCommentBtn").forEach((btn: Element) => {
      btn.addEventListener("click", (e: Event) => {
        const commentId = (e.currentTarget as HTMLElement).dataset.id;
        if (commentId && this.currentLesson) {
          this.db.likeLessonComment(this.currentLesson.id, commentId);
          this.render();
        }
      });
    });
  }

  private highlightPhoneticWords(text: string, isMg: boolean): string {
    return phoneticsService.highlightPhoneticWords(text, isMg);
  }
}

customElements.define("fz-lesson", FzLesson);
