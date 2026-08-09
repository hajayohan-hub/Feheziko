/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseEngine } from "../core/DatabaseEngine";
import { AudioEngine } from "../core/AudioEngine";

export class FzDialogue extends HTMLElement {
  private db!: DatabaseEngine;
  private audio!: AudioEngine;

  // Main navigation tab: Classic dialogue mode vs Role Play mode
  private mainTab: "listen" | "roleplay" = "listen";

  // Classic Dialogue Player State
  private activeDialogue: any = null;
  private selectedLineIndex: number | null = null;
  private showTranslationMap: { [key: number]: boolean } = {};
  private shadowingActive: boolean = false;
  private speechResult: any = null;
  private realtimeAnalysis: any = null;
  private isAutoPlaying: boolean = false;
  private autoPlayTimeout: any = null;
  private currentFilter: "all" | "children" | "adults" = "all";

  // Role Play Section State
  private rolePlayDialogue: any = null;
  private rolePlayState: "config" | "playing" | "summary" = "config";
  private userRole: "A" | "B" = "A";
  private memoryLevel: "easy" | "medium" | "hard" = "easy";
  private rolePlayLineIndex: number = 0;
  private rolePlayScores: number[] = [];
  private isAiSpeaking: boolean = false;
  private rolePlayRecording: boolean = false;
  private rolePlaySpeechResult: any = null;
  private showHintInRolePlay: boolean = false;

  constructor() {
    super();
  }

  connectedCallback() {
    this.db = (window as any).feheziko?.db;
    this.audio = (window as any).feheziko?.audio;
    this.render();

    window.addEventListener("feheziko_state_changed", this.handleStateChanged);
    window.addEventListener("feheziko_pronunciation_realtime", this.handleRealtimePronunciation);
    window.addEventListener("feheziko_voice_activity", this.handleVoiceActivity);
  }

  disconnectedCallback() {
    this.stopAutoPlay();
    window.removeEventListener("feheziko_state_changed", this.handleStateChanged);
    window.removeEventListener("feheziko_pronunciation_realtime", this.handleRealtimePronunciation);
    window.removeEventListener("feheziko_voice_activity", this.handleVoiceActivity);
  }

  private handleStateChanged = () => {
    this.render();
  };

  private handleRealtimePronunciation = (e: any) => {
    if ((this.shadowingActive || this.rolePlayRecording) && e.detail) {
      this.realtimeAnalysis = e.detail;
      this.updateShadowingLiveDisplay();
    }
  };

  private handleVoiceActivity = (e: any) => {
    if ((!this.shadowingActive && !this.rolePlayRecording) || !e.detail) return;
    const { active, deviation } = e.detail;

    const levelBar = this.querySelector("#voiceLevelBar") as HTMLElement;
    if (levelBar) {
      const pct = Math.min(100, Math.max(8, (deviation / 40) * 100));
      levelBar.style.width = `${pct}%`;
      levelBar.className = active
        ? "h-full bg-emerald-400 transition-all duration-75 rounded-full"
        : "h-full bg-amber-400 transition-all duration-75 rounded-full";
    }

    const eqContainer = this.querySelector("#voiceEqBars");
    if (eqContainer) {
      const bars = eqContainer.querySelectorAll(".eq-bar");
      bars.forEach((bar: any, idx: number) => {
        const randomFactor = Math.sin((Date.now() / 120) + idx * 1.5) * 0.4 + 0.6;
        const height = active ? Math.min(100, Math.round((deviation / 35) * 100 * randomFactor)) : 12;
        bar.style.height = `${Math.max(12, height)}%`;
        bar.className = `eq-bar w-1.5 rounded-full transition-all duration-75 ${
          active ? "bg-emerald-400" : "bg-slate-700"
        }`;
      });
    }
  };

  private updateShadowingLiveDisplay() {
    if (!this.realtimeAnalysis) return;

    const liveScoreEl = this.querySelector("#shadowLiveScore");
    if (liveScoreEl) {
      liveScoreEl.textContent = `${this.realtimeAnalysis.liveScore}% Match`;
    }

    const liveTranscriptEl = this.querySelector("#shadowLiveTranscript");
    if (liveTranscriptEl && this.realtimeAnalysis.transcript) {
      liveTranscriptEl.textContent = `"${this.realtimeAnalysis.transcript}"`;
    }

    const liveFeedbackEl = this.querySelector("#shadowLiveFeedback");
    if (liveFeedbackEl && this.realtimeAnalysis.feedback) {
      liveFeedbackEl.textContent = this.realtimeAnalysis.feedback;
    }

    if (this.realtimeAnalysis.wordStatuses) {
      this.realtimeAnalysis.wordStatuses.forEach((ws: any, idx: number) => {
        const chip = this.querySelector(`#shadow-word-chip-${idx}`);
        if (chip) {
          if (ws.status === "matched") {
            chip.className = "inline-block px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 scale-105 transition-all";
          } else if (ws.status === "fuzzy") {
            chip.className = "inline-block px-2.5 py-1 rounded-xl text-xs font-mono font-medium bg-amber-500/30 text-amber-300 border border-amber-500/50 transition-all";
          } else {
            chip.className = "inline-block px-2.5 py-1 rounded-xl text-xs font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700 opacity-60 transition-all";
          }
        }
      });
    }
  }

  private generateClozeText(text: string): string {
    return text.split(" ").map(word => {
      const clean = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡"']/g, "");
      if (clean.length <= 2) return word;
      const punctuation = word.slice(clean.length);
      const first = clean[0];
      const rest = clean.slice(1).replace(/[a-zA-ZàâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]/g, "_");
      return first + rest + punctuation;
    }).join(" ");
  }

  private render() {
    if (!this.db || !this.audio) return;

    if (this.rolePlayDialogue) {
      if (this.rolePlayState === "config") {
        this.renderRolePlayConfig();
      } else if (this.rolePlayState === "playing") {
        this.renderRolePlayStage();
      } else if (this.rolePlayState === "summary") {
        this.renderRolePlaySummary();
      }
    } else if (this.activeDialogue) {
      this.renderActiveDialogue();
    } else {
      this.renderDialogueSelector();
    }
  }

  /**
   * Main Dialogue Selector with Mode Tabs (Écoute vs Role Play)
   */
  private renderDialogueSelector() {
    const progress = this.db.getProgress();
    const content = (window as any).feheziko?.languageContent;
    if (!content) return;

    const isMg = progress.accessibility.language === "mg";
    const t = isMg ? {
      title: "Resaka sy Dinika A1 & Jeu de Rôle",
      subtitle: "Mianara miteny amin'ny alalan'ny fifanakalozan-kevitra sy role play fifaneraserana.",
      tabListen: "💬 Écoute & Shadowing",
      tabRoleplay: "🎭 Jeu de Rôle (Role Play)",
      filterAll: "Rehetra (Tous)",
      filterChildren: "👧👦 Zaza (Enfants)",
      filterAdults: "👩👨 Lehibe (Adultes)",
      startListenBtn: "Entrer en dialogue",
      startRoleplayBtn: "🎭 Démarrer le Role Play",
      situationLabel: "Tranga :"
    } : {
      title: "Dialogues A1 & Jeu de Rôle Interactif",
      subtitle: "Pratiquez l'écoute guidée ou incarnez un personnage en mode Role Play.",
      tabListen: "💬 Écoute & Shadowing",
      tabRoleplay: "🎭 Jeu de Rôle (Role Play)",
      filterAll: "Tous les dialogues A1",
      filterChildren: "👧👦 Voix d'Enfants",
      filterAdults: "👩👨 Voix d'Adultes",
      startListenBtn: "Entrer en dialogue",
      startRoleplayBtn: "🎭 Démarrer le Role Play",
      situationLabel: "Situation :"
    };

    const allDialogues = content.dialogues || [];
    const filteredDialogues = allDialogues.filter((dlg: any) => {
      if (this.currentFilter === "children") return dlg.category === "children";
      if (this.currentFilter === "adults") return dlg.category === "adults";
      return true;
    });

    let html = `
      <div class="space-y-6">
        <div>
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 class="text-2xl font-bold text-slate-800">${t.title}</h2>
              <p class="text-xs text-slate-500 mt-1">${t.subtitle}</p>
            </div>
            <span class="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl border border-indigo-100 self-start">
              🗣️ 16 Dialogues & Mode Role Play
            </span>
          </div>

          <!-- Main Mode Switcher Tabs -->
          <div class="flex items-center space-x-3 mt-5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 max-w-md">
            <button id="tab-listen" class="flex-1 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              this.mainTab === "listen"
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }">
              <span>${t.tabListen}</span>
            </button>
            <button id="tab-roleplay" class="flex-1 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              this.mainTab === "roleplay"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }">
              <span>${t.tabRoleplay}</span>
              <span class="text-[9px] bg-amber-400 text-slate-900 px-1.5 py-0.2 rounded-full font-mono">NEW</span>
            </button>
          </div>

          <!-- Category Filter Tabs -->
          <div class="flex items-center space-x-2 mt-4 overflow-x-auto pb-1">
            <button id="filter-all" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              this.currentFilter === "all"
                ? "bg-slate-800 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }">${t.filterAll}</button>
            <button id="filter-children" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              this.currentFilter === "children"
                ? "bg-slate-800 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }">${t.filterChildren}</button>
            <button id="filter-adults" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              this.currentFilter === "adults"
                ? "bg-slate-800 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }">${t.filterAdults}</button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    `;

    filteredDialogues.forEach((dlg: any) => {
      const isCompleted = progress.completedDialogues.includes(dlg.id);
      const voiceA = dlg.voices?.A || { avatar: "👤", label: dlg.roles?.A || "Role A" };
      const voiceB = dlg.voices?.B || { avatar: "👥", label: dlg.roles?.B || "Role B" };

      html += `
        <div class="bg-white border border-slate-200/80 hover:border-indigo-400 rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all duration-150">
          <div>
            <div class="flex justify-between items-center">
              <div class="flex items-center space-x-1.5">
                <span class="text-xl bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">${voiceA.avatar}</span>
                <span class="text-xs text-slate-400">↔</span>
                <span class="text-xl bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">${voiceB.avatar}</span>
              </div>
              ${
                isCompleted
                  ? `<span class="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">✓ Completed</span>`
                  : `<span class="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">Dialogue A1</span>`
              }
            </div>

            <h3 class="font-extrabold text-slate-800 text-base mt-3 leading-snug">${dlg.title}</h3>
            
            <!-- Voices Badge Pills -->
            <div class="flex flex-wrap gap-1.5 mt-2.5">
              <span class="text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
                ${voiceA.avatar} ${voiceA.label}
              </span>
              <span class="text-[10px] font-medium bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-md">
                ${voiceB.avatar} ${voiceB.label}
              </span>
            </div>

            <p class="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-3">${t.situationLabel}</p>
            <p class="text-xs text-slate-600 mt-1 leading-relaxed italic">"${dlg.situation}"</p>
          </div>

          <div class="mt-6">
            ${
              this.mainTab === "listen"
                ? `
              <button data-id="${dlg.id}" class="openDialogueBtn w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition-colors shadow-xs flex items-center justify-center space-x-2 cursor-pointer">
                <span>💬</span>
                <span>${t.startListenBtn}</span>
              </button>
              `
                : `
              <button data-id="${dlg.id}" class="startRoleplayBtn w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center space-x-2 cursor-pointer">
                <span>🎭</span>
                <span>${t.startRoleplayBtn}</span>
              </button>
              `
            }
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
    this.innerHTML = html;

    // Bind Mode Switcher
    this.querySelector("#tab-listen")?.addEventListener("click", () => {
      this.mainTab = "listen";
      this.renderDialogueSelector();
    });
    this.querySelector("#tab-roleplay")?.addEventListener("click", () => {
      this.mainTab = "roleplay";
      this.renderDialogueSelector();
    });

    // Bind Filter triggers
    this.querySelector("#filter-all")?.addEventListener("click", () => {
      this.currentFilter = "all";
      this.renderDialogueSelector();
    });
    this.querySelector("#filter-children")?.addEventListener("click", () => {
      this.currentFilter = "children";
      this.renderDialogueSelector();
    });
    this.querySelector("#filter-adults")?.addEventListener("click", () => {
      this.currentFilter = "adults";
      this.renderDialogueSelector();
    });

    // Bind Classic Dialogue openers
    this.querySelectorAll(".openDialogueBtn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        this.startDialogue(id);
      });
    });

    // Bind Role Play openers
    this.querySelectorAll(".startRoleplayBtn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        this.initRolePlay(id);
      });
    });
  }

  private startDialogue(id: string) {
    const content = (window as any).feheziko?.languageContent;
    const found = content.dialogues.find((d: any) => d.id === id);
    if (found) {
      this.activeDialogue = found;
      this.selectedLineIndex = null;
      this.showTranslationMap = {};
      this.shadowingActive = false;
      this.speechResult = null;
      this.isAutoPlaying = false;
      this.stopAutoPlay();
      this.render();
    }
  }

  private stopAutoPlay() {
    if (this.autoPlayTimeout) {
      clearTimeout(this.autoPlayTimeout);
      this.autoPlayTimeout = null;
    }
    this.isAutoPlaying = false;
  }

  /**
   * Classic Screen: Dynamic Chat Dialogue Player with Multi-Voice
   */
  private renderActiveDialogue() {
    const progress = this.db.getProgress();
    const isMg = progress.accessibility.language === "mg";
    const t = isMg ? {
      back: "Hiverina amin'ny lisitra",
      situation: "Sary an-tsaina (Mise en situation) :",
      speakHelp: "Tsindrio ny soratra handrenesana ny feon'ilay olona na hanaovana shadowing sy famakafakana feo.",
      autoPlay: "▶ Mihaino ny dinika tontolo",
      stopAutoPlay: "⏹ Atsaharo ny mihaino",
      testVoice: "🔊 Hihaino feo",
      shadowTitle: "Shadowing & Famakafakana ny Feo (Voice Analysis)",
      shadowDesc: "Mihainoa aloha, avy eo tsindrio ny mikrô mba hihainoana sy handakafana ny fanononanao.",
      complete: "Hamita ity Dinika ity",
      switchToRoleplay: "🎭 Hanao Role Play"
    } : {
      back: "Retour aux dialogues",
      situation: "Mise en situation :",
      speakHelp: "Cliquez sur une bulle pour l'écouter et lancer l'analyse vocale de prononciation.",
      autoPlay: "▶ Écouter le dialogue entier",
      stopAutoPlay: "⏹ Arrêter la lecture",
      testVoice: "🔊 Tester la voix",
      shadowTitle: "Analyse Vocale & Prononciation",
      shadowDesc: "Écoutez la voix modèle, puis enregistrez-vous pour recevoir l'analyse acoustique.",
      complete: "Marquer comme complété (+40 XP)",
      switchToRoleplay: "🎭 Passer au Role Play"
    };

    const textClass = progress.accessibility.textSize === "large" ? "text-base" : 
                      progress.accessibility.textSize === "extra" ? "text-lg" : "text-sm";

    const voiceA = this.activeDialogue.voices?.A || { avatar: "👤", label: this.activeDialogue.roles?.A || "Rôle A", type: "female" };
    const voiceB = this.activeDialogue.voices?.B || { avatar: "👥", label: this.activeDialogue.roles?.B || "Rôle B", type: "male" };

    this.innerHTML = `
      <div class="space-y-6 max-w-3xl mx-auto">
        <!-- Dialogue Player Header -->
        <div class="flex items-center justify-between border-b border-slate-200 pb-4">
          <button id="exitDialogueBtn" class="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center space-x-1 transition-colors cursor-pointer">
            <span>←</span>
            <span>${t.back}</span>
          </button>
          <div class="flex items-center space-x-2">
            <button id="switchToRoleplayBtn" class="text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 px-3 py-1 rounded-full border border-purple-200 transition-colors cursor-pointer flex items-center space-x-1">
              <span>${t.switchToRoleplay}</span>
            </button>
            <span class="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100">${this.activeDialogue.title}</span>
          </div>
        </div>

        <!-- Situation banner description -->
        <div class="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div class="flex items-start space-x-3">
            <span class="text-xl">📍</span>
            <div>
              <h4 class="text-xs font-bold text-indigo-900 uppercase tracking-wider">${t.situation}</h4>
              <p class="text-xs text-indigo-700 mt-0.5 leading-relaxed italic">"${this.activeDialogue.situation}"</p>
            </div>
          </div>

          <!-- Full Dialogue Auto-Play Trigger -->
          <button id="autoPlayDialogueBtn" class="shrink-0 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer ${
            this.isAutoPlaying
              ? "bg-rose-600 text-white hover:bg-rose-700 animate-pulse"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          }">
            ${this.isAutoPlaying ? t.stopAutoPlay : t.autoPlay}
          </button>
        </div>

        <!-- Character Voice Badges Bar -->
        <div class="bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center justify-around gap-2 shadow-2xs">
          <!-- Character A Voice Tester -->
          <div class="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span class="text-lg">${voiceA.avatar}</span>
            <div>
              <p class="text-xs font-bold text-slate-800">${this.activeDialogue.roles.A}</p>
              <p class="text-[10px] text-slate-400 font-mono">${voiceA.label}</p>
            </div>
            <button id="testVoiceABtn" class="text-[10px] font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg ml-2 transition-colors cursor-pointer">
              ${t.testVoice}
            </button>
          </div>

          <!-- Character B Voice Tester -->
          <div class="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span class="text-lg">${voiceB.avatar}</span>
            <div>
              <p class="text-xs font-bold text-slate-800">${this.activeDialogue.roles.B}</p>
              <p class="text-[10px] text-slate-400 font-mono">${voiceB.label}</p>
            </div>
            <button id="testVoiceBBtn" class="text-[10px] font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg ml-2 transition-colors cursor-pointer">
              ${t.testVoice}
            </button>
          </div>
        </div>

        <!-- Dialogues message bubble container -->
        <div class="space-y-4 py-2">
          ${this.activeDialogue.lines
            .map((line: any, idx: number) => {
              const isA = line.speaker === "A";
              const isSelected = this.selectedLineIndex === idx;
              const showTrans = this.showTranslationMap[idx] || false;
              const roleName = isA ? this.activeDialogue.roles.A : this.activeDialogue.roles.B;
              const curVoice = isA ? voiceA : voiceB;

              return `
                <div class="flex flex-col ${isA ? "items-start" : "items-end"} space-y-1">
                  <!-- Speaker Role Tag with Voice Badge -->
                  <div class="flex items-center space-x-1 px-2">
                    <span class="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">${curVoice.avatar} ${roleName}</span>
                    <span class="text-[9px] font-mono font-medium text-slate-400">(${curVoice.label})</span>
                  </div>
                  
                  <!-- Message Bubble Grid -->
                  <div class="flex items-center space-x-2 max-w-lg ${!isA ? "flex-row-reverse space-x-reverse" : ""}">
                    <div class="w-10 h-10 rounded-full ${isA ? "bg-amber-100 border-amber-200" : "bg-purple-100 border-purple-200"} border flex items-center justify-center text-lg shadow-2xs shrink-0">
                      ${curVoice.avatar}
                    </div>

                    <div data-idx="${idx}" class="dialogueBubble cursor-pointer rounded-2xl p-4 transition-all duration-150 relative group ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-[1.01]"
                        : isA
                        ? "bg-white border border-amber-200/80 text-slate-800 hover:border-amber-400"
                        : "bg-slate-50 border border-purple-200/80 text-slate-800 hover:border-purple-400"
                    }">
                      <p class="${textClass} font-semibold leading-relaxed">${line.french}</p>
                      
                      ${
                        showTrans || isSelected
                          ? `<p class="text-xs mt-2.5 pt-2 border-t border-dotted ${
                              isSelected ? "border-indigo-400/60 text-indigo-100" : "border-slate-200 text-slate-500"
                            }">${line.malagasy}</p>`
                          : ""
                      }

                      <div class="flex justify-between items-center mt-3 pt-2 border-t border-dotted border-slate-200/40 text-[10px] ${isSelected ? "text-indigo-200" : "text-slate-400"}">
                        <button class="playLineAudioBtn flex items-center space-x-1 hover:underline cursor-pointer">
                          <span>🔊 Play ${curVoice.avatar}</span>
                        </button>
                        <button class="toggleLineTransBtn flex items-center space-x-1 hover:underline cursor-pointer">
                          <span>🌐 MG</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>

        <!-- Lower Shadowing & Voice Analysis interactive speaking panel -->
        ${
          this.selectedLineIndex !== null
            ? (() => {
                const selLine = this.activeDialogue.lines[this.selectedLineIndex];
                const selVoice = selLine.speaker === "A" ? voiceA : voiceB;
                return `
              <div class="bg-slate-900 text-white rounded-3xl p-6 space-y-5 shadow-xl border border-slate-800/80 animate-fade-in">
                <div class="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div class="flex items-center space-x-3">
                    <span class="text-2xl">${selVoice.avatar}</span>
                    <div>
                      <h4 class="font-extrabold text-sm text-indigo-400">${t.shadowTitle}</h4>
                      <p class="text-[10px] text-slate-400 mt-0.5">${selVoice.label} • Line ${this.selectedLineIndex + 1}</p>
                    </div>
                  </div>
                  <button id="listenSelectedLineBtn" class="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl transition-colors flex items-center space-x-1 cursor-pointer">
                    <span>🔊 Re-écouter</span>
                  </button>
                </div>

                <p class="text-xl font-bold font-mono text-center text-slate-100 italic">
                  "${selLine.french}"
                </p>

                <div class="flex flex-col items-center justify-center py-2">
                  ${
                    this.shadowingActive
                      ? (() => {
                          const targetLineText = selLine.french;
                          const targetLineWords = targetLineText.trim().split(/\s+/).filter((w: string) => w.length > 0);
                          return `
                        <div class="flex flex-col items-center justify-center py-3 space-y-4 w-full bg-slate-950/70 p-4 rounded-2xl border border-indigo-900/50">
                          <div class="flex items-center justify-between w-full px-2">
                            <div class="flex items-center space-x-2">
                              <span class="w-3 h-3 bg-rose-500 rounded-full animate-ping"></span>
                              <span class="text-xs font-mono font-extrabold text-rose-400 uppercase tracking-wider">Enregistrement & Analyse...</span>
                            </div>
                            <span id="shadowLiveScore" class="text-xs font-mono font-extrabold bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">
                              0% Match
                            </span>
                          </div>

                          <div class="flex items-end justify-center space-x-1.5 h-12 py-1 w-full max-w-xs" id="voiceEqBars">
                            <div class="eq-bar w-1.5 h-3 bg-slate-700 rounded-full"></div>
                            <div class="eq-bar w-1.5 h-5 bg-slate-700 rounded-full"></div>
                            <div class="eq-bar w-1.5 h-8 bg-slate-700 rounded-full"></div>
                            <div class="eq-bar w-1.5 h-4 bg-slate-700 rounded-full"></div>
                            <div class="eq-bar w-1.5 h-10 bg-slate-700 rounded-full"></div>
                            <div class="eq-bar w-1.5 h-6 bg-slate-700 rounded-full"></div>
                            <div class="eq-bar w-1.5 h-9 bg-slate-700 rounded-full"></div>
                            <div class="eq-bar w-1.5 h-4 bg-slate-700 rounded-full"></div>
                            <div class="eq-bar w-1.5 h-7 bg-slate-700 rounded-full"></div>
                            <div class="eq-bar w-1.5 h-3 bg-slate-700 rounded-full"></div>
                          </div>

                          <div class="w-full max-w-xs bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div id="voiceLevelBar" class="h-full bg-indigo-500 w-[10%] transition-all duration-75 rounded-full"></div>
                          </div>

                          <div class="flex flex-wrap gap-1.5 justify-center max-w-md my-1">
                            ${targetLineWords.map((w: string, idx: number) => `
                              <span id="shadow-word-chip-${idx}" class="inline-block px-2.5 py-1 rounded-xl text-xs font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700 opacity-60 transition-all">
                                ${w}
                              </span>
                            `).join("")}
                          </div>

                          <div class="text-center">
                            <p id="shadowLiveTranscript" class="text-xs font-mono text-indigo-300 italic truncate max-w-xs">
                              "..."
                            </p>
                            <p id="shadowLiveFeedback" class="text-[10px] text-slate-400 font-mono mt-1 animate-pulse">Speak into mic...</p>
                          </div>
                        </div>
                        `;
                        })()
                      : `
                    <button id="micShadowBtn" class="w-16 h-16 bg-rose-500 hover:bg-rose-600 rounded-full flex items-center justify-center text-2xl shadow-lg transition-transform active:scale-95 cursor-pointer">
                      🎙️
                    </button>
                    `
                  }
                </div>

                ${
                  this.speechResult
                    ? (() => {
                        const score = this.speechResult.score || 0;
                        const accuracy = this.speechResult.accuracy !== undefined ? this.speechResult.accuracy : score;
                        const rhythm = this.speechResult.rhythm !== undefined ? this.speechResult.rhythm : Math.round(score * 0.95);
                        const spectralMatch = this.speechResult.spectralMatch !== undefined ? this.speechResult.spectralMatch : Math.min(100, Math.round((score + accuracy) / 2));
                        const feedback = this.speechResult.feedback || "";
                        const transcription = this.speechResult.transcription || "";

                        const targetLineWords = selLine.french.trim().split(/\s+/).filter((w: string) => w.length > 0);
                        const normTranscribed = transcription.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡"']/g, "");

                        let wordMatchCount = 0;
                        const wordAnalysisList = targetLineWords.map((w: string) => {
                          const clean = w.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡"']/g, "");
                          if (normTranscribed.includes(clean)) {
                            wordMatchCount++;
                            return { word: w, status: "matched" };
                          }
                          const isFuzzy = normTranscribed.split(/\s+/).some(tw => tw.length > 2 && (clean.includes(tw) || tw.includes(clean)));
                          if (isFuzzy) {
                            return { word: w, status: "fuzzy" };
                          }
                          return { word: w, status: "missed" };
                        });
                        const totalWordCount = targetLineWords.length;

                        const vText = isMg ? {
                          voiceAnalysisTitle: "Fanamarihana sy Famakafakana ny Feo",
                          voiceAnalysisSubtitle: "Fandinihana ny fanononana, ny fidirana amin'ny feo, ary ny rindran-dresaka.",
                          accuracyLabel: "Fanononana Teny (Précision)",
                          rhythmLabel: "Rindran-dresaka & Cadence",
                          spectralLabel: "Harmonique & Spectre Vocal",
                          phoneticBreakdown: "Famakafakana isan-teny (Mot par mot)",
                          modelVoice: "Mihaino ny feo modely",
                          youSaid: "Izay re tamin'ny feonao :",
                          reRecord: "Amerina indray (Réessayer)"
                        } : {
                          voiceAnalysisTitle: "Rapport d'Analyse Vocale",
                          voiceAnalysisSubtitle: "Évaluation acoustique, précision phonétique et rythme du shadowing.",
                          accuracyLabel: "Précision des mots",
                          rhythmLabel: "Rythme & Cadence",
                          spectralLabel: "Harmonie Spectrale",
                          phoneticBreakdown: "Analyse phonétique mot par mot",
                          modelVoice: "Écouter la voix modèle",
                          youSaid: "Transcription détectée :",
                          reRecord: "Réessayer l'enregistrement"
                        };

                        return `
                      <div class="bg-slate-950/80 border border-indigo-900/60 p-5 rounded-2xl space-y-4 animate-fade-in shadow-2xl">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                          <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-xl shadow-inner">
                              📊
                            </div>
                            <div>
                              <h4 class="font-extrabold text-sm text-indigo-300 tracking-wide">${vText.voiceAnalysisTitle}</h4>
                              <p class="text-[10px] text-slate-400 font-mono mt-0.5">${vText.voiceAnalysisSubtitle}</p>
                            </div>
                          </div>
                          <span class="text-xs font-extrabold font-mono px-3 py-1 rounded-full border self-start sm:self-auto ${
                            score >= 85
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : score >= 65
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                          }">
                            ${score >= 85 ? "🌟 " + (isMg ? "Tongalafatra" : "Excellent") : score >= 65 ? "👍 " + (isMg ? "Tsara" : "Satisfaisant") : "💪 " + (isMg ? "Mila ezaka" : "À travailler")}
                          </span>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div class="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-2">
                            <div class="flex justify-between items-center text-xs">
                              <span class="font-bold text-slate-300">${vText.accuracyLabel}</span>
                              <span class="font-mono font-extrabold text-emerald-400">${accuracy}%</span>
                            </div>
                            <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" style="width: ${accuracy}%"></div>
                            </div>
                            <p class="text-[9px] text-slate-400 font-mono">${isMg ? "Fahamendrehana isan-teny" : "Mots correctement articulés"}</p>
                          </div>

                          <div class="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-2">
                            <div class="flex justify-between items-center text-xs">
                              <span class="font-bold text-slate-300">${vText.rhythmLabel}</span>
                              <span class="font-mono font-extrabold text-indigo-400">${rhythm}%</span>
                            </div>
                            <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div class="h-full bg-gradient-to-r from-indigo-500 to-purple-400 rounded-full" style="width: ${rhythm}%"></div>
                            </div>
                            <p class="text-[9px] text-slate-400 font-mono">${isMg ? "Haingam-piteny sy fidirana" : "Régularité du débit & pauses"}</p>
                          </div>

                          <div class="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-2">
                            <div class="flex justify-between items-center text-xs">
                              <span class="font-bold text-slate-300">${vText.spectralLabel}</span>
                              <span class="font-mono font-extrabold text-cyan-400">${spectralMatch}%</span>
                            </div>
                            <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div class="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full" style="width: ${spectralMatch}%"></div>
                            </div>
                            <p class="text-[9px] text-slate-400 font-mono">${isMg ? "Acoustique sy timbre" : "Correspondance spectrale"}</p>
                          </div>
                        </div>

                        <div class="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl space-y-2.5">
                          <div class="flex items-center justify-between">
                            <span class="text-xs font-extrabold text-indigo-300 uppercase tracking-wider">${vText.phoneticBreakdown}</span>
                            <span class="text-[10px] text-slate-400 font-mono">${wordMatchCount}/${totalWordCount} ${isMg ? "teny mety" : "mots validés"}</span>
                          </div>

                          <div class="flex flex-wrap gap-2 pt-1">
                            ${wordAnalysisList.map(item => `
                              <div class="flex flex-col items-center px-3 py-1.5 rounded-xl border font-mono text-xs transition-all ${
                                item.status === "matched"
                                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                                  : item.status === "fuzzy"
                                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                                  : "bg-rose-500/15 border-rose-500/40 text-rose-300"
                              }">
                                <span class="font-bold">${item.word}</span>
                                <span class="text-[9px] opacity-80 mt-0.5">${item.status === "matched" ? "✓ 100%" : item.status === "fuzzy" ? "≈ 75%" : "✗ 0%"}</span>
                              </div>
                            `).join("")}
                          </div>
                        </div>

                        <div class="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-2">
                          <div class="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                            <span>${vText.youSaid}</span>
                            <button id="reListenTargetBtn" class="text-indigo-400 hover:text-indigo-300 font-bold flex items-center space-x-1 cursor-pointer">
                              <span>🔊 ${vText.modelVoice}</span>
                            </button>
                          </div>
                          <p class="text-xs font-mono text-slate-200 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                            "${transcription || (isMg ? "Tsy nisy feo re" : "Aucune transcription disponible")}"
                          </p>
                        </div>

                        <div class="flex items-start space-x-3 bg-indigo-950/40 border border-indigo-800/40 p-3.5 rounded-xl">
                          <span class="text-xl shrink-0 mt-0.5">${score >= 85 ? "🏆" : score >= 65 ? "💡" : "🎯"}</span>
                          <div class="space-y-1">
                            <p class="text-xs font-bold text-indigo-200 leading-snug">${feedback}</p>
                            <p class="text-[10px] text-slate-400 leading-relaxed font-mono">
                              ${score >= 85 
                                ? (isMg ? "Mainteno ny rindran-dresaka ho an'ny sary manaraka!" : "Conservez cette fluidité et cette articulation pour la suite !")
                                : (isMg ? "Ataovy mamina kokoa ny fihainoana ilay feo modely, ka hamerena tsara ny teny misy teboka mena." : "Réécoutez la voix modèle et réessayez les mots colorés en rouge pour perfectionner la prononciation.")}
                            </p>
                          </div>
                        </div>

                        <button id="reRecordShadowBtn" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold py-2.5 rounded-xl transition-all shadow-md shadow-indigo-950 flex items-center justify-center space-x-2 cursor-pointer">
                          <span>🎙️</span>
                          <span>${vText.reRecord}</span>
                        </button>
                      </div>
                      `;
                      })()
                    : ""
                }
              </div>
              `;
              })()
            : `
          <p class="text-center text-xs text-slate-400 mt-4 italic">${t.speakHelp}</p>
          `
        }

        <!-- Complete / Save progress button -->
        <div class="pt-6 border-t border-slate-200">
          <button id="completeDialogueBtn" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl transition-all shadow-md shadow-emerald-100 cursor-pointer">
            ✓ ${t.complete}
          </button>
        </div>
      </div>
    `;

    // ADD BINDINGS & ACTIONS
    this.querySelector("#exitDialogueBtn")?.addEventListener("click", () => {
      this.stopAutoPlay();
      this.activeDialogue = null;
      this.render();
    });

    this.querySelector("#switchToRoleplayBtn")?.addEventListener("click", () => {
      if (this.activeDialogue) {
        this.initRolePlay(this.activeDialogue.id);
      }
    });

    // Voice testing buttons
    this.querySelector("#testVoiceABtn")?.addEventListener("click", () => {
      const sampleText = this.activeDialogue.lines.find((l: any) => l.speaker === "A")?.french || "Bonjour !";
      this.audio.speakFrench(sampleText, {
        type: voiceA.type,
        dialogueId: this.activeDialogue.id,
        speakerRole: "A"
      });
    });

    this.querySelector("#testVoiceBBtn")?.addEventListener("click", () => {
      const sampleText = this.activeDialogue.lines.find((l: any) => l.speaker === "B")?.french || "Bonjour !";
      this.audio.speakFrench(sampleText, {
        type: voiceB.type,
        dialogueId: this.activeDialogue.id,
        speakerRole: "B"
      });
    });

    // Full Dialogue Auto-Play
    this.querySelector("#autoPlayDialogueBtn")?.addEventListener("click", () => {
      if (this.isAutoPlaying) {
        this.stopAutoPlay();
        this.renderActiveDialogue();
      } else {
        this.startFullDialogueAutoPlay();
      }
    });

    // Re-listen selected line button
    this.querySelector("#listenSelectedLineBtn")?.addEventListener("click", () => {
      if (this.selectedLineIndex !== null) {
        const line = this.activeDialogue.lines[this.selectedLineIndex];
        const vConfig = line.speaker === "A" ? voiceA : voiceB;
        this.audio.speakFrench(line.french, {
          type: vConfig.type,
          dialogueId: this.activeDialogue.id,
          speakerRole: line.speaker
        });
      }
    });

    // Re-listen target button inside voice analysis report
    this.querySelector("#reListenTargetBtn")?.addEventListener("click", () => {
      if (this.selectedLineIndex !== null) {
        const line = this.activeDialogue.lines[this.selectedLineIndex];
        const vConfig = line.speaker === "A" ? voiceA : voiceB;
        this.audio.speakFrench(line.french, {
          type: vConfig.type,
          dialogueId: this.activeDialogue.id,
          speakerRole: line.speaker
        });
      }
    });

    // Re-record attempt button inside voice analysis report
    this.querySelector("#reRecordShadowBtn")?.addEventListener("click", () => {
      this.speechResult = null;
      this.handleShadowingRecord();
    });

    // Bubble interaction triggers
    this.querySelectorAll(".dialogueBubble").forEach((bubble: any) => {
      bubble.addEventListener("click", (e: Event) => {
        const idx = parseInt(bubble.getAttribute("data-idx") || "0");
        const line = this.activeDialogue.lines[idx];
        const vConfig = line.speaker === "A" ? voiceA : voiceB;

        const target = e.target as HTMLElement;
        if (target.closest(".playLineAudioBtn")) {
          e.stopPropagation();
          this.audio.speakFrench(line.french, {
            type: vConfig.type,
            dialogueId: this.activeDialogue.id,
            speakerRole: line.speaker
          });
          return;
        }
        if (target.closest(".toggleLineTransBtn")) {
          e.stopPropagation();
          this.showTranslationMap[idx] = !this.showTranslationMap[idx];
          this.renderActiveDialogue();
          return;
        }

        this.selectedLineIndex = idx;
        this.speechResult = null;
        this.shadowingActive = false;
        this.renderActiveDialogue();
        this.audio.speakFrench(line.french, {
          type: vConfig.type,
          dialogueId: this.activeDialogue.id,
          speakerRole: line.speaker
        });
      });
    });

    // Shadowing speak recorder trigger
    this.querySelector("#micShadowBtn")?.addEventListener("click", () => {
      this.handleShadowingRecord();
    });

    // Complete whole dialogue
    this.querySelector("#completeDialogueBtn")?.addEventListener("click", () => {
      this.stopAutoPlay();
      this.db.completeDialogue(this.activeDialogue.id);
      this.db.addXp(40);
      alert("Natao soa aman-tsara! Nahazo +40 XP ianao.");
      this.activeDialogue = null;
      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
    });
  }

  private startFullDialogueAutoPlay() {
    if (!this.activeDialogue || !this.activeDialogue.lines) return;
    this.isAutoPlaying = true;
    this.renderActiveDialogue();

    let currentIdx = 0;
    const playNext = async () => {
      if (!this.isAutoPlaying || currentIdx >= this.activeDialogue.lines.length) {
        this.isAutoPlaying = false;
        this.renderActiveDialogue();
        return;
      }

      const line = this.activeDialogue.lines[currentIdx];
      this.selectedLineIndex = currentIdx;
      this.renderActiveDialogue();

      const vConfig = line.speaker === "A" 
        ? (this.activeDialogue.voices?.A || { type: "female" }) 
        : (this.activeDialogue.voices?.B || { type: "male" });

      try {
        await this.audio.speakFrench(line.french, {
          type: vConfig.type,
          dialogueId: this.activeDialogue.id,
          speakerRole: line.speaker
        });
      } catch (e) {
        console.warn("Auto-play speak interrupted:", e);
      }

      if (this.isAutoPlaying) {
        currentIdx++;
        this.autoPlayTimeout = setTimeout(playNext, 800);
      }
    };

    playNext();
  }

  private async handleShadowingRecord() {
    if (this.selectedLineIndex === null) return;
    this.shadowingActive = true;
    this.renderActiveDialogue();

    const line = this.activeDialogue.lines[this.selectedLineIndex];
    try {
      const res = await this.audio.recordAndEvaluate(line.french, (transcript, isFinal, analysis) => {
        if (analysis) {
          this.realtimeAnalysis = analysis;
          this.updateShadowingLiveDisplay();
        }
      });
      this.shadowingActive = false;
      this.speechResult = res;
      this.db.addXp(15);
      this.renderActiveDialogue();
    } catch {
      this.shadowingActive = false;
      this.renderActiveDialogue();
    }
  }

  /* ========================================================================
   * ROLE PLAY SECTION METHODOLOGY & INTERACTIVE MEMORIZATION SYSTEM
   * ======================================================================== */

  private initRolePlay(dialogueId: string) {
    const content = (window as any).feheziko?.languageContent;
    const found = content.dialogues.find((d: any) => d.id === dialogueId);
    if (!found) return;

    this.rolePlayDialogue = found;
    this.rolePlayState = "config";
    this.userRole = "A";
    this.memoryLevel = "easy";
    this.rolePlayLineIndex = 0;
    this.rolePlayScores = [];
    this.rolePlayRecording = false;
    this.rolePlaySpeechResult = null;
    this.showHintInRolePlay = false;
    this.isAiSpeaking = false;
    this.stopAutoPlay();
    this.activeDialogue = null;
    this.render();
  }

  /**
   * Screen 1: Role Play Setup & Memory Difficulty Config
   */
  private renderRolePlayConfig() {
    const progress = this.db.getProgress();
    const isMg = progress.accessibility.language === "mg";

    const voiceA = this.rolePlayDialogue.voices?.A || { avatar: "👤", label: this.rolePlayDialogue.roles?.A || "Rôle A", type: "female" };
    const voiceB = this.rolePlayDialogue.voices?.B || { avatar: "👥", label: this.rolePlayDialogue.roles?.B || "Rôle B", type: "male" };

    const t = isMg ? {
      title: "🎭 Parameteran'ny Jeu de Rôle (Role Play)",
      subtitle: "Safidio ny olona tianao halaina tahaka ary ny haavon'ny fahatsiarovana.",
      step1: "1. Safidio ny Anjara Asanao (Choisissez votre rôle) :",
      step2: "2. Safidio ny Haavon'ny Fahatsiarovana (Niveau de mémorisation) :",
      levelEasyTitle: "💡 Débutant (Texte complet)",
      levelEasyDesc: "Hiaseho feno ny soratra frantsay sy ny fandikan-teny malagasy.",
      levelMediumTitle: "🧠 Intermédiaire (Mots à trous)",
      levelMediumDesc: "Misy teboka vitsivitsy afenina mba hitsapana ny fitadidiana.",
      levelHardTitle: "🏆 Expert (Sans filet / Traduction seule)",
      levelHardDesc: "Ny fehezanteny malagasy ihany no hita! Avereno avy amin'ny fitadidiana ny frantsay.",
      startBtn: "🚀 Hanomboka ny Role Play",
      backBtn: "← Hiverina amin'ny lisitra"
    } : {
      title: "🎭 Configuration du Jeu de Rôle",
      subtitle: "Choisissez le personnage que vous souhaitez incarner et votre niveau de difficulté.",
      step1: "1. Choisissez le personnage à incarner :",
      step2: "2. Choisissez le niveau de mémorisation :",
      levelEasyTitle: "💡 Débutant (Texte complet)",
      levelEasyDesc: "Texte français et traduction affichés en totalité. Idéal pour apprendre.",
      levelMediumTitle: "🧠 Intermédiaire (Mots à trous)",
      levelMediumDesc: "Texte partiel avec lettres masquées pour tester la mémoire active.",
      levelHardTitle: "🏆 Expert (Mémoire pure)",
      levelHardDesc: "Uniquement la consigne traduite. Restituez le dialogue de mémoire !",
      startBtn: "🚀 Lancer la simulation",
      backBtn: "← Retour aux dialogues"
    };

    this.innerHTML = `
      <div class="max-w-2xl mx-auto space-y-6">
        <!-- Back Navigation -->
        <button id="exitRoleplayConfigBtn" class="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center space-x-1 cursor-pointer">
          <span>${t.backBtn}</span>
        </button>

        <!-- Header Card -->
        <div class="bg-gradient-to-r from-indigo-900 to-purple-900 text-white rounded-3xl p-6 shadow-xl border border-indigo-800 space-y-2">
          <div class="flex items-center space-x-2">
            <span class="text-3xl">🎭</span>
            <div>
              <h2 class="text-xl font-black">${this.rolePlayDialogue.title}</h2>
              <p class="text-xs text-indigo-200 mt-0.5">${t.subtitle}</p>
            </div>
          </div>
          <p class="text-xs text-indigo-300 italic pt-2 border-t border-indigo-800/80">"${this.rolePlayDialogue.situation}"</p>
        </div>

        <!-- Step 1: Character Choice -->
        <div class="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
          <h3 class="font-extrabold text-sm text-slate-800 uppercase tracking-wider">${t.step1}</h3>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Role A Button -->
            <button id="selectRoleABtn" class="p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center space-x-3.5 ${
              this.userRole === "A"
                ? "border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100"
                : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
            }">
              <span class="text-3xl bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">${voiceA.avatar}</span>
              <div>
                <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600">Rôle A</span>
                <h4 class="font-extrabold text-sm text-slate-800">${this.rolePlayDialogue.roles.A}</h4>
                <p class="text-[10px] text-slate-500 font-mono mt-0.5">${voiceA.label}</p>
              </div>
            </button>

            <!-- Role B Button -->
            <button id="selectRoleBBtn" class="p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center space-x-3.5 ${
              this.userRole === "B"
                ? "border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100"
                : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
            }">
              <span class="text-3xl bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">${voiceB.avatar}</span>
              <div>
                <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-600">Rôle B</span>
                <h4 class="font-extrabold text-sm text-slate-800">${this.rolePlayDialogue.roles.B}</h4>
                <p class="text-[10px] text-slate-500 font-mono mt-0.5">${voiceB.label}</p>
              </div>
            </button>
          </div>
        </div>

        <!-- Step 2: Memory Difficulty -->
        <div class="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
          <h3 class="font-extrabold text-sm text-slate-800 uppercase tracking-wider">${t.step2}</h3>

          <div class="space-y-3">
            <!-- Level Easy -->
            <button id="selectLevelEasyBtn" class="w-full p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start space-x-3 ${
              this.memoryLevel === "easy"
                ? "border-emerald-500 bg-emerald-50/40 shadow-xs"
                : "border-slate-200 hover:border-slate-300"
            }">
              <span class="text-2xl mt-0.5">💡</span>
              <div>
                <h4 class="font-extrabold text-sm text-slate-800">${t.levelEasyTitle}</h4>
                <p class="text-xs text-slate-500 leading-relaxed mt-0.5">${t.levelEasyDesc}</p>
              </div>
            </button>

            <!-- Level Medium -->
            <button id="selectLevelMediumBtn" class="w-full p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start space-x-3 ${
              this.memoryLevel === "medium"
                ? "border-amber-500 bg-amber-50/40 shadow-xs"
                : "border-slate-200 hover:border-slate-300"
            }">
              <span class="text-2xl mt-0.5">🧠</span>
              <div>
                <h4 class="font-extrabold text-sm text-slate-800">${t.levelMediumTitle}</h4>
                <p class="text-xs text-slate-500 leading-relaxed mt-0.5">${t.levelMediumDesc}</p>
              </div>
            </button>

            <!-- Level Hard -->
            <button id="selectLevelHardBtn" class="w-full p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start space-x-3 ${
              this.memoryLevel === "hard"
                ? "border-purple-600 bg-purple-50/40 shadow-xs"
                : "border-slate-200 hover:border-slate-300"
            }">
              <span class="text-2xl mt-0.5">🏆</span>
              <div>
                <h4 class="font-extrabold text-sm text-slate-800">${t.levelHardTitle}</h4>
                <p class="text-xs text-slate-500 leading-relaxed mt-0.5">${t.levelHardDesc}</p>
              </div>
            </button>
          </div>
        </div>

        <!-- Launch Button -->
        <button id="launchRoleplayBtn" class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-sm py-4 rounded-2xl transition-all shadow-lg shadow-indigo-100 flex items-center justify-center space-x-2 cursor-pointer">
          <span>${t.startBtn}</span>
        </button>
      </div>
    `;

    // Bindings
    this.querySelector("#exitRoleplayConfigBtn")?.addEventListener("click", () => {
      this.rolePlayDialogue = null;
      this.render();
    });

    this.querySelector("#selectRoleABtn")?.addEventListener("click", () => {
      this.userRole = "A";
      this.renderRolePlayConfig();
    });

    this.querySelector("#selectRoleBBtn")?.addEventListener("click", () => {
      this.userRole = "B";
      this.renderRolePlayConfig();
    });

    this.querySelector("#selectLevelEasyBtn")?.addEventListener("click", () => {
      this.memoryLevel = "easy";
      this.renderRolePlayConfig();
    });

    this.querySelector("#selectLevelMediumBtn")?.addEventListener("click", () => {
      this.memoryLevel = "medium";
      this.renderRolePlayConfig();
    });

    this.querySelector("#selectLevelHardBtn")?.addEventListener("click", () => {
      this.memoryLevel = "hard";
      this.renderRolePlayConfig();
    });

    this.querySelector("#launchRoleplayBtn")?.addEventListener("click", () => {
      this.rolePlayState = "playing";
      this.rolePlayLineIndex = 0;
      this.rolePlayScores = [];
      this.rolePlaySpeechResult = null;
      this.advanceRolePlayTurn();
    });
  }

  /**
   * Role Play Engine State Controller
   */
  private advanceRolePlayTurn() {
    if (!this.rolePlayDialogue) return;

    if (this.rolePlayLineIndex >= this.rolePlayDialogue.lines.length) {
      // Completed all dialogue lines!
      this.rolePlayState = "summary";
      this.db.addXp(50);
      this.db.completeDialogue(this.rolePlayDialogue.id);
      this.render();
      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
      return;
    }

    const currentLine = this.rolePlayDialogue.lines[this.rolePlayLineIndex];
    const isUserTurn = currentLine.speaker === this.userRole;

    if (!isUserTurn) {
      // AI Character's Turn
      this.isAiSpeaking = true;
      this.rolePlaySpeechResult = null;
      this.renderRolePlayStage();

      const aiRole = currentLine.speaker;
      const aiVoiceConfig = aiRole === "A"
        ? (this.rolePlayDialogue.voices?.A || { type: "female" })
        : (this.rolePlayDialogue.voices?.B || { type: "male" });

      this.audio.speakFrench(currentLine.french, {
        type: aiVoiceConfig.type,
        dialogueId: this.rolePlayDialogue.id,
        speakerRole: aiRole
      }).then(() => {
        this.isAiSpeaking = false;
        this.rolePlayLineIndex++;
        setTimeout(() => this.advanceRolePlayTurn(), 900);
      }).catch(() => {
        this.isAiSpeaking = false;
        this.rolePlayLineIndex++;
        setTimeout(() => this.advanceRolePlayTurn(), 900);
      });
    } else {
      // User's Turn
      this.isAiSpeaking = false;
      this.showHintInRolePlay = false;
      this.rolePlaySpeechResult = null;
      this.renderRolePlayStage();
    }
  }

  /**
   * Screen 2: Interactive Role Play Stage
   */
  private renderRolePlayStage() {
    const progress = this.db.getProgress();
    const isMg = progress.accessibility.language === "mg";

    const voiceA = this.rolePlayDialogue.voices?.A || { avatar: "👤", label: this.rolePlayDialogue.roles?.A || "Rôle A", type: "female" };
    const voiceB = this.rolePlayDialogue.voices?.B || { avatar: "👥", label: this.rolePlayDialogue.roles?.B || "Rôle B", type: "male" };

    const userVoice = this.userRole === "A" ? voiceA : voiceB;
    const aiVoice = this.userRole === "A" ? voiceB : voiceA;
    const userName = this.userRole === "A" ? this.rolePlayDialogue.roles.A : this.rolePlayDialogue.roles.B;
    const aiName = this.userRole === "A" ? this.rolePlayDialogue.roles.B : this.rolePlayDialogue.roles.A;

    const totalLines = this.rolePlayDialogue.lines.length;
    const currentLine = this.rolePlayDialogue.lines[this.rolePlayLineIndex];
    const isUserTurn = currentLine ? currentLine.speaker === this.userRole : false;

    const t = isMg ? {
      quit: "Hajanona ny Role Play",
      turnAi: `🤖 Anjaran'i ${aiName} miteny...`,
      turnUser: `🎙️ Anjaranao miteny ! (${userName})`,
      showHint: "💡 Asehoy ny soratra frantsay (Montrer la phrase)",
      hideHint: "🙈 Afeno ny soratra frantsay",
      listenModel: "🔊 Mihaino ny feo modely",
      validateNext: "Lazaiko / Ligne suivante ➔",
      skip: "⏭️ Avelao (Passer)"
    } : {
      quit: "Quitter la simulation",
      turnAi: `🤖 Tour de l'IA : ${aiName} parle...`,
      turnUser: `🎙️ À votre tour ! Vous êtes ${userName}`,
      showHint: "💡 Afficher le texte français d'aide",
      hideHint: "🙈 Masquer l'aide",
      listenModel: "🔊 Écouter le modèle vocal",
      validateNext: "Valider & Ligne suivante ➔",
      skip: "⏭️ Passer cette réplique"
    };

    // Calculate prompt display based on memory level
    let promptDisplayHtml = "";
    if (currentLine) {
      if (this.memoryLevel === "easy" || this.showHintInRolePlay) {
        promptDisplayHtml = `
          <div class="space-y-1">
            <p class="text-xl font-black font-mono text-white">${currentLine.french}</p>
            <p class="text-xs text-indigo-300 italic">${currentLine.malagasy}</p>
          </div>
        `;
      } else if (this.memoryLevel === "medium") {
        promptDisplayHtml = `
          <div class="space-y-2">
            <p class="text-xl font-bold font-mono text-indigo-200 tracking-wider">
              "${this.generateClozeText(currentLine.french)}"
            </p>
            <p class="text-xs text-slate-400 italic">${currentLine.malagasy}</p>
          </div>
        `;
      } else if (this.memoryLevel === "hard") {
        promptDisplayHtml = `
          <div class="space-y-1">
            <p class="text-lg font-bold text-amber-300">" ${currentLine.malagasy} "</p>
            <p class="text-[10px] text-slate-400 font-mono">Restituez la réplique correspondante en français !</p>
          </div>
        `;
      }
    }

    this.innerHTML = `
      <div class="max-w-2xl mx-auto space-y-5">
        <!-- Progress Bar & Header -->
        <div class="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <button id="quitRoleplayBtn" class="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
            ✕ ${t.quit}
          </button>

          <div class="flex items-center space-x-3">
            <span class="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100">
              Ligne ${this.rolePlayLineIndex + 1} / ${totalLines}
            </span>
            <span class="text-xs font-mono font-bold bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full border border-amber-200">
              ${this.memoryLevel === "easy" ? "💡 Débutant" : this.memoryLevel === "medium" ? "🧠 Cloze" : "🏆 Expert"}
            </span>
          </div>
        </div>

        <!-- Conversation History Feed -->
        <div class="space-y-3 bg-slate-50 border border-slate-200/80 p-4 rounded-3xl min-h-[160px] max-h-[300px] overflow-y-auto">
          ${this.rolePlayDialogue.lines.slice(0, this.rolePlayLineIndex).map((line: any, idx: number) => {
            const isUser = line.speaker === this.userRole;
            const curVoice = line.speaker === "A" ? voiceA : voiceB;
            const roleName = line.speaker === "A" ? this.rolePlayDialogue.roles.A : this.rolePlayDialogue.roles.B;
            const score = this.rolePlayScores[idx];

            return `
              <div class="flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1">
                <span class="text-[9px] font-mono text-slate-400 px-2">${curVoice.avatar} ${roleName}</span>
                <div class="p-3 rounded-2xl text-xs max-w-md ${
                  isUser
                    ? "bg-indigo-600 text-white rounded-br-none"
                    : "bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-2xs"
                }">
                  <p class="font-semibold">${line.french}</p>
                  ${
                    score !== undefined && isUser
                      ? `<div class="mt-1 text-[9px] font-mono text-indigo-200 flex items-center space-x-1">
                          <span>✓ Accuracy: ${score}%</span>
                        </div>`
                      : ""
                  }
                </div>
              </div>
            `;
          }).join("")}

          ${
            this.rolePlayLineIndex === 0
              ? `<p class="text-center text-xs text-slate-400 italic py-6">Le dialogue va commencer ! Écoutez attentivement et préparez-vous.</p>`
              : ""
          }
        </div>

        <!-- Active Turn Card -->
        <div class="bg-slate-900 text-white rounded-3xl p-6 space-y-5 shadow-xl border border-slate-800 relative overflow-hidden">
          <!-- Active Role Title Tag -->
          <div class="flex justify-between items-center border-b border-slate-800 pb-3">
            <div class="flex items-center space-x-2">
              <span class="text-2xl">${isUserTurn ? userVoice.avatar : aiVoice.avatar}</span>
              <div>
                <h4 class="font-black text-sm ${isUserTurn ? "text-emerald-400" : "text-indigo-400"}">
                  ${isUserTurn ? t.turnUser : t.turnAi}
                </h4>
                <p class="text-[10px] text-slate-400 font-mono">${isUserTurn ? userVoice.label : aiVoice.label}</p>
              </div>
            </div>

            ${
              this.isAiSpeaking
                ? `<div class="flex items-center space-x-1 h-5 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/40">
                    <div class="w-1 h-3 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div class="w-1 h-5 bg-indigo-400 rounded-full animate-bounce" style="animation-delay: 0.15s"></div>
                    <div class="w-1 h-3 bg-indigo-400 rounded-full animate-bounce" style="animation-delay: 0.3s"></div>
                  </div>`
                : ""
            }
          </div>

          <!-- Prompt Box -->
          ${
            isUserTurn
              ? `
            <div class="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-center space-y-3">
              ${promptDisplayHtml}

              ${
                this.memoryLevel !== "easy"
                  ? `<button id="toggleRoleplayHintBtn" class="text-[10px] font-mono font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer">
                      ${this.showHintInRolePlay ? t.hideHint : t.showHint}
                    </button>`
                  : ""
              }
            </div>

            <!-- Mic / Speech Recording Action Panel -->
            <div class="flex flex-col items-center justify-center space-y-3 pt-2">
              ${
                this.rolePlayRecording
                  ? (() => {
                      const targetLineWords = currentLine.french.trim().split(/\s+/).filter((w: string) => w.length > 0);
                      return `
                    <div class="flex flex-col items-center justify-center py-2 space-y-3 w-full bg-slate-950/70 p-4 rounded-2xl border border-indigo-900/50">
                      <div class="flex items-center justify-between w-full px-2">
                        <div class="flex items-center space-x-2">
                          <span class="w-3 h-3 bg-rose-500 rounded-full animate-ping"></span>
                          <span class="text-xs font-mono font-extrabold text-rose-400 uppercase tracking-wider">Listening...</span>
                        </div>
                        <span id="shadowLiveScore" class="text-xs font-mono font-extrabold bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">
                          0% Match
                        </span>
                      </div>

                      <div class="flex items-end justify-center space-x-1.5 h-10 py-1 w-full max-w-xs" id="voiceEqBars">
                        <div class="eq-bar w-1.5 h-3 bg-slate-700 rounded-full"></div>
                        <div class="eq-bar w-1.5 h-5 bg-slate-700 rounded-full"></div>
                        <div class="eq-bar w-1.5 h-8 bg-slate-700 rounded-full"></div>
                        <div class="eq-bar w-1.5 h-4 bg-slate-700 rounded-full"></div>
                        <div class="eq-bar w-1.5 h-10 bg-slate-700 rounded-full"></div>
                        <div class="eq-bar w-1.5 h-6 bg-slate-700 rounded-full"></div>
                        <div class="eq-bar w-1.5 h-9 bg-slate-700 rounded-full"></div>
                        <div class="eq-bar w-1.5 h-4 bg-slate-700 rounded-full"></div>
                      </div>

                      <div class="w-full max-w-xs bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div id="voiceLevelBar" class="h-full bg-indigo-500 w-[10%] transition-all duration-75 rounded-full"></div>
                      </div>

                      <div class="flex flex-wrap gap-1.5 justify-center max-w-md my-1">
                        ${targetLineWords.map((w: string, idx: number) => `
                          <span id="shadow-word-chip-${idx}" class="inline-block px-2 py-0.5 rounded-lg text-xs font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700 opacity-60 transition-all">
                            ${w}
                          </span>
                        `).join("")}
                      </div>

                      <p id="shadowLiveTranscript" class="text-xs font-mono text-indigo-300 italic truncate max-w-xs">
                        "..."
                      </p>
                    </div>
                    `;
                    })()
                  : `
                <button id="micRoleplayBtn" class="w-16 h-16 bg-rose-500 hover:bg-rose-600 rounded-full flex items-center justify-center text-2xl shadow-lg transition-transform active:scale-95 cursor-pointer">
                  🎙️
                </button>
                `
              }

              ${
                this.rolePlaySpeechResult
                  ? `
                <div class="bg-slate-950 border border-emerald-900/80 p-4 rounded-2xl w-full flex items-center justify-between">
                  <div>
                    <span class="text-lg font-black text-emerald-400 font-mono">${this.rolePlaySpeechResult.score}% Accuracy</span>
                    <p class="text-xs text-slate-300 mt-1">${this.rolePlaySpeechResult.feedback}</p>
                  </div>
                  <button id="validateRoleplayTurnBtn" class="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer">
                    ${t.validateNext}
                  </button>
                </div>
                `
                  : ""
              }

              <!-- Helper Control Buttons -->
              <div class="flex items-center justify-center space-x-4 pt-2 text-xs">
                <button id="listenRoleplayModelBtn" class="text-slate-400 hover:text-slate-200 font-bold flex items-center space-x-1 cursor-pointer">
                  <span>${t.listenModel}</span>
                </button>
                <span class="text-slate-700">•</span>
                <button id="skipRoleplayTurnBtn" class="text-slate-400 hover:text-slate-200 font-bold cursor-pointer">
                  <span>${t.skip}</span>
                </button>
              </div>
            </div>
            `
              : `
            <!-- AI Turn Visual Placeholder -->
            <div class="py-10 text-center space-y-3">
              <p class="text-sm font-mono text-indigo-300 animate-pulse">Écoute du personnage partenaire en cours...</p>
              <div class="w-12 h-12 rounded-full bg-indigo-600/30 border border-indigo-500/40 mx-auto flex items-center justify-center text-xl animate-spin">
                🗣️
              </div>
            </div>
            `
          }
        </div>
      </div>
    `;

    // Bindings
    this.querySelector("#quitRoleplayBtn")?.addEventListener("click", () => {
      this.rolePlayDialogue = null;
      this.render();
    });

    this.querySelector("#toggleRoleplayHintBtn")?.addEventListener("click", () => {
      this.showHintInRolePlay = !this.showHintInRolePlay;
      this.renderRolePlayStage();
    });

    this.querySelector("#listenRoleplayModelBtn")?.addEventListener("click", () => {
      if (currentLine) {
        this.audio.speakFrench(currentLine.french, {
          type: userVoice.type,
          dialogueId: this.rolePlayDialogue.id,
          speakerRole: this.userRole
        });
      }
    });

    this.querySelector("#skipRoleplayTurnBtn")?.addEventListener("click", () => {
      this.rolePlayScores.push(70);
      this.rolePlayLineIndex++;
      this.advanceRolePlayTurn();
    });

    this.querySelector("#micRoleplayBtn")?.addEventListener("click", () => {
      this.handleRolePlayRecord(currentLine);
    });

    this.querySelector("#validateRoleplayTurnBtn")?.addEventListener("click", () => {
      const score = this.rolePlaySpeechResult?.score || 80;
      this.rolePlayScores.push(score);
      this.rolePlaySpeechResult = null;
      this.rolePlayLineIndex++;
      this.advanceRolePlayTurn();
    });
  }

  private async handleRolePlayRecord(currentLine: any) {
    if (!currentLine) return;
    this.rolePlayRecording = true;
    this.renderRolePlayStage();

    try {
      const res = await this.audio.recordAndEvaluate(currentLine.french, (transcript, isFinal, analysis) => {
        if (analysis) {
          this.realtimeAnalysis = analysis;
          this.updateShadowingLiveDisplay();
        }
      });
      this.rolePlayRecording = false;
      this.rolePlaySpeechResult = res;

      // Auto validate if high score
      if (res.score >= 70) {
        this.db.addXp(10);
      }
      this.renderRolePlayStage();
    } catch {
      this.rolePlayRecording = false;
      this.renderRolePlayStage();
    }
  }

  /**
   * Screen 3: Role Play Summary & Trophy Report
   */
  private renderRolePlaySummary() {
    const progress = this.db.getProgress();
    const isMg = progress.accessibility.language === "mg";

    const totalScores = this.rolePlayScores.length > 0
      ? Math.round(this.rolePlayScores.reduce((a, b) => a + b, 0) / this.rolePlayScores.length)
      : 85;

    const stars = totalScores >= 85 ? 3 : totalScores >= 65 ? 2 : 1;

    const t = isMg ? {
      title: "🎉 Role Play Vitefana Soa !",
      subtitle: "Nahazo traikefa sy XP tamin'ny alalan'ny jeu de rôle ianao.",
      avgAccuracy: "Averimberina ny Score (Précision moyenne)",
      levelTitle: "Haavon'ny fahatsiarovana",
      xpGained: "+50 XP Nahazoana",
      swapRole: "🔄 Hanao ny anjara asan'ny olona ilany (Inverser les rôles)",
      increaseDiff: "🧠 Hatao sarotra kokoa (Augmenter la difficulté)",
      backMenu: "📋 Hiverina amin'ny lisitry ny dinika"
    } : {
      title: "🎉 Simulation Role Play Réussie !",
      subtitle: "Félicitations, vous avez interprété l'intégralité du dialogue avec succès.",
      avgAccuracy: "Précision moyenne globale",
      levelTitle: "Niveau de mémorisation",
      xpGained: "+50 XP Gagnés",
      swapRole: "🔄 Inverser les rôles (Jouer l'autre personnage)",
      increaseDiff: "🧠 Augmenter la difficulté de mémoire",
      backMenu: "📋 Choisir un autre dialogue"
    };

    this.innerHTML = `
      <div class="max-w-xl mx-auto space-y-6 text-center py-4">
        <!-- Trophy Banner -->
        <div class="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white rounded-3xl p-8 shadow-2xl border border-indigo-800 space-y-4 animate-fade-in">
          <div class="text-6xl animate-bounce">
            ${stars === 3 ? "🏆" : stars === 2 ? "🥇" : "🎗️"}
          </div>

          <h2 class="text-2xl font-black">${t.title}</h2>
          <p class="text-xs text-indigo-200 leading-relaxed">${t.subtitle}</p>

          <!-- Star Ratings -->
          <div class="flex items-center justify-center space-x-2 text-2xl pt-2">
            <span>⭐</span>
            <span>${stars >= 2 ? "⭐" : "☆"}</span>
            <span>${stars === 3 ? "⭐" : "☆"}</span>
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-2 gap-3 pt-4 border-t border-indigo-800/80">
            <div class="bg-indigo-950/80 p-3.5 rounded-2xl border border-indigo-800">
              <span class="text-[10px] font-mono text-indigo-300 uppercase">${t.avgAccuracy}</span>
              <p class="text-2xl font-black text-emerald-400 font-mono mt-1">${totalScores}%</p>
            </div>
            <div class="bg-indigo-950/80 p-3.5 rounded-2xl border border-indigo-800">
              <span class="text-[10px] font-mono text-indigo-300 uppercase">${t.levelTitle}</span>
              <p class="text-sm font-extrabold text-amber-300 mt-2">
                ${this.memoryLevel === "easy" ? "Débutant" : this.memoryLevel === "medium" ? "Intermédiaire" : "Expert"}
              </p>
            </div>
          </div>

          <span class="inline-block bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold px-4 py-1.5 rounded-full mt-2">
            ${t.xpGained}
          </span>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-3 pt-2">
          <button id="swapRoleplayRoleBtn" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs py-3.5 rounded-2xl transition-all shadow-md cursor-pointer flex items-center justify-center space-x-2">
            <span>${t.swapRole}</span>
          </button>

          <button id="increaseRoleplayDiffBtn" class="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs py-3.5 rounded-2xl transition-all shadow-md cursor-pointer flex items-center justify-center space-x-2">
            <span>${t.increaseDiff}</span>
          </button>

          <button id="finishRoleplayBtn" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3.5 rounded-2xl transition-all cursor-pointer">
            <span>${t.backMenu}</span>
          </button>
        </div>
      </div>
    `;

    // Bindings
    this.querySelector("#swapRoleplayRoleBtn")?.addEventListener("click", () => {
      this.userRole = this.userRole === "A" ? "B" : "A";
      this.rolePlayState = "playing";
      this.rolePlayLineIndex = 0;
      this.rolePlayScores = [];
      this.advanceRolePlayTurn();
    });

    this.querySelector("#increaseRoleplayDiffBtn")?.addEventListener("click", () => {
      this.memoryLevel = this.memoryLevel === "easy" ? "medium" : "hard";
      this.rolePlayState = "playing";
      this.rolePlayLineIndex = 0;
      this.rolePlayScores = [];
      this.advanceRolePlayTurn();
    });

    this.querySelector("#finishRoleplayBtn")?.addEventListener("click", () => {
      this.rolePlayDialogue = null;
      this.render();
    });
  }
}

customElements.define("fz-dialogue", FzDialogue);
