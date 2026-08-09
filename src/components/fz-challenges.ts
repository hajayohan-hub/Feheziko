/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseEngine } from "../core/DatabaseEngine";
import { AudioEngine, SpeechScoreResult } from "../core/AudioEngine";
import { quickReviewService } from "../core/QuickReviewService";

interface ChallengePhrase {
  id: string;
  phrase: string;
  translationMg: string;
  translationFr: string;
  phonetic: string;
  difficultyMg: string;
  difficultyFr: string;
  difficultyColor: string;
}

export class FzChallenges extends HTMLElement {
  private db!: DatabaseEngine;
  private audio!: AudioEngine;

  private activeTab: "global_xp" | "shadowing" | "delf_challenges" = "global_xp";
  private activeDelfSection: "oral_comp" | "written_comp" | "written_prod" | "oral_prod" = "oral_comp";
  private activeDelfLevel: "A1" | "A2" = "A1";
  private filterTimeframe: "all" | "monthly" | "weekly" = "all";
  private showEditProfileModal: boolean = false;

  private activePhraseId: string | null = null;
  private recording: boolean = false;
  private recordingProgress: number = 0;
  private recordingTimer: any = null;
  private scoreResult: SpeechScoreResult | null = null;
  private userNickname: string = "";
  private scoreSubmitted: boolean = false;

  // DELF Challenges state
  private delfOralCompAnswers: Record<string, string> = {};
  private delfWrittenCompAnswers: Record<string, string> = {};
  private delfWrittenProdText: string = "";
  private delfOralProdResult: SpeechScoreResult | null = null;
  private delfOralProdRecording: boolean = false;
  private delfChallengeSubmitted: Record<string, boolean> = {};
  private delfChallengeScores: Record<string, number> = {};

  // Global Challenge phrases list matching fr.json content
  private challengePhrases: ChallengePhrase[] = [
    {
      id: "l1_ph1",
      phrase: "Bonjour, comment ça va ?",
      translationMg: "Manao ahoana, manao ahoana ny fahasalamana ?",
      translationFr: "Bonjour, comment ça va ?",
      phonetic: "bɔ̃ʒuʁ, kɔmɑ̃ sa va",
      difficultyMg: "Fototra (A1)",
      difficultyFr: "Débutant (A1)",
      difficultyColor: "bg-emerald-50 text-emerald-700 border-emerald-100"
    },
    {
      id: "l1_ph2",
      phrase: "Comment t'appelles-tu ?",
      translationMg: "Iza no anaranao ?",
      translationFr: "Comment t'appelles-tu ?",
      phonetic: "kɔmɑ̃ tapɛl ty",
      difficultyMg: "Fototra (A1)",
      difficultyFr: "Débutant (A1)",
      difficultyColor: "bg-emerald-50 text-emerald-700 border-emerald-100"
    },
    {
      id: "l1_ph3",
      phrase: "Enchanté",
      translationMg: "Faly mahafantatra",
      translationFr: "Enchanté",
      phonetic: "ɑ̃ʃɑ̃te",
      difficultyMg: "Fototra (A1)",
      difficultyFr: "Débutant (A1)",
      difficultyColor: "bg-emerald-50 text-emerald-700 border-emerald-100"
    },
    {
      id: "l2_ph1",
      phrase: "Combien ça coûte ?",
      translationMg: "Ohatrinona ity ?",
      translationFr: "Combien ça coûte ?",
      phonetic: "kɔ̃bjɛ̃ sa kut",
      difficultyMg: "Antonony (A2)",
      difficultyFr: "Intermédiaire (A2)",
      difficultyColor: "bg-amber-50 text-amber-700 border-amber-100"
    },
    {
      id: "l2_ph2",
      phrase: "C'est cher",
      translationMg: "Lafo izany",
      translationFr: "C'est cher",
      phonetic: "sɛ ʃɛʁ",
      difficultyMg: "Antonony (A2)",
      difficultyFr: "Intermédiaire (A2)",
      difficultyColor: "bg-amber-50 text-amber-700 border-amber-100"
    },
    {
      id: "l2_ph3",
      phrase: "Un, Deux, Trois",
      translationMg: "Iray, Roa, Telo",
      translationFr: "Un, Deux, Trois",
      phonetic: "œ̃, dø, tʁwa",
      difficultyMg: "Ambony (B1)",
      difficultyFr: "Avancé (B1)",
      difficultyColor: "bg-indigo-50 text-indigo-700 border-indigo-100"
    }
  ];

  // Random avatar/nickname generators
  private randomNicknames = [
    "Saka_Mavitrika_32",
    "Orateur_Frantsay_99",
    "Mpianatra_Andranobe_55",
    "Mpiteny_Mahay_11",
    "Gasy_Polyglot_88",
    "Soa_Malagasy_77",
    "Rabe_Ambony_44",
    "Kolo_Teny_66",
    "Faly_Mianatra_22",
    "Milay_Miteny_15"
  ];

  constructor() {
    super();
    this.userNickname = this.getRandomNickname();
  }

  connectedCallback() {
    this.db = (window as any).feheziko?.db;
    this.audio = (window as any).feheziko?.audio;

    if (this.challengePhrases.length > 0) {
      this.activePhraseId = this.challengePhrases[0].id;
    }

    this.render();

    window.addEventListener("feheziko_state_changed", () => {
      this.render();
    });

    window.addEventListener("feheziko_challenges_updated", () => {
      this.render();
    });
  }

  disconnectedCallback() {
    this.cleanupTimer();
  }

  private getRandomNickname(): string {
    const idx = Math.floor(Math.random() * this.randomNicknames.length);
    const suffix = Math.floor(Math.random() * 900) + 100;
    const base = this.randomNicknames[idx].split("_").slice(0, 2).join("_");
    return `${base}_${suffix}`;
  }

  private cleanupTimer() {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  private async speakPhrase(text: string) {
    if (!this.audio) return;
    try {
      const playBtn = this.querySelector("#playOriginalBtn");
      if (playBtn) playBtn.classList.add("scale-95", "opacity-70");
      await this.audio.speakFrench(text);
      if (playBtn) playBtn.classList.remove("scale-95", "opacity-70");
    } catch (e) {
      console.error("Speech synthesis failed:", e);
    }
  }

  private async startChallengeRecording(phrase: ChallengePhrase) {
    if (!this.audio || this.recording) return;

    this.recording = true;
    this.scoreResult = null;
    this.scoreSubmitted = false;
    this.recordingProgress = 0;
    this.render();

    // Start simple simulated audio wave progress
    let elapsed = 0;
    this.recordingTimer = setInterval(() => {
      elapsed += 100;
      this.recordingProgress = Math.min(100, Math.floor((elapsed / 2500) * 100));
      const progressBar = this.querySelector("#recordProgressBar") as HTMLElement;
      if (progressBar) {
        progressBar.style.width = `${this.recordingProgress}%`;
      }
      
      // Live simulated bars update
      const bars = this.querySelectorAll(".sim-wave-bar");
      bars.forEach(bar => {
        const height = Math.floor(Math.random() * 32) + 8;
        (bar as HTMLElement).style.height = `${height}px`;
      });
    }, 100);

    try {
      const res = await this.audio.recordAndEvaluate(phrase.phrase);
      this.cleanupTimer();
      this.recording = false;
      this.scoreResult = res;

      // Save to local personal bests
      this.db.saveChallengeScore(phrase.id, res.score);

      // Trigger achievement or reward notification for excellent score!
      if (res.score >= 90) {
        // Add 25 bonus XP
        this.db.addXp(25);
        this.db.addStudyHours(0.1);
      } else {
        this.db.addXp(10);
      }

      this.render();
    } catch (err) {
      console.error("Recording error:", err);
      this.cleanupTimer();
      this.recording = false;
      this.render();
    }
  }

  private render() {
    if (!this.db || !this.audio) return;

    const progress = this.db.getProgress();
    const isMg = progress.accessibility.language === "mg";

    const t = isMg ? {
      title: "Filaharan'ny Mpianatra sy Fanamby (Leaderboard & Challenges)",
      subtitle: "Mifaninana amim-pirahalahiana amin'ny mpianatra maneran-tany sy ampidiro amin'ny avo ny traikefanao (XP).",
      tabGlobalXp: "🏆 Filaharan'ny XP (Global Leaderboard)",
      tabShadowing: "🎙️ Fanamby Miteny (Shadowing)",
      tabDelf: "🎓 Épreuves DELF A1/A2",
      userRankLabel: "Toeranao ankehitriny",
      totalXpLabel: "Tontalin'ny XP",
      currentLeagueLabel: "Ligue ankehitriny",
      streakLabel: "Streak Active",
      editProfileBtn: "✏️ Hanova Sary/Anarana",
      topThreeTitle: "Mpianatra 3 Tsara Indrindra",
      timeframeAll: "Tontolo iainana",
      timeframeMonthly: "Ity volana ity",
      timeframeWeekly: "Ity herinandro ity",
      colRank: "Laharana",
      colLearner: "Mpianatra",
      colLeague: "Ligue",
      colLessons: "Lesona vitaina",
      colStreak: "Streak",
      colXp: "Tontalin'ny XP",
      youBadge: "IANAO",
      promotionNotice: "🚀 Zone de Promotion : Restez dans le Top 10 pour monter en Ligue Diamant !",
      quickXpBtn: "⚡ Hanao fampiharana haingana (+25 XP)",
      challengeXpBtn: "🎙️ Hanao fanamby miteny (+50 XP)",
      phraseSelect: "Safidio ny fehezanteny tianao hofakafakaina",
      diffLabel: "Sarotra :",
      bestLabel: "Ezakao tsara indrindra :",
      globalAverage: "Salan'isa Iraisam-pirenena",
      topBenchmark: "Salan'isan'ny mpanonona mahay (Top 10%)",
      totalAttempts: "Tontalin'ny fanandramana",
      leaderboardTitle: "Filaharan'ny mpanonona mahay indrindra (Anonyme)",
      yourRank: "Ny toeranao",
      noPersonalBest: "Mbola tsy nanandrana ianao",
      speakHelp: "Henoy ny fanononana",
      speakDesc: "Tsindrio ny fanononana marina avy amin'ny mpampianatra natoraly.",
      recordHelp: "Alefaso ny fandraisam-peo",
      recordingStatus: "Mihandry fandraisam-peo (Mitenena ankehitriny...)",
      readyToRecord: "Vonona handray feo",
      evaluating: "Fakafakana ny feonao...",
      submitTitle: "Handefa ny ezakao amin'ny leaderboard ianao?",
      submitDesc: "Ampidiro ny anaram-bositra tianao hisehoana tsy misy anarana.",
      submitBtn: "Handefa izao",
      submittedText: "Nahomby ny fandefasana drakitra!",
      scoreDetail: "Mombamomba ny fanononanao",
      accuracy: "Fanononana",
      rhythm: "Laoniny (Gadona)",
      verdictLabel: "Hevitry ny mpampianatra :",
      submitPlaceholder: "Anaram-bositra miafina...",
      phraseTitle: "Andrana fitenenana",
      helpTip: "💡 Torohevitra: Miezaha hanaraka tsara ny fiakaran'ny feo mba hahazoanao isa ambony!"
    } : {
      title: "Leaderboard Global & Défis",
      subtitle: "Affichez votre niveau, gagnez de l'expérience (XP) et rivalisez amicalement avec les apprenants du monde entier.",
      tabGlobalXp: "🏆 Classement Général XP",
      tabShadowing: "🎙️ Défis de Prononciation",
      tabDelf: "🎓 Épreuves DELF A1/A2",
      userRankLabel: "Votre Rang Actuel",
      totalXpLabel: "Total d'XP Gagnés",
      currentLeagueLabel: "Ligue Actuelle",
      streakLabel: "Série Active",
      editProfileBtn: "✏️ Modifier Pseudo/Avatar",
      topThreeTitle: "Podium des Meilleurs Apprenants",
      timeframeAll: "Tout temps",
      timeframeMonthly: "Ce mois-ci",
      timeframeWeekly: "Cette semaine",
      colRank: "Rang",
      colLearner: "Apprenant",
      colLeague: "Ligue",
      colLessons: "Leçons",
      colStreak: "Série",
      colXp: "Total XP",
      youBadge: "VOUS",
      promotionNotice: "🚀 Zone de Promotion : Restez dans le Top 10 pour monter en Ligue Diamant !",
      quickXpBtn: "⚡ Révision Rapide (+25 XP)",
      challengeXpBtn: "🎙️ Défi Vocal (+50 XP)",
      phraseSelect: "Sélectionnez une phrase de leçon pour lancer le défi",
      diffLabel: "Difficulté :",
      bestLabel: "Votre record personnel :",
      globalAverage: "Moyenne mondiale",
      topBenchmark: "Seuil d'excellence (Top 10%)",
      totalAttempts: "Tentatives mondiales",
      leaderboardTitle: "Classement Anonyme de la Communauté",
      yourRank: "Votre classement",
      noPersonalBest: "Aucune tentative enregistrée",
      speakHelp: "Écouter le modèle vocal",
      speakDesc: "Écoutez la voix de synthèse native pour aligner votre prononciation.",
      recordHelp: "Enregistrer votre shadowing",
      recordingStatus: "Enregistrement en cours (Parlez maintenant...)",
      readyToRecord: "Prêt à enregistrer",
      evaluating: "Évaluation acoustique en cours...",
      submitTitle: "Publier votre score sur le classement ?",
      submitDesc: "Choisissez un pseudonyme anonyme pour figurer sur le tableau mondial.",
      submitBtn: "Publier mon score",
      submittedText: "Votre score a été publié avec succès !",
      scoreDetail: "Détails de l'évaluation",
      accuracy: "Précision phonique",
      rhythm: "Rythme & Liaison",
      verdictLabel: "Commentaire du professeur :",
      submitPlaceholder: "Votre pseudo anonyme...",
      phraseTitle: "Shadowing Actif",
      helpTip: "💡 Conseil: Calquez le rythme et l'intonation globale pour décrocher plus de 90% !"
    };

    this.className = "block max-w-5xl mx-auto space-y-6 font-sans";

    // Header with Module Navigation Tabs
    const headerHtml = `
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-xs">
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-3xl">🏆</span>
            <span class="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">Global Community & Rankings</span>
          </div>
          <h2 class="text-2xl font-black text-slate-900 tracking-tight leading-none">${t.title}</h2>
          <p class="text-xs text-slate-500 font-medium">${t.subtitle}</p>
        </div>
        
        <!-- Navigation Tab Switcher -->
        <div class="flex items-center p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 w-full md:w-auto shrink-0 overflow-x-auto">
          <button id="tabGlobalXpBtn" class="flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            this.activeTab === "global_xp"
              ? "bg-white text-indigo-900 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }">
            ${t.tabGlobalXp}
          </button>
          <button id="tabShadowingBtn" class="flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            this.activeTab === "shadowing"
              ? "bg-white text-indigo-900 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }">
            ${t.tabShadowing}
          </button>
          <button id="tabDelfBtn" class="flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            this.activeTab === "delf_challenges"
              ? "bg-white text-indigo-900 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }">
            ${t.tabDelf}
          </button>
        </div>
      </div>
    `;

    if (this.activeTab === "global_xp") {
      this.innerHTML = headerHtml + this.renderGlobalXpLeaderboard(t);
    } else if (this.activeTab === "shadowing") {
      this.innerHTML = headerHtml + this.renderShadowingChallenges(t);
    } else {
      this.innerHTML = headerHtml + this.renderDelfChallenges(t, isMg);
    }

    this.bindEvents();
  }

  /**
   * Renders the full Global XP Leaderboard view
   */
  private renderGlobalXpLeaderboard(t: any): string {
    const leaderboard = this.db.getGlobalXpLeaderboard();
    const userIndex = leaderboard.findIndex(item => item.isUser);
    const userRank = userIndex !== -1 ? userIndex + 1 : leaderboard.length;
    const userItem = userIndex !== -1 ? leaderboard[userIndex] : null;

    const topThree = leaderboard.slice(0, 3);
    const secondPlace = topThree[1] || null;
    const firstPlace = topThree[0] || null;
    const thirdPlace = topThree[2] || null;

    const getLeagueBadgeClass = (league: string) => {
      switch (league) {
        case "Diamant": return "bg-cyan-50 text-cyan-700 border-cyan-200";
        case "Or": return "bg-amber-50 text-amber-700 border-amber-200";
        case "Argent": return "bg-slate-100 text-slate-700 border-slate-200";
        default: return "bg-orange-50 text-orange-800 border-orange-200";
      }
    };

    const getLeagueIcon = (league: string) => {
      switch (league) {
        case "Diamant": return "💎";
        case "Or": return "🥇";
        case "Argent": return "🥈";
        default: return "🥉";
      }
    };

    return `
      <!-- User Summary Performance Card -->
      <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-5">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-3xl shrink-0 shadow-inner">
              ${userItem?.avatar || "🎓"}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-black font-mono tracking-tight text-white">${userItem?.name || "Apprenant"}</span>
                <span class="text-xs">${userItem?.flag || "🇲🇬"}</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-mono ${getLeagueBadgeClass(userItem?.league || "Bronze")}">
                  ${getLeagueIcon(userItem?.league || "Bronze")} ${userItem?.league || "Bronze"}
                </span>
              </div>
              <p class="text-xs text-indigo-300 font-medium mt-0.5">${userItem?.role || "Apprenant"}</p>
            </div>
          </div>

          <button id="editProfileBtn" class="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95">
            ${t.editProfileBtn}
          </button>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div class="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">${t.userRankLabel}</span>
            <span class="text-xl font-black font-mono text-amber-400 mt-1 block">#${userRank} <span class="text-xs text-slate-400 font-normal">/ ${leaderboard.length}</span></span>
          </div>

          <div class="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">${t.totalXpLabel}</span>
            <span class="text-xl font-black font-mono text-indigo-300 mt-1 block">⚡ ${userItem?.xp || 0} XP</span>
          </div>

          <div class="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">${t.streakLabel}</span>
            <span class="text-xl font-black font-mono text-orange-400 mt-1 block">🔥 ${userItem?.streak || 0}d</span>
          </div>

          <div class="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">${t.colLessons}</span>
            <span class="text-xl font-black font-mono text-emerald-400 mt-1 block">📚 ${userItem?.completedLessons || 0}</span>
          </div>
        </div>
      </div>

      <!-- Top 3 Podium Showcase Section -->
      <div class="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
        <h3 class="text-xs font-black uppercase text-slate-400 font-mono tracking-widest text-center">${t.topThreeTitle}</h3>
        
        <div class="flex flex-col sm:flex-row items-end justify-center gap-4 pt-2">
          
          <!-- 2nd Place (Silver) -->
          ${secondPlace ? `
            <div class="w-full sm:w-1/3 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-2 order-2 sm:order-1 relative flex flex-col items-center">
              <div class="absolute -top-3 bg-slate-200 text-slate-700 border border-slate-300 rounded-full px-2.5 py-0.5 text-[10px] font-black font-mono">
                🥈 #2
              </div>
              <div class="w-14 h-14 rounded-full bg-slate-200/80 border-2 border-slate-300 flex items-center justify-center text-2xl mt-1 shadow-xs">
                ${secondPlace.avatar}
              </div>
              <div>
                <h4 class="font-black text-xs text-slate-800 truncate max-w-[120px]">${secondPlace.name} ${secondPlace.flag}</h4>
                <span class="text-[11px] font-extrabold font-mono text-indigo-600 block mt-0.5">⚡ ${secondPlace.xp} XP</span>
              </div>
              <span class="text-[10px] font-mono font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                🔥 ${secondPlace.streak}d
              </span>
            </div>
          ` : ""}

          <!-- 1st Place (Gold Crown) -->
          ${firstPlace ? `
            <div class="w-full sm:w-1/3 bg-gradient-to-b from-amber-50 to-orange-50/30 border-2 border-amber-300/80 rounded-3xl p-5 text-center space-y-2 order-1 sm:order-2 shadow-md relative flex flex-col items-center transform sm:-translate-y-2">
              <div class="absolute -top-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full px-3 py-0.5 text-xs font-black font-mono shadow-sm flex items-center gap-1">
                👑 🥇 #1
              </div>
              <div class="w-18 h-18 rounded-full bg-amber-100 border-4 border-amber-400 flex items-center justify-center text-3xl mt-2 shadow-md animate-pulse">
                ${firstPlace.avatar}
              </div>
              <div>
                <h4 class="font-black text-sm text-slate-900 truncate max-w-[140px]">${firstPlace.name} ${firstPlace.flag}</h4>
                <span class="text-xs font-black font-mono text-indigo-700 block mt-0.5">⚡ ${firstPlace.xp} XP</span>
              </div>
              <span class="text-[11px] font-mono font-extrabold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-lg border border-amber-200">
                💎 Ligue ${firstPlace.league}
              </span>
            </div>
          ` : ""}

          <!-- 3rd Place (Bronze) -->
          ${thirdPlace ? `
            <div class="w-full sm:w-1/3 bg-slate-50 border border-amber-200/40 rounded-2xl p-4 text-center space-y-2 order-3 sm:order-3 relative flex flex-col items-center">
              <div class="absolute -top-3 bg-amber-100 text-amber-900 border border-amber-300/60 rounded-full px-2.5 py-0.5 text-[10px] font-black font-mono">
                🥉 #3
              </div>
              <div class="w-14 h-14 rounded-full bg-amber-100/50 border-2 border-amber-300 flex items-center justify-center text-2xl mt-1 shadow-xs">
                ${thirdPlace.avatar}
              </div>
              <div>
                <h4 class="font-black text-xs text-slate-800 truncate max-w-[120px]">${thirdPlace.name} ${thirdPlace.flag}</h4>
                <span class="text-[11px] font-extrabold font-mono text-indigo-600 block mt-0.5">⚡ ${thirdPlace.xp} XP</span>
              </div>
              <span class="text-[10px] font-mono font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                🔥 ${thirdPlace.streak}d
              </span>
            </div>
          ` : ""}

        </div>
      </div>

      <!-- Action & Quick Practice Bar -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4">
        <div class="text-xs font-bold text-indigo-900 flex items-center gap-2">
          <span>${t.promotionNotice}</span>
        </div>
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <button id="quickReviewLeaderboardBtn" class="flex-1 sm:flex-initial bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95">
            ${t.quickXpBtn}
          </button>
          <button id="goToShadowingTabBtn" class="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95">
            ${t.challengeXpBtn}
          </button>
        </div>
      </div>

      <!-- Full Global XP Ranking Table -->
      <div class="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div class="p-5 border-b border-slate-100 flex items-center justify-between">
          <h4 class="font-extrabold text-sm text-slate-800">Toko sy Filaharana Ambonin'ny Tany (Global Table)</h4>
          
          <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
            <button class="tf-filter-btn px-2.5 py-1 rounded-lg transition-all cursor-pointer ${this.filterTimeframe === "all" ? "bg-white text-indigo-900 shadow-2xs font-extrabold" : "text-slate-500"}" data-tf="all">
              ${t.timeframeAll}
            </button>
            <button class="tf-filter-btn px-2.5 py-1 rounded-lg transition-all cursor-pointer ${this.filterTimeframe === "monthly" ? "bg-white text-indigo-900 shadow-2xs font-extrabold" : "text-slate-500"}" data-tf="monthly">
              ${t.timeframeMonthly}
            </button>
            <button class="tf-filter-btn px-2.5 py-1 rounded-lg transition-all cursor-pointer ${this.filterTimeframe === "weekly" ? "bg-white text-indigo-900 shadow-2xs font-extrabold" : "text-slate-500"}" data-tf="weekly">
              ${t.timeframeWeekly}
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-mono font-bold uppercase text-[10px]">
                <th class="py-3 px-4">${t.colRank}</th>
                <th class="py-3 px-4">${t.colLearner}</th>
                <th class="py-3 px-4">${t.colLeague}</th>
                <th class="py-3 px-4 text-center">${t.colLessons}</th>
                <th class="py-3 px-4 text-center">${t.colStreak}</th>
                <th class="py-3 px-4 text-right">${t.colXp}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              ${leaderboard.map((item, index) => {
                const rankNum = index + 1;
                const isUser = item.isUser;
                const isTopThree = rankNum <= 3;
                const medals = ["🥇", "🥈", "🥉"];

                return `
                  <tr class="transition-colors ${
                    isUser 
                      ? "bg-indigo-50/90 hover:bg-indigo-100/80 border-l-4 border-indigo-600 font-bold" 
                      : "hover:bg-slate-50/80"
                  }">
                    <td class="py-3.5 px-4 font-mono font-extrabold">
                      <span class="inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs ${
                        isTopThree 
                          ? "bg-amber-100 text-amber-900 font-black" 
                          : "text-slate-500"
                      }">
                        ${isTopThree ? medals[index] : `#${rankNum}`}
                      </span>
                    </td>

                    <td class="py-3.5 px-4">
                      <div class="flex items-center gap-2.5">
                        <span class="text-xl shrink-0">${item.avatar}</span>
                        <div>
                          <div class="flex items-center gap-1.5">
                            <span class="font-extrabold text-slate-900 ${isUser ? "text-indigo-900" : ""}">${item.name}</span>
                            <span class="text-xs">${item.flag}</span>
                            ${isUser ? `<span class="bg-indigo-600 text-white text-[9px] font-black font-mono px-1.5 py-0.2 rounded-md">${t.youBadge}</span>` : ""}
                          </div>
                          <span class="text-[10px] text-slate-400 font-mono">${item.role || "Apprenant"}</span>
                        </div>
                      </div>
                    </td>

                    <td class="py-3.5 px-4">
                      <span class="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border ${getLeagueBadgeClass(item.league)}">
                        ${getLeagueIcon(item.league)} ${item.league}
                      </span>
                    </td>

                    <td class="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                      ${item.completedLessons}
                    </td>

                    <td class="py-3.5 px-4 text-center font-mono font-bold text-orange-600">
                      🔥 ${item.streak}d
                    </td>

                    <td class="py-3.5 px-4 text-right font-mono font-black text-indigo-700 text-sm">
                      ⚡ ${item.xp} XP
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Edit Nickname / Avatar Modal -->
      ${this.showEditProfileModal ? this.renderEditProfileModal(t, userItem) : ""}
    `;
  }

  /**
   * Modal to edit nickname, avatar, and flag
   */
  private renderEditProfileModal(t: any, userItem: any): string {
    const currentName = userItem?.name || "";
    const currentAvatar = userItem?.avatar || "🎓";
    const currentFlag = userItem?.flag || "🇲🇬";

    const avatars = ["🎓", "🦁", "🌺", "⚡", "🗼", "🎨", "🌊", "🌴", "🍇", "🚀"];
    const flags = [
      { code: "🇲🇬", label: "Madagasikara" },
      { code: "🇫🇷", label: "Frantsa" },
      { code: "🌐", label: "Iraisam-pirenena" }
    ];

    return `
      <div id="editProfileModalOverlay" class="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in font-sans">
        <div class="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="font-extrabold text-sm text-slate-900">${t.editNicknameModalTitle}</h3>
            <button id="closeProfileModalBtn" class="text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer">✕</button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Anaram-bositra (Nickname)</label>
              <input id="modalNameInput" type="text" value="${currentName.replace(/ \(Vous\)| \(Mpianatra\)/g, '')}" placeholder="${t.nicknamePlaceholder}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold font-mono focus:outline-none focus:border-indigo-500 focus:bg-white" maxlength="25">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">Safidio ny Sary (Avatar Emoji)</label>
              <div class="grid grid-cols-5 gap-2">
                ${avatars.map(av => `
                  <button class="avatar-select-btn text-2xl p-2 rounded-xl border ${av === currentAvatar ? "bg-indigo-50 border-indigo-500" : "bg-slate-50 border-slate-200 hover:bg-slate-100"} transition-all cursor-pointer" data-avatar="${av}">
                    ${av}
                  </button>
                `).join('')}
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">Safidio ny Sainan'ny firenena (Flag)</label>
              <div class="flex gap-2">
                ${flags.map(f => `
                  <button class="flag-select-btn flex-1 p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${f.code === currentFlag ? "bg-indigo-50 border-indigo-500 text-indigo-900" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"} transition-all cursor-pointer" data-flag="${f.code}">
                    <span>${f.code}</span>
                    <span>${f.label}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button id="cancelProfileModalBtn" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs py-2.5 rounded-xl transition-all cursor-pointer">
              ${t.cancelBtn}
            </button>
            <button id="saveProfileModalBtn" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-xs cursor-pointer">
              ${t.saveProfileBtn}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renders the original Shadowing Pronunciation Challenges view
   */
  private renderShadowingChallenges(t: any): string {
    const personalBests = this.db.getChallengeBests();
    const selectedPhrase = this.challengePhrases.find(p => p.id === this.activePhraseId) || this.challengePhrases[0];
    const personalBest = personalBests[selectedPhrase.id] || null;
    const progress = this.db.getProgress();
    const isMg = progress.accessibility.language === "mg";

    // Get live community stats for the active phrase
    const leaderboard = this.db.getCommunityScores(selectedPhrase.id);
    const sumScores = leaderboard.reduce((acc, curr) => acc + curr.score, 0);
    const globalAvg = leaderboard.length > 0 ? Math.round(sumScores / leaderboard.length) : 76;
    const topBenchmark = leaderboard.length > 0 ? leaderboard[0].score : 94;
    const totalAttemptsSim = leaderboard.length * 12 + 148;

    let userRankIndex = -1;
    if (personalBest !== null) {
      userRankIndex = leaderboard.findIndex(entry => entry.score <= personalBest);
      if (userRankIndex === -1) {
        userRankIndex = leaderboard.length + 1;
      } else {
        userRankIndex += 1;
      }
    }

    return `
      <!-- Main Columns Grid Layout for Shadowing -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <!-- Left Side: Phrase Selectors list -->
        <div class="lg:col-span-4 space-y-4">
          <h3 class="text-xs font-black uppercase text-slate-400 font-mono tracking-widest pl-1">${t.phraseSelect}</h3>
          
          <div class="space-y-3">
            ${this.challengePhrases.map((p) => {
              const best = personalBests[p.id] || null;
              const isActive = p.id === this.activePhraseId;
              const difficulty = isMg ? p.difficultyMg : p.difficultyFr;
              
              return `
                <button data-id="${p.id}" class="phraseCardBtn w-full text-left bg-white border ${
                  isActive 
                    ? "border-indigo-600 ring-2 ring-indigo-50" 
                    : "border-slate-200/70 hover:border-slate-350"
                } rounded-2xl p-4 transition-all flex flex-col gap-3 justify-between group cursor-pointer">
                  <div class="space-y-1">
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded-md border ${p.difficultyColor}">${difficulty}</span>
                      ${best !== null 
                        ? `<span class="text-[10px] font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md">🏆 Best: ${best}%</span>` 
                        : `<span class="text-[10px] text-slate-400 font-medium">No attempts</span>`
                      }
                    </div>
                    
                    <h4 class="font-extrabold text-sm text-slate-800 leading-snug pt-1 group-hover:text-indigo-600 transition-colors">
                      ${p.phrase}
                    </h4>
                    <p class="text-[11px] text-slate-400 italic font-medium truncate w-full">
                      ${isMg ? p.translationMg : p.translationFr}
                    </p>
                  </div>
                </button>
              `;
            }).join("")}
          </div>
        </div>

        <!-- Right Side: Active Challenge Workspace and Leaderboard -->
        <div class="lg:col-span-8 space-y-6">
          
          <!-- Active Practice Canvas -->
          <div class="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-xs">
            
            <!-- Phrase Header info -->
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 class="text-xs font-black uppercase text-slate-400 font-mono tracking-widest">${t.phraseTitle}</h3>
                <div class="flex items-center gap-1.5 mt-1">
                  <span class="text-xs font-extrabold text-slate-500">${t.diffLabel}</span>
                  <span class="text-xs font-bold text-slate-800">${isMg ? selectedPhrase.difficultyMg : selectedPhrase.difficultyFr}</span>
                </div>
              </div>
              
              <div class="text-right">
                <span class="text-[10px] font-mono font-bold text-slate-400 uppercase block">${t.bestLabel}</span>
                <span class="text-sm font-black font-mono text-indigo-700">
                  ${personalBest !== null ? `${personalBest}%` : t.noPersonalBest}
                </span>
              </div>
            </div>

            <!-- Focus Phrase Block -->
            <div class="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center space-y-3 relative overflow-hidden">
              <span class="absolute left-3 top-3 text-3xl opacity-10 pointer-events-none">“</span>
              <span class="absolute right-3 bottom-3 text-3xl opacity-10 pointer-events-none">”</span>
              
              <h1 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight font-sans leading-normal">
                ${selectedPhrase.phrase}
              </h1>
              
              <p class="text-xs text-indigo-600 font-mono font-medium tracking-wide">
                [ ${selectedPhrase.phonetic} ]
              </p>
              
              <p class="text-sm text-slate-500 italic font-medium">
                ${isMg ? selectedPhrase.translationMg : selectedPhrase.translationFr}
              </p>
            </div>

            <!-- Interactivity Actions: Speak vs Record -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <button id="playOriginalBtn" class="flex items-center gap-4 border border-slate-200/80 hover:border-indigo-200 hover:bg-slate-50/40 p-4 rounded-2xl transition-all text-left group cursor-pointer focus:outline-none">
                <div class="w-12 h-12 bg-indigo-50 group-hover:bg-indigo-100 border border-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-xl shrink-0 transition-all">
                  🔊
                </div>
                <div>
                  <h4 class="font-extrabold text-slate-800 text-xs">${t.speakHelp}</h4>
                  <p class="text-[11px] text-slate-400 font-medium leading-relaxed mt-0.5">${t.speakDesc}</p>
                </div>
              </button>

              <button id="recordShadowingBtn" class="flex items-center gap-4 border ${
                this.recording 
                  ? "border-rose-300 bg-rose-50/20" 
                  : "border-slate-200/80 hover:border-indigo-200 hover:bg-slate-50/40"
              } p-4 rounded-2xl transition-all text-left group cursor-pointer focus:outline-none" ${this.recording ? "disabled" : ""}>
                <div class="w-12 h-12 ${
                  this.recording 
                    ? "bg-rose-500 text-white animate-pulse" 
                    : "bg-indigo-600 text-white group-hover:bg-indigo-700"
                } rounded-xl flex items-center justify-center text-xl shrink-0 transition-all">
                  🎤
                </div>
                <div>
                  <h4 class="font-extrabold text-slate-800 text-xs">
                    ${this.recording ? t.recordingStatus : t.recordHelp}
                  </h4>
                  <p class="text-[11px] text-slate-400 font-medium leading-relaxed mt-0.5">
                    ${this.recording ? t.recordingStatus : t.readyToRecord}
                  </p>
                </div>
              </button>

            </div>

            <!-- Recording visual feedback sound waves -->
            ${this.recording ? `
              <div class="space-y-2.5 p-4 bg-rose-50/30 border border-rose-100/60 rounded-2xl animate-fade-in">
                <div class="flex items-center justify-between text-[11px] text-rose-800 font-mono font-bold">
                  <span>${t.recordingStatus}</span>
                  <span>⏳ 2.5s</span>
                </div>
                <div class="flex justify-center items-center gap-1.5 h-10 py-1">
                  <div class="sim-wave-bar w-[3px] bg-rose-500 rounded-full transition-all duration-100" style="height: 12px"></div>
                  <div class="sim-wave-bar w-[3px] bg-rose-500 rounded-full transition-all duration-100" style="height: 24px"></div>
                  <div class="sim-wave-bar w-[3px] bg-rose-500 rounded-full transition-all duration-100" style="height: 16px"></div>
                  <div class="sim-wave-bar w-[3px] bg-rose-500 rounded-full transition-all duration-100" style="height: 32px"></div>
                  <div class="sim-wave-bar w-[3px] bg-rose-500 rounded-full transition-all duration-100" style="height: 20px"></div>
                  <div class="sim-wave-bar w-[3px] bg-rose-500 rounded-full transition-all duration-100" style="height: 28px"></div>
                  <div class="sim-wave-bar w-[3px] bg-rose-500 rounded-full transition-all duration-100" style="height: 10px"></div>
                  <div class="sim-wave-bar w-[3px] bg-rose-500 rounded-full transition-all duration-100" style="height: 26px"></div>
                  <div class="sim-wave-bar w-[3px] bg-rose-500 rounded-full transition-all duration-100" style="height: 14px"></div>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-1.5 relative overflow-hidden">
                  <div id="recordProgressBar" class="h-full bg-rose-500 rounded-full transition-all duration-100" style="width: 0%"></div>
                </div>
              </div>
            ` : ""}

            <!-- Speech score evaluation results outcome details -->
            ${this.scoreResult ? `
              <div class="border border-indigo-100 bg-indigo-50/15 rounded-3xl p-6 space-y-6 animate-fade-in">
                <div class="flex flex-col sm:flex-row items-center gap-6 justify-between">
                  <div class="flex items-center gap-4">
                    <div class="relative w-24 h-24 shrink-0">
                      <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#e2e8f0" stroke-width="3" />
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#4f46e5" stroke-width="3" stroke-dasharray="${this.scoreResult.score}, 100" stroke-linecap="round" class="transition-all duration-500 ease-out" />
                      </svg>
                      <div class="absolute inset-0 flex flex-col items-center justify-center">
                        <span class="text-2xl font-black font-mono text-slate-900 leading-none">${this.scoreResult.score}%</span>
                        <span class="text-[9px] font-mono font-bold text-slate-400 mt-0.5">SCORE</span>
                      </div>
                    </div>
                    
                    <div class="space-y-1">
                      <h4 class="font-extrabold text-slate-800 text-xs">${t.scoreDetail}</h4>
                      <p class="text-[11px] text-indigo-700/80 font-semibold font-mono uppercase tracking-wider">
                        ${this.scoreResult.score >= 90 ? "🌟 Excellent (Tena Mahay)" : "👍 Good (Mendrika)"}
                      </p>
                    </div>
                  </div>

                  <div class="w-full sm:w-48 space-y-3.5">
                    <div class="space-y-1">
                      <div class="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase font-mono">
                        <span>${t.accuracy}</span>
                        <span class="font-black text-slate-800">${this.scoreResult.accuracy}%</span>
                      </div>
                      <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div class="bg-indigo-600 h-full rounded-full transition-all duration-500" style="width: ${this.scoreResult.accuracy}%"></div>
                      </div>
                    </div>

                    <div class="space-y-1">
                      <div class="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase font-mono">
                        <span>${t.rhythm}</span>
                        <span class="font-black text-slate-800">${this.scoreResult.rhythm}%</span>
                      </div>
                      <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div class="bg-indigo-600 h-full rounded-full transition-all duration-500" style="width: ${this.scoreResult.rhythm}%"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="bg-indigo-50 border border-indigo-100/50 rounded-2xl p-4 space-y-1">
                  <span class="text-[10px] font-bold uppercase text-indigo-600 font-mono tracking-wider block">${t.verdictLabel}</span>
                  <p class="text-xs text-slate-700 font-semibold leading-relaxed">
                    "${this.scoreResult.feedback}"
                  </p>
                </div>

                <div class="border-t border-indigo-100/40 pt-4 space-y-4">
                  <div>
                    <h4 class="font-extrabold text-slate-800 text-xs">${t.submitTitle}</h4>
                    <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">${t.submitDesc}</p>
                  </div>

                  ${this.scoreSubmitted ? `
                    <div class="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex items-center gap-2.5 text-emerald-800 font-bold text-xs">
                      <span>🎉</span>
                      <span>${t.submittedText} (+10 XP)</span>
                    </div>
                  ` : `
                    <div class="flex flex-col sm:flex-row gap-3">
                      <div class="relative flex-1">
                        <input id="nicknameInput" type="text" value="${this.userNickname}" placeholder="${t.submitPlaceholder}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold font-mono focus:outline-none focus:border-indigo-500 focus:bg-white" maxlength="25">
                        <button id="randomizeNickBtn" class="absolute right-2.5 top-2 hover:bg-slate-100 text-xs p-1 rounded-lg cursor-pointer" title="Generate Random Alias">🎲</button>
                      </div>
                      <button id="submitScoreBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0">
                        📤 ${t.submitBtn}
                      </button>
                    </div>
                  `}
                </div>

              </div>
            ` : ""}

            <div class="text-[11px] text-slate-400 font-medium pl-1">
              ${t.helpTip}
            </div>

          </div>

          <!-- Comparative Benchmarks and Global Leaderboard Grid columns -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
              <span class="text-[10px] font-black uppercase text-slate-400 font-mono tracking-widest block">Benchmarks</span>
              <h4 class="text-sm font-extrabold text-slate-800">${isMg ? "Salan'isa sy vokatra eran-tany" : "Statistiques Mondiales"}</h4>
              
              <div class="space-y-4 pt-1">
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>${t.globalAverage}</span>
                    <span class="font-mono font-bold text-slate-800">${globalAvg}%</span>
                  </div>
                  <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden relative">
                    <div class="bg-slate-400 h-full rounded-full transition-all duration-500" style="width: ${globalAvg}%"></div>
                  </div>
                </div>

                <div class="space-y-1.5">
                  <div class="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>${t.topBenchmark}</span>
                    <span class="font-mono font-bold text-slate-800">${topBenchmark}%</span>
                  </div>
                  <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden relative">
                    <div class="bg-indigo-600 h-full rounded-full transition-all duration-500" style="width: ${topBenchmark}%"></div>
                  </div>
                </div>

                ${personalBest !== null ? `
                  <div class="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[11px] leading-relaxed text-slate-600">
                    💡 ${isMg 
                      ? `Ny ezakao <strong>(${personalBest}%)</strong> dia ${personalBest >= globalAvg ? "ambonika" : "ambany kokoa"} noho ny salan'isa iraisam-pirenena <strong>(${globalAvg}%)</strong>.` 
                      : `Votre score de <strong>${personalBest}%</strong> est ${personalBest >= globalAvg ? "supérieur" : "inférieur"} à la moyenne mondiale de <strong>${globalAvg}%</strong>.`
                    }
                  </div>
                ` : ""}

                <div class="flex justify-between items-center text-[11px] text-slate-400 font-mono font-bold pt-1.5 border-t border-slate-50">
                  <span>${t.totalAttempts} :</span>
                  <span class="text-slate-700">${totalAttemptsSim} runs</span>
                </div>
              </div>
            </div>

            <div class="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
              <span class="text-[10px] font-black uppercase text-slate-400 font-mono tracking-widest block">Leaderboard Phrase</span>
              <h4 class="text-sm font-extrabold text-slate-800">${t.leaderboardTitle}</h4>

              <div class="space-y-2 pt-1 max-h-[190px] overflow-y-auto">
                ${leaderboard.length === 0 ? `
                  <div class="text-center py-6 text-xs text-slate-400 font-medium">
                    No submissions yet. Record your voice and submit!
                  </div>
                ` : leaderboard.slice(0, 10).map((entry: any, index: number) => {
                    const isCurrentUser = personalBest !== null && entry.score === personalBest;
                    const isTopThree = index < 3;
                    const rankMedals = ["🥇", "🥈", "🥉"];
                    
                    return `
                      <div class="flex items-center justify-between p-2 rounded-xl transition-colors ${
                        isCurrentUser 
                          ? "bg-indigo-50 border border-indigo-100/50" 
                          : "border border-transparent hover:bg-slate-50"
                      }">
                        <div class="flex items-center gap-3">
                          <span class="text-xs font-black font-mono w-5 text-center ${
                            isTopThree ? "text-amber-600" : "text-slate-400"
                          }">
                            ${isTopThree ? rankMedals[index] : index + 1}
                          </span>
                          <span class="text-xs font-extrabold font-mono text-slate-800 ${isCurrentUser ? "text-indigo-900 font-black" : ""}">
                            ${entry.name}
                          </span>
                        </div>
                        <div class="flex items-center gap-1.5">
                          <span class="text-xs font-black font-mono text-indigo-700">${entry.score}%</span>
                        </div>
                      </div>
                    `;
                  }).join("")}
              </div>

              ${personalBest !== null ? `
                <div class="border-t border-slate-100 pt-3.5 flex justify-between items-center text-[11px] font-bold">
                  <span class="text-slate-400 font-mono uppercase tracking-wider">${t.yourRank} :</span>
                  <span class="font-mono text-indigo-600 font-black bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                    Rank #${userRankIndex} of ${leaderboard.length}
                  </span>
                </div>
              ` : ""}
            </div>
          </div>

        </div>

      </div>
    `;
  }

  /**
   * Renders the DELF A1 Épreuves Challenges view (Compréhension orale, Compréhension écrite, Production écrite, Production orale)
   */
  private renderDelfChallenges(t: any, isMg: boolean): string {
    const scoreKey = `${this.activeDelfLevel}_${this.activeDelfSection}`;
    const score = this.delfChallengeScores[scoreKey] ?? null;

    return `
      <!-- DELF Banner & Section Switcher -->
      <div class="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-5">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-indigo-800/60 pb-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-xs font-black uppercase font-mono tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-3 py-0.5 rounded-full">
                DELF ${this.activeDelfLevel} CECRL
              </span>
              <span class="text-xs text-amber-400 font-bold font-mono">25 points / épreuve</span>
            </div>
            <h3 class="text-xl md:text-2xl font-black tracking-tight text-white">
              ${isMg ? `Fanamby amin'ny Épreuves DELF ${this.activeDelfLevel}` : `Défis Pratiques DELF ${this.activeDelfLevel}`}
            </h3>
            <p class="text-xs text-indigo-200 font-medium">
              ${isMg 
                ? `Fanazarantena amin'ireo épreuves 4 amin'ny DELF ${this.activeDelfLevel}: Compréhension orale, Compréhension écrite, Production écrite, sy Production orale.` 
                : `Entraînez-vous épreuve par épreuve pour réussir l'examen DELF ${this.activeDelfLevel} avec correction immédiate.`}
            </p>
          </div>

          <div class="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <!-- Level Switcher Toggle -->
            <div class="flex items-center gap-1.5 bg-indigo-950/80 p-1.5 rounded-2xl border border-indigo-400/30">
              <button id="delfLevelA1Btn" class="px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                this.activeDelfLevel === "A1"
                  ? "bg-amber-400 text-slate-950 shadow-sm"
                  : "text-indigo-200 hover:text-white"
              }">
                DELF A1
              </button>
              <button id="delfLevelA2Btn" class="px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                this.activeDelfLevel === "A2"
                  ? "bg-amber-400 text-slate-950 shadow-sm"
                  : "text-indigo-200 hover:text-white"
              }">
                DELF A2
              </button>
            </div>

            <button id="goToFullExamBtn" class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-4 py-2.5 rounded-2xl shadow-lg transition-all cursor-pointer flex items-center gap-2 active:scale-95 shrink-0">
              <span>🚀</span>
              <span>${isMg ? `Examen DELF ${this.activeDelfLevel} blanc` : `Examen Blanc DELF ${this.activeDelfLevel}`}</span>
            </button>
          </div>
        </div>

        <!-- 4 Épreuve Switcher Buttons -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          <button class="delf-section-btn p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            this.activeDelfSection === "oral_comp"
              ? "bg-indigo-600 border-indigo-400 text-white shadow-md font-bold"
              : "bg-indigo-950/60 border-indigo-800/80 text-indigo-200 hover:bg-indigo-900/60"
          }" data-section="oral_comp">
            <div class="flex items-center gap-2.5">
              <span class="text-xl">🎧</span>
              <div>
                <span class="block text-xs font-black">Compréhension Orale</span>
                <span class="block text-[10px] text-indigo-300 font-mono">25 pts • Audio</span>
              </div>
            </div>
          </button>

          <button class="delf-section-btn p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            this.activeDelfSection === "written_comp"
              ? "bg-indigo-600 border-indigo-400 text-white shadow-md font-bold"
              : "bg-indigo-950/60 border-indigo-800/80 text-indigo-200 hover:bg-indigo-900/60"
          }" data-section="written_comp">
            <div class="flex items-center gap-2.5">
              <span class="text-xl">📖</span>
              <div>
                <span class="block text-xs font-black">Compréhension Écrite</span>
                <span class="block text-[10px] text-indigo-300 font-mono">25 pts • Lecture</span>
              </div>
            </div>
          </button>

          <button class="delf-section-btn p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            this.activeDelfSection === "written_prod"
              ? "bg-indigo-600 border-indigo-400 text-white shadow-md font-bold"
              : "bg-indigo-950/60 border-indigo-800/80 text-indigo-200 hover:bg-indigo-900/60"
          }" data-section="written_prod">
            <div class="flex items-center gap-2.5">
              <span class="text-xl">✍️</span>
              <div>
                <span class="block text-xs font-black">Production Écrite</span>
                <span class="block text-[10px] text-indigo-300 font-mono">25 pts • Rédaction</span>
              </div>
            </div>
          </button>

          <button class="delf-section-btn p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            this.activeDelfSection === "oral_prod"
              ? "bg-indigo-600 border-indigo-400 text-white shadow-md font-bold"
              : "bg-indigo-950/60 border-indigo-800/80 text-indigo-200 hover:bg-indigo-900/60"
          }" data-section="oral_prod">
            <div class="flex items-center gap-2.5">
              <span class="text-xl">🗣️</span>
              <div>
                <span class="block text-xs font-black">Production Orale</span>
                <span class="block text-[10px] text-indigo-300 font-mono">25 pts • Expression</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Main Épreuve Content Workspace -->
      <div class="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
        ${this.renderActiveDelfSectionContent(isMg)}
      </div>
    `;
  }

  private renderActiveDelfSectionContent(isMg: boolean): string {
    const scoreKey = `${this.activeDelfLevel}_${this.activeDelfSection}`;
    const isSubmitted = !!this.delfChallengeSubmitted[scoreKey];
    const score = this.delfChallengeScores[scoreKey] ?? null;
    const level = this.activeDelfLevel;

    if (this.activeDelfSection === "oral_comp") {
      const audioText = level === "A1"
        ? "Attention chers voyageurs, le train numéro 452 à destination de Paris partira de la voie 3 à 14 heures 30. Veuillez composter votre billet avant d'accéder au quai."
        : "Chers clients, votre supermarché Leader Price ferme ses portes dans 15 minutes à 19h45. Nous vous prions de vous diriger vers les caisses. Profitez également de notre offre sur les produits locaux à -20%. Merci de votre visite.";

      return `
        <div class="space-y-6">
          <div class="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span class="text-[10px] font-black uppercase text-indigo-600 font-mono bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                Épreuve 1 / 4 • DELF ${level}
              </span>
              <h3 class="text-lg font-black text-slate-900 mt-1">🎧 Compréhension de l'Oral (Listening Challenge ${level})</h3>
              <p class="text-xs text-slate-500">Écoutez le document audio et répondez aux questions ci-dessous.</p>
            </div>
            ${score !== null ? `
              <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-right">
                <span class="text-[10px] font-mono font-bold text-emerald-700 block">SCORE OBTENU</span>
                <span class="text-lg font-black font-mono text-emerald-800">${score} / 25 pts</span>
              </div>
            ` : ""}
          </div>

          <!-- Audio Listening Player Block -->
          <div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <span class="text-xs font-bold text-slate-700 flex items-center gap-2">
                <span>📻</span>
                <span>Document sonore DELF ${level} : ${level === "A1" ? "Annonce station de train" : "Annonce supermarché"}</span>
              </span>
              <button id="playDelfOralAudioBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 active:scale-95 shadow-xs">
                <span>🔊</span>
                <span>Écouter l'enregistrement</span>
              </button>
            </div>
            <p class="text-[11px] text-slate-500 italic">
              "${audioText}"
            </p>
          </div>

          <!-- Question 1 -->
          <div class="space-y-3 bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
            <h4 class="text-xs font-extrabold text-slate-800">
              ${level === "A1" ? "1. De quel type de transport s'agit-il dans l'annonce ?" : "1. À quelle heure ferme le supermarché ?"}
            </h4>
            <div class="space-y-2">
              ${level === "A1" ? `
                <label class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/40 text-xs font-medium">
                  <input type="radio" name="delf_co_q1" value="A" ${this.delfOralCompAnswers['q1'] === 'A' ? 'checked' : ''} class="w-4 h-4 text-indigo-600">
                  <span>A. Un avion à l'aéroport</span>
                </label>
                <label class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/40 text-xs font-medium">
                  <input type="radio" name="delf_co_q1" value="B" ${this.delfOralCompAnswers['q1'] === 'B' ? 'checked' : ''} class="w-4 h-4 text-indigo-600">
                  <span>B. Un train dans une gare</span>
                </label>
                <label class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/40 text-xs font-medium">
                  <input type="radio" name="delf_co_q1" value="C" ${this.delfOralCompAnswers['q1'] === 'C' ? 'checked' : ''} class="w-4 h-4 text-indigo-600">
                  <span>C. Un bus urbain</span>
                </label>
              ` : `
                <label class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/40 text-xs font-medium">
                  <input type="radio" name="delf_co_q1" value="A" ${this.delfOralCompAnswers['q1'] === 'A' ? 'checked' : ''} class="w-4 h-4 text-indigo-600">
                  <span>A. 19h30</span>
                </label>
                <label class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/40 text-xs font-medium">
                  <input type="radio" name="delf_co_q1" value="B" ${this.delfOralCompAnswers['q1'] === 'B' ? 'checked' : ''} class="w-4 h-4 text-indigo-600">
                  <span>B. 19h45</span>
                </label>
                <label class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/40 text-xs font-medium">
                  <input type="radio" name="delf_co_q1" value="C" ${this.delfOralCompAnswers['q1'] === 'C' ? 'checked' : ''} class="w-4 h-4 text-indigo-600">
                  <span>C. 20h00</span>
                </label>
              `}
            </div>
          </div>

          <!-- Question 2 -->
          <div class="space-y-3 bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
            <h4 class="text-xs font-extrabold text-slate-800">
              ${level === "A1" ? "2. À quelle heure est prévu le départ du train ?" : "2. Quelle est la réduction offerte sur les produits locaux ?"}
            </h4>
            <div class="space-y-2">
              ${level === "A1" ? `
                <label class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/40 text-xs font-medium">
                  <input type="radio" name="delf_co_q2" value="A" ${this.delfOralCompAnswers['q2'] === 'A' ? 'checked' : ''} class="w-4 h-4 text-indigo-600">
                  <span>A. 14h30 (Quatorze heures trente)</span>
                </label>
                <label class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/40 text-xs font-medium">
                  <input type="radio" name="delf_co_q2" value="B" ${this.delfOralCompAnswers['q2'] === 'B' ? 'checked' : ''} class="w-4 h-4 text-indigo-600">
                  <span>B. 15h00 (Quinze heures)</span>
                </label>
                <label class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/40 text-xs font-medium">
                  <input type="radio" name="delf_co_q2" value="C" ${this.delfOralCompAnswers['q2'] === 'C' ? 'checked' : ''} class="w-4 h-4 text-indigo-600">
                  <span>C. 12h30 (Douze heures trente)</span>
                </label>
              ` : `
                <label class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/40 text-xs font-medium">
                  <input type="radio" name="delf_co_q2" value="A" ${this.delfOralCompAnswers['q2'] === 'A' ? 'checked' : ''} class="w-4 h-4 text-indigo-600">
                  <span>A. -10%</span>
                </label>
                <label class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/40 text-xs font-medium">
                  <input type="radio" name="delf_co_q2" value="B" ${this.delfOralCompAnswers['q2'] === 'B' ? 'checked' : ''} class="w-4 h-4 text-indigo-600">
                  <span>B. -20%</span>
                </label>
                <label class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/40 text-xs font-medium">
                  <input type="radio" name="delf_co_q2" value="C" ${this.delfOralCompAnswers['q2'] === 'C' ? 'checked' : ''} class="w-4 h-4 text-indigo-600">
                  <span>C. -30%</span>
                </label>
              `}
            </div>
          </div>

          <div class="pt-2 flex items-center justify-between flex-wrap gap-3">
            <span class="text-xs text-slate-500 font-medium">
              ${isSubmitted ? `✅ Épreuve DELF ${level} validée ! Vous avez gagné +30 XP.` : "Répondez aux questions et validez votre réponse."}
            </span>
            <button id="submitDelfOralCompBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-6 py-3 rounded-2xl shadow-md transition-all cursor-pointer active:scale-95">
              ${isSubmitted ? "🔄 Réessayer l'épreuve" : `Valider la Compréhension Orale ${level} (+30 XP)`}
            </button>
          </div>
        </div>
      `;
    }

    if (this.activeDelfSection === "written_comp") {
      return `
        <div class="space-y-6">
          <div class="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span class="text-[10px] font-black uppercase text-indigo-600 font-mono bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                Épreuve 2 / 4 • DELF ${level}
              </span>
              <h3 class="text-lg font-black text-slate-900 mt-1">📖 Compréhension des Écrits (Reading Challenge ${level})</h3>
              <p class="text-xs text-slate-500">Lisez le document ci-dessous et répondez aux questions.</p>
            </div>
            ${score !== null ? `
              <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-right">
                <span class="text-[10px] font-mono font-bold text-emerald-700 block">SCORE OBTENU</span>
                <span class="text-lg font-black font-mono text-emerald-800">${score} / 25 pts</span>
              </div>
            ` : ""}
          </div>

          <!-- Document Text Card -->
          <div class="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-5 space-y-2 font-mono text-xs text-slate-800">
            ${level === "A1" ? `
              <div class="border-b border-amber-200/50 pb-2 text-[11px] text-slate-500">
                <strong>De :</strong> sarah@email.fr<br>
                <strong>À :</strong> thomas@email.fr<br>
                <strong>Objet :</strong> Invitation dîner d'anniversaire
              </div>
              <p class="pt-1 leading-relaxed">
                Salut Thomas,<br><br>
                Je t'invite à fêter mon anniversaire ce samedi 12 août à 19h30 au restaurant "Le Gourmet" en centre-ville.<br>
                Merci de me répondre avant jeudi pour confirmer ta présence !<br><br>
                À bientôt,<br>
                Sarah
              </p>
            ` : `
              <div class="border-b border-amber-200/50 pb-2 text-[11px] text-slate-500">
                <strong>OFFRE D'EMPLOI : ASSISTANT COMMERCIAL</strong><br>
                Société Textile Madagascar — Ankorondrano, Antananarivo
              </div>
              <p class="pt-1 leading-relaxed">
                Entreprise de textile à Antananarivo recherche un assistant commercial.<br>
                Missions : Accueil de la clientèle, gestion des e-mails, rédaction des devis.<br>
                Profil : Diplôme de niveau Bac minimum, maîtrise du français parlé et écrit, ponctuel et dynamique.<br>
                Pour postuler : Envoyez CV et lettre de motivation à recrutement@textile.mg avant le 30 juin.
              </p>
            `}
          </div>

          <!-- Question 1 -->
          <div class="space-y-3 bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
            <h4 class="text-xs font-extrabold text-slate-800">
              ${level === "A1" ? "1. Quel est l'objectif du message de Sarah ?" : "1. Dans quel secteur travaille l'entreprise qui recrute ?"}
            </h4>
            <div class="space-y-2">
              ${level === "A1" ? `
                <label class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/40 text-xs font-medium">
                  <input type="radio" name="delf_ce_q1" value="A" ${this.delfWrittenCompAnswers['q1'] === 'A' ? 'checked' : ''} class="w-4 h-4 text-indigo-600">
                  <span>A. L'inviter à un dîner d'anniversaire au restaurant</span>
                </label>
                <label class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/40 text-xs font-medium">
                  <input type="radio" name="delf_ce_q1" value="B" ${this.delfWrittenCompAnswers['q1'] === 'B' ? 'checked' : ''} class="w-4 h-4 text-indigo-600">
                  <span>B. Lui demander un service pour ses devoirs</span>
                </label>
                <label class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/40 text-xs font-medium">
                  <input type="radio" name="delf_ce_q1" value="C" ${this.delfWrittenCompAnswers['q1'] === 'C' ? 'checked' : ''} class="w-4 h-4 text-indigo-600">
                  <span>C. Lui vendre un billet de train</span>
                </label>
              ` : `
                <label class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/40 text-xs font-medium">
                  <input type="radio" name="delf_ce_q1" value="A" ${this.delfWrittenCompAnswers['q1'] === 'A' ? 'checked' : ''} class="w-4 h-4 text-indigo-600">
                  <span>A. Informatique & Télécoms</span>
                </label>
                <label class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/40 text-xs font-medium">
                  <input type="radio" name="delf_ce_q1" value="B" ${this.delfWrittenCompAnswers['q1'] === 'B' ? 'checked' : ''} class="w-4 h-4 text-indigo-600">
                  <span>B. Textile et confection</span>
                </label>
                <label class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/40 text-xs font-medium">
                  <input type="radio" name="delf_ce_q1" value="C" ${this.delfWrittenCompAnswers['q1'] === 'C' ? 'checked' : ''} class="w-4 h-4 text-indigo-600">
                  <span>C. Restauration et hôtellerie</span>
                </label>
              `}
            </div>
          </div>

          <!-- Question 2 -->
          <div class="space-y-3 bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
            <h4 class="text-xs font-extrabold text-slate-800">
              ${level === "A1" ? "2. Quel jour et à quelle heure est fixée la rencontre ?" : "2. Quel est le niveau d'études minimum exigé ?"}
            </h4>
            <div class="space-y-2">
              ${level === "A1" ? `
                <label class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/40 text-xs font-medium">
                  <input type="radio" name="delf_ce_q2" value="A" ${this.delfWrittenCompAnswers['q2'] === 'A' ? 'checked' : ''} class="w-4 h-4 text-indigo-600">
                  <span>A. Samedi à 19h30</span>
                </label>
                <label class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/40 text-xs font-medium">
                  <input type="radio" name="delf_ce_q2" value="B" ${this.delfWrittenCompAnswers['q2'] === 'B' ? 'checked' : ''} class="w-4 h-4 text-indigo-600">
                  <span>B. Dimanche à 12h00</span>
                </label>
                <label class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/40 text-xs font-medium">
                  <input type="radio" name="delf_ce_q2" value="C" ${this.delfWrittenCompAnswers['q2'] === 'C' ? 'checked' : ''} class="w-4 h-4 text-indigo-600">
                  <span>C. Jeudi à 18h00</span>
                </label>
              ` : `
                <label class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/40 text-xs font-medium">
                  <input type="radio" name="delf_ce_q2" value="A" ${this.delfWrittenCompAnswers['q2'] === 'A' ? 'checked' : ''} class="w-4 h-4 text-indigo-600">
                  <span>A. Baccalauréat (Bac) minimum</span>
                </label>
                <label class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/40 text-xs font-medium">
                  <input type="radio" name="delf_ce_q2" value="B" ${this.delfWrittenCompAnswers['q2'] === 'B' ? 'checked' : ''} class="w-4 h-4 text-indigo-600">
                  <span>B. BEPC</span>
                </label>
                <label class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/40 text-xs font-medium">
                  <input type="radio" name="delf_ce_q2" value="C" ${this.delfWrittenCompAnswers['q2'] === 'C' ? 'checked' : ''} class="w-4 h-4 text-indigo-600">
                  <span>C. Master II</span>
                </label>
              `}
            </div>
          </div>

          <div class="pt-2 flex items-center justify-between flex-wrap gap-3">
            <span class="text-xs text-slate-500 font-medium">
              ${isSubmitted ? `✅ Épreuve DELF ${level} validée ! Vous avez gagné +30 XP.` : "Sélectionnez vos réponses et validez."}
            </span>
            <button id="submitDelfWrittenCompBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-6 py-3 rounded-2xl shadow-md transition-all cursor-pointer active:scale-95">
              ${isSubmitted ? "🔄 Réessayer l'épreuve" : `Valider la Compréhension Écrite ${level} (+30 XP)`}
            </button>
          </div>
        </div>
      `;
    }

    if (this.activeDelfSection === "written_prod") {
      const wordCount = (this.delfWrittenProdText.trim().match(/\S+/g) || []).length;
      const targetMin = level === "A1" ? 35 : 50;
      const targetMax = level === "A1" ? 50 : 80;

      return `
        <div class="space-y-6">
          <div class="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span class="text-[10px] font-black uppercase text-indigo-600 font-mono bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                Épreuve 3 / 4 • DELF ${level}
              </span>
              <h3 class="text-lg font-black text-slate-900 mt-1">✍️ Production Écrite (Writing Challenge ${level})</h3>
              <p class="text-xs text-slate-500">Rédigez un court texte selon le sujet proposé (objectif : ${targetMin} à ${targetMax} mots).</p>
            </div>
            ${score !== null ? `
              <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-right">
                <span class="text-[10px] font-mono font-bold text-emerald-700 block">SCORE OBTENU</span>
                <span class="text-lg font-black font-mono text-emerald-800">${score} / 25 pts</span>
              </div>
            ` : ""}
          </div>

          <!-- Prompt Box -->
          <div class="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 space-y-2">
            <span class="text-[10px] font-bold uppercase font-mono text-indigo-700">Sujet de rédaction DELF ${level} :</span>
            <p class="text-xs text-slate-800 font-medium leading-relaxed">
              ${level === "A1" 
                ? `"Vous êtes en vacances à Nosy Be (Madagascar). Rédigez une carte postale (40 à 50 mots) à un ami français pour décrire le temps qu'il fait, vos activités et ce que vous aimez."`
                : `"Votre ami vous a invité chez lui à Mahajanga. Écrivez-lui un e-mail (60 à 80 mots) pour le remercier, lui confirmer vos dates d'arrivée, et lui proposer une activité."`
              }
            </p>
          </div>

          <!-- Textarea Input -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs font-bold text-slate-700">
              <label for="delfWrittenProdTextarea">Votre texte en français :</label>
              <span class="font-mono text-xs ${wordCount >= targetMin && wordCount <= targetMax + 10 ? 'text-emerald-600 font-black' : 'text-slate-500'}">
                ${wordCount} mots (objectif : ${targetMin} - ${targetMax} mots)
              </span>
            </div>
            <textarea id="delfWrittenProdTextarea" rows="5" placeholder="${
              level === "A1" 
                ? "Bonjour Paul, je suis en vacances à Nosy Be. Il fait très chaud et beau. Je me baigne tous les jours à la plage et je mange des fruits frais. Bises !"
                : "Cher Marc, je te remercie chaleureusement pour ton invitation ! Je suis ravi de venir te rendre visite à Mahajanga. J'arriverai le vendredi 10 par le bus. J'aimerais beaucoup visiter le baobab. À très bientôt !"
            }" class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all">${this.delfWrittenProdText}</textarea>
          </div>

          <div class="pt-2 flex items-center justify-between flex-wrap gap-3">
            <span class="text-xs text-slate-500 font-medium">
              ${isSubmitted ? `✅ Production écrite DELF ${level} évaluée avec succès !` : `Écrivez au moins ${targetMin} mots et validez pour obtenir vos points.`}
            </span>
            <button id="submitDelfWrittenProdBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-6 py-3 rounded-2xl shadow-md transition-all cursor-pointer active:scale-95">
              ${isSubmitted ? "🔄 Réévaluer mon texte" : `Évaluer la Production Écrite ${level} (+40 XP)`}
            </button>
          </div>
        </div>
      `;
    }

    // Oral production
    return `
      <div class="space-y-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <span class="text-[10px] font-black uppercase text-indigo-600 font-mono bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
              Épreuve 4 / 4 • DELF ${level}
            </span>
            <h3 class="text-lg font-black text-slate-900 mt-1">🗣️ Production Orale (Speaking Challenge ${level})</h3>
            <p class="text-xs text-slate-500">Réalisez l'épreuve orale en vous exprimant clairement en français.</p>
          </div>
          ${score !== null ? `
            <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-right">
              <span class="text-[10px] font-mono font-bold text-emerald-700 block">SCORE OBTENU</span>
              <span class="text-lg font-black font-mono text-emerald-800">${score} / 25 pts</span>
            </div>
          ` : ""}
        </div>

        <!-- Oral Prompt Box -->
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
          <span class="text-[10px] font-bold uppercase font-mono text-indigo-700">Consigne orale DELF ${level} :</span>
          <p class="text-xs text-slate-800 font-semibold leading-relaxed">
            ${level === "A1"
              ? `"Présentez-vous à l'examinateur en français : indiquez votre nom, votre âge, votre ville d'origine, votre profession/études, et vos loisirs principaux."`
              : `"Présentez votre journée habituelle à Madagascar et décrivez vos projets pour les prochaines vacances (activités, lieux, famille)."`
            }
          </p>
          <div class="text-[11px] text-slate-500 font-mono bg-white p-3 rounded-xl border border-slate-200/60">
            💡 Exemple : <em>${
              level === "A1"
                ? `"Bonjour, je m'appelle Rivo. J'ai 22 ans. J'habite à Antananarivo. Je suis étudiant. J'aime le football et la musique."`
                : `"Chaque matin, je me lève à 6 heures. Je travaille à Antananarivo. Pour les vacances, je compte voyager à Foulpointe avec ma famille."`
            }</em>
          </div>
        </div>

        <!-- Microphone Recording Section -->
        <div class="flex flex-col items-center justify-center p-6 bg-indigo-50/40 border border-indigo-100 rounded-3xl space-y-4">
          <button id="recordDelfOralProdBtn" class="w-20 h-20 rounded-full ${
            this.delfOralProdRecording ? 'bg-rose-500 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'
          } text-white text-3xl flex items-center justify-center shadow-lg transition-all cursor-pointer active:scale-95">
            🎤
          </button>
          <span class="text-xs font-bold text-slate-700">
            ${this.delfOralProdRecording ? "Enregistrement de votre voix en cours..." : "Cliquez sur le micro pour parler"}
          </span>
        </div>

        <!-- Score & Feedback Display -->
        ${this.delfOralProdResult ? `
          <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black text-emerald-900">Évaluation Acoustique & Prononciation :</span>
              <span class="text-xs font-mono font-black text-emerald-800">${this.delfOralProdResult.score}% de précision</span>
            </div>
            <p class="text-xs text-emerald-800 font-medium">
              "${this.delfOralProdResult.feedback}"
            </p>
          </div>
        ` : ""}
      </div>
    `;
  }

  private bindEvents() {
    // 0. Top Navigation Tab Switcher
    this.querySelector("#tabGlobalXpBtn")?.addEventListener("click", () => {
      this.activeTab = "global_xp";
      this.render();
    });

    this.querySelector("#tabShadowingBtn")?.addEventListener("click", () => {
      this.activeTab = "shadowing";
      this.render();
    });

    this.querySelector("#tabDelfBtn")?.addEventListener("click", () => {
      this.activeTab = "delf_challenges";
      this.render();
    });

    // Global XP Tab Actions
    if (this.activeTab === "global_xp") {
      this.querySelector("#editProfileBtn")?.addEventListener("click", () => {
        this.showEditProfileModal = true;
        this.render();
      });

      this.querySelector("#quickReviewLeaderboardBtn")?.addEventListener("click", () => {
        quickReviewService.openQuickReviewModal(() => this.render());
      });

      this.querySelector("#goToShadowingTabBtn")?.addEventListener("click", () => {
        this.activeTab = "shadowing";
        this.render();
      });

      // Timeframe filters
      this.querySelectorAll(".tf-filter-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const tf = (e.currentTarget as HTMLElement).getAttribute("data-tf") as "all" | "monthly" | "weekly";
          if (tf) {
            this.filterTimeframe = tf;
            this.render();
          }
        });
      });

      // Edit Profile Modal handlers
      if (this.showEditProfileModal) {
        let selectedAvatar = "🎓";
        let selectedFlag = "🇲🇬";

        this.querySelectorAll(".avatar-select-btn").forEach(btn => {
          btn.addEventListener("click", (e) => {
            const el = e.currentTarget as HTMLElement;
            selectedAvatar = el.getAttribute("data-avatar") || "🎓";
            this.querySelectorAll(".avatar-select-btn").forEach(b => b.classList.remove("bg-indigo-50", "border-indigo-500"));
            el.classList.add("bg-indigo-50", "border-indigo-500");
          });
        });

        this.querySelectorAll(".flag-select-btn").forEach(btn => {
          btn.addEventListener("click", (e) => {
            const el = e.currentTarget as HTMLElement;
            selectedFlag = el.getAttribute("data-flag") || "🇲🇬";
            this.querySelectorAll(".flag-select-btn").forEach(b => b.classList.remove("bg-indigo-50", "border-indigo-500", "text-indigo-900"));
            el.classList.add("bg-indigo-50", "border-indigo-500", "text-indigo-900");
          });
        });

        this.querySelector("#closeProfileModalBtn")?.addEventListener("click", () => {
          this.showEditProfileModal = false;
          this.render();
        });

        this.querySelector("#cancelProfileModalBtn")?.addEventListener("click", () => {
          this.showEditProfileModal = false;
          this.render();
        });

        this.querySelector("#saveProfileModalBtn")?.addEventListener("click", () => {
          const input = this.querySelector("#modalNameInput") as HTMLInputElement;
          const newName = input ? input.value : "";
          this.db.updateUserXpLeaderboardName(newName, selectedAvatar, selectedFlag);
          this.showEditProfileModal = false;
          this.render();
        });
      }
    }

    // Shadowing Tab Actions
    if (this.activeTab === "shadowing") {
      const cards = this.querySelectorAll(".phraseCardBtn");
      cards.forEach(card => {
        card.addEventListener("click", (e) => {
          const id = (e.currentTarget as HTMLElement).getAttribute("data-id");
          if (id && id !== this.activePhraseId) {
            this.activePhraseId = id;
            this.scoreResult = null;
            this.scoreSubmitted = false;
            this.render();
          }
        });
      });

      const playBtn = this.querySelector("#playOriginalBtn");
      if (playBtn) {
        playBtn.addEventListener("click", () => {
          const selectedPhrase = this.challengePhrases.find(p => p.id === this.activePhraseId) || this.challengePhrases[0];
          this.speakPhrase(selectedPhrase.phrase);
        });
      }

      const recordBtn = this.querySelector("#recordShadowingBtn");
      if (recordBtn) {
        recordBtn.addEventListener("click", () => {
          const selectedPhrase = this.challengePhrases.find(p => p.id === this.activePhraseId) || this.challengePhrases[0];
          this.startChallengeRecording(selectedPhrase);
        });
      }

      const randBtn = this.querySelector("#randomizeNickBtn");
      if (randBtn) {
        randBtn.addEventListener("click", () => {
          this.userNickname = this.getRandomNickname();
          const input = this.querySelector("#nicknameInput") as HTMLInputElement;
          if (input) {
            input.value = this.userNickname;
          }
        });
      }

      const submitBtn = this.querySelector("#submitScoreBtn");
      if (submitBtn) {
        submitBtn.addEventListener("click", () => {
          const input = this.querySelector("#nicknameInput") as HTMLInputElement;
          const name = input ? input.value : this.userNickname;
          if (this.scoreResult && this.activePhraseId) {
            this.db.submitCommunityScore(this.activePhraseId, name, this.scoreResult.score);
            this.scoreSubmitted = true;
            this.userNickname = name;
            this.render();
          }
        });
      }
    }

    // DELF Challenges Tab Actions
    if (this.activeTab === "delf_challenges") {
      this.querySelector("#goToFullExamBtn")?.addEventListener("click", () => {
        const feheziko = (window as any).feheziko;
        if (feheziko && feheziko.navigate) {
          feheziko.navigate("delf");
        }
      });

      this.querySelector("#delfLevelA1Btn")?.addEventListener("click", () => {
        if (this.activeDelfLevel !== "A1") {
          this.activeDelfLevel = "A1";
          this.render();
        }
      });

      this.querySelector("#delfLevelA2Btn")?.addEventListener("click", () => {
        if (this.activeDelfLevel !== "A2") {
          this.activeDelfLevel = "A2";
          this.render();
        }
      });

      this.querySelectorAll(".delf-section-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const sec = (e.currentTarget as HTMLElement).getAttribute("data-section") as any;
          if (sec) {
            this.activeDelfSection = sec;
            this.render();
          }
        });
      });

      // Compréhension Orale Actions
      this.querySelector("#playDelfOralAudioBtn")?.addEventListener("click", () => {
        const textToSpeak = this.activeDelfLevel === "A1"
          ? "Attention chers voyageurs, le train numéro 452 à destination de Paris partira de la voie 3 à 14 heures 30. Veuillez composter votre billet avant d'accéder au quai."
          : "Chers clients, votre supermarché Leader Price ferme ses portes dans 15 minutes à 19h45. Nous vous prions de vous diriger vers les caisses. Profitez également de notre offre sur les produits locaux à -20%. Merci de votre visite.";
        this.audio.speakFrench(textToSpeak);
      });

      this.querySelectorAll("input[name='delf_co_q1']").forEach(radio => {
        radio.addEventListener("change", (e) => {
          this.delfOralCompAnswers['q1'] = (e.target as HTMLInputElement).value;
        });
      });

      this.querySelectorAll("input[name='delf_co_q2']").forEach(radio => {
        radio.addEventListener("change", (e) => {
          this.delfOralCompAnswers['q2'] = (e.target as HTMLInputElement).value;
        });
      });

      this.querySelector("#submitDelfOralCompBtn")?.addEventListener("click", () => {
        let pts = 0;
        if (this.delfOralCompAnswers['q1'] === 'B') pts += 12.5;
        if (this.delfOralCompAnswers['q2'] === (this.activeDelfLevel === "A1" ? 'A' : 'B')) pts += 12.5;
        const scoreKey = `${this.activeDelfLevel}_oral_comp`;
        this.delfChallengeScores[scoreKey] = pts;
        this.delfChallengeSubmitted[scoreKey] = true;
        this.db.addXp(30);
        this.render();
      });

      // Compréhension Écrite Actions
      this.querySelectorAll("input[name='delf_ce_q1']").forEach(radio => {
        radio.addEventListener("change", (e) => {
          this.delfWrittenCompAnswers['q1'] = (e.target as HTMLInputElement).value;
        });
      });

      this.querySelectorAll("input[name='delf_ce_q2']").forEach(radio => {
        radio.addEventListener("change", (e) => {
          this.delfWrittenCompAnswers['q2'] = (e.target as HTMLInputElement).value;
        });
      });

      this.querySelector("#submitDelfWrittenCompBtn")?.addEventListener("click", () => {
        let pts = 0;
        if (this.delfWrittenCompAnswers['q1'] === (this.activeDelfLevel === "A1" ? 'A' : 'B')) pts += 12.5;
        if (this.delfWrittenCompAnswers['q2'] === 'A') pts += 12.5;
        const scoreKey = `${this.activeDelfLevel}_written_comp`;
        this.delfChallengeScores[scoreKey] = pts;
        this.delfChallengeSubmitted[scoreKey] = true;
        this.db.addXp(30);
        this.render();
      });

      // Production Écrite Actions
      const textarea = this.querySelector("#delfWrittenProdTextarea") as HTMLTextAreaElement;
      if (textarea) {
        textarea.addEventListener("input", () => {
          this.delfWrittenProdText = textarea.value;
        });
      }

      this.querySelector("#submitDelfWrittenProdBtn")?.addEventListener("click", () => {
        const text = this.delfWrittenProdText.trim();
        const words = (text.match(/\S+/g) || []).length;
        const minWords = this.activeDelfLevel === "A1" ? 35 : 50;
        let pts = 0;
        if (words >= minWords) pts += 15;
        if (text.length > 0) pts += 10;
        const scoreKey = `${this.activeDelfLevel}_written_prod`;
        this.delfChallengeScores[scoreKey] = pts;
        this.delfChallengeSubmitted[scoreKey] = true;
        this.db.addXp(40);
        this.render();
      });

      // Production Orale Actions
      this.querySelector("#recordDelfOralProdBtn")?.addEventListener("click", async () => {
        if (this.delfOralProdRecording) return;
        this.delfOralProdRecording = true;
        this.render();
        try {
          const targetPhrase = this.activeDelfLevel === "A1"
            ? "Bonjour, je m'appelle Rivo. J'ai 22 ans. J'habite à Antananarivo."
            : "Chaque matin, je me lève à 6 heures. Je travaille à Antananarivo.";
          const res = await this.audio.recordAndEvaluate(targetPhrase);
          this.delfOralProdResult = res;
          const pts = Math.round((res.score / 100) * 25);
          const scoreKey = `${this.activeDelfLevel}_oral_prod`;
          this.delfChallengeScores[scoreKey] = pts;
          this.delfChallengeSubmitted[scoreKey] = true;
          this.db.addXp(50);
        } catch (err) {
          console.error("Oral prod recording error:", err);
        } finally {
          this.delfOralProdRecording = false;
          this.render();
        }
      });
    }
  }
}

customElements.define("fz-challenges", FzChallenges);
