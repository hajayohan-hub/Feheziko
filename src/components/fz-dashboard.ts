/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseEngine } from "../core/DatabaseEngine";
import { LearningEngine } from "../core/LearningEngine";
import * as d3 from "d3";
import React from "react";
import { createRoot } from "react-dom/client";
import { FzPronunciationChart } from "./FzPronunciationChart";

export class FzDashboard extends HTMLElement {
  private db!: DatabaseEngine;
  private learning!: LearningEngine;
  private pronunciationRoot: any = null;

  // Quick Review state variables
  private qrWords: any[] = [];
  private qrCurrentIndex: number = -1;
  private qrShowAnswer: boolean = false;
  private qrCorrectCount: number = 0;

  // Daily Speaking Challenge state variables
  private speakingChallengeRecording: boolean = false;
  private speakingChallengeProgress: number = 0;
  private speakingChallengeTimer: any = null;
  private speakingChallengeResult: any = null;
  private speakingChallengeInterimTranscript: string = "";

  // 30-Second Quick Dictation state variables
  private qdActive: boolean = false;
  private qdTimeLeft: number = 30;
  private qdTimer: any = null;
  private qdTargetPhrase: { phrase: string; translationMg: string; translationFr: string } | null = null;
  private qdUserInput: string = "";
  private qdSubmitted: boolean = false;
  private qdAccuracyScore: number = 0;

  private qdSentences = [
    { phrase: "Le soleil brille aujourd'hui.", translationMg: "Mirehitra ny masoandro anio.", translationFr: "Le soleil brille aujourd'hui." },
    { phrase: "J'aime apprendre le français.", translationMg: "Tianao ny mianatra teny frantsay.", translationFr: "J'aime apprendre le français." },
    { phrase: "Où se trouve le marché ?", translationMg: "Aiza no misy ny tsena ?", translationFr: "Où se trouve le marché ?" },
    { phrase: "Nous allons à la gare.", translationMg: "Handeha ho any amin'ny fiantsonana izahay.", translationFr: "Nous allons à la gare." },
    { phrase: "S'il vous plaît, écoutez attentivement.", translationMg: "Azafady, mihainoa tsara.", translationFr: "S'il vous plaît, écoutez attentivement." },
    { phrase: "Il fait un temps magnifique.", translationMg: "Maha-te-haka rivotra ny toetr'andro.", translationFr: "Il fait un temps magnifique." },
    { phrase: "Merci beaucoup pour votre aide.", translationMg: "Misaotra betsaka amin'ny fanampianao.", translationFr: "Merci beaucoup pour votre aide." }
  ];

  private dailySpeakingPhrases = [
    {
      id: "dsp_1",
      phrase: "Bonjour ! Comment allez-vous aujourd'hui ?",
      translationMg: "Manao ahoana ! Manao ahoana ny fahasalamana anio ?",
      translationFr: "Bonjour ! Comment allez-vous aujourd'hui ?",
      phonetic: "bɔ̃ʒuʁ ! kɔmɑ̃ tale vu oʒuʁdɥi ?",
      categoryMg: "Fiarahabana",
      categoryFr: "Salutations"
    },
    {
      id: "dsp_2",
      phrase: "J'apprends le français avec enthousiasme.",
      translationMg: "Mianatra teny frantsay am-pifaliana aho.",
      translationFr: "J'apprends le français avec enthousiasme.",
      phonetic: "ʒapʁɑ̃ lə fʁɑ̃sɛ avɛk ɑ̃tuzjasme",
      categoryMg: "Mianatra",
      categoryFr: "Apprentissage"
    },
    {
      id: "dsp_3",
      phrase: "Pourrais-je avoir l'addition, s'il vous plaît ?",
      translationMg: "Afaka mahazo ny faktiora ve aho, azafady ?",
      translationFr: "Pourrais-je avoir l'addition, s'il vous plaît ?",
      phonetic: "puʁɛ ʒavwaʁ ladisjɔ̃, sil vu plɛ ?",
      categoryMg: "Fisakafoanana",
      categoryFr: "Au restaurant"
    },
    {
      id: "dsp_4",
      phrase: "Quelle est la météo prévue ce week-end ?",
      translationMg: "Manao ahoana ny toetr'andro amin'ity faran'ny herinandro ity ?",
      translationFr: "Quelle est la météo prévue ce week-end ?",
      phonetic: "kɛl ɛ la meteo pʁevy sə wikɛnd ?",
      categoryMg: "Toetr'andro",
      categoryFr: "Météo"
    },
    {
      id: "dsp_5",
      phrase: "C'est une très belle opportunité de progresser.",
      translationMg: "Fahafahana lehibe handrosoana ity.",
      translationFr: "C'est une très belle opportunité de progresser.",
      phonetic: "sɛt yn tʁɛ bɛl ɔpɔʁtynite də pʁɔgʁese",
      categoryMg: "Motivation",
      categoryFr: "Motivation"
    },
    {
      id: "dsp_6",
      phrase: "Où se trouve la station de bus la plus proche ?",
      translationMg: "Aiza no misy ny fiantsonan'ny bus akaiky indrindra ?",
      translationFr: "Où se trouve la station de bus la plus proche ?",
      phonetic: "u sə tʁuv la stasjɔ̃ də bys la ply pʁɔʃ ?",
      categoryMg: "Lalana",
      categoryFr: "Orientation"
    },
    {
      id: "dsp_7",
      phrase: "Merci beaucoup pour votre aide précieuse !",
      translationMg: "Misaotra betsaka amin'ny fanampiana lehibe nataonao !",
      translationFr: "Merci beaucoup pour votre aide précieuse !",
      phonetic: "mɛʁsi boku puʁ vɔtʁ ɛd pʁesjøz !",
      categoryMg: "Fankasitrahana",
      categoryFr: "Remerciement"
    }
  ];

  constructor() {
    super();
  }

  connectedCallback() {
    this.db = (window as any).feheziko?.db;
    this.learning = (window as any).feheziko?.learning;
    this.render();

    window.addEventListener("feheziko_state_changed", () => {
      this.render();
    });

    window.addEventListener("feheziko_badge_unlocked", (e: any) => {
      const badgeIds = e.detail?.badgeIds || [];
      this.triggerAchievementUnlockedToast(badgeIds);
    });
  }

  private render() {
    if (!this.db || !this.learning) return;

    const progress = this.db.getProgress();
    const role = progress.role;

    // Dispatch render to corresponding sub-view based on current role selection
    if (role === "apprenant") {
      this.renderApprenant();
    } else if (role === "enseignant") {
      this.renderEnseignant();
    } else if (role === "ecole") {
      this.renderEcole();
    } else if (role === "admin") {
      this.renderAdmin();
    }

    // Trigger transitions and render D3 progress chart in the next frame
    requestAnimationFrame(() => {
      this.querySelectorAll("[data-target]").forEach((bar: any) => {
        const target = bar.getAttribute("data-target");
        if (target) {
          setTimeout(() => {
            bar.style.width = target;
          }, 30);
        }
      });

      this.querySelectorAll("[data-circle-target]").forEach((circle: any) => {
        const target = circle.getAttribute("data-circle-target");
        if (target !== null) {
          setTimeout(() => {
            circle.style.strokeDashoffset = target;
          }, 60);
        }
      });

      if (role === "apprenant") {
        const isMg = progress.accessibility?.language === "mg";
        this.renderD3ProgressChart();
        this.renderRechartsPronunciationChart(isMg);
      }
    });

    // Bind Test Milestone Toast Trigger Button
    this.querySelector("#triggerTestMilestoneBtn")?.addEventListener("click", () => {
      const isMg = this.db.getProgress().accessibility.language === "mg";
      this.triggerAchievementUnlockedToast(
        [],
        isMg ? "Mpanangona Voambolana! 🏆" : "Collectionneur de Mots ! 🏆",
        isMg ? "Mahazo mari-pankasitrahana amin'ny fivoarana 7 andro tsara indrindra sy +25 Tokens!" : "Vous avez atteint le palier hebdomadaire de vocabulaire avec succès ! +25 Jetons",
        "🌟"
      );
    });

    // Bind Daily Goal Chips for Apprenant/Student role
    this.querySelectorAll(".goal-chip").forEach(button => {
      button.addEventListener("click", (e) => {
        const goalMins = parseInt((e.currentTarget as HTMLElement).getAttribute("data-goal") || "30", 10);
        this.db.setDailyGoal(goalMins);
      });
    });

    // Bind Quick Review Actions
    this.querySelector("#startQrBtn")?.addEventListener("click", () => {
      this.initializeQuickReview();
      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
    });

    this.querySelector("#revealQrBtn")?.addEventListener("click", () => {
      this.qrShowAnswer = true;
      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
    });

    this.querySelector("#qrCorrectBtn")?.addEventListener("click", () => {
      this.handleQrAnswer(true);
    });

    this.querySelector("#qrIncorrectBtn")?.addEventListener("click", () => {
      this.handleQrAnswer(false);
    });

    this.querySelector("#resetQrBtn")?.addEventListener("click", () => {
      this.qrCurrentIndex = -1;
      this.qrWords = [];
      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
    });

    // Bind Daily Speaking Challenge Actions
    this.querySelector("#speakDailyPhraseBtn")?.addEventListener("click", () => {
      const todayPhrase = this.getTodaySpeakingPhrase();
      this.speakDailyPhrase(todayPhrase.phrase);
    });

    this.querySelector("#recordDailyPhraseBtn")?.addEventListener("click", () => {
      const todayPhrase = this.getTodaySpeakingPhrase();
      this.startDailySpeakingRecord(todayPhrase);
    });

    this.querySelector("#dashboardNextStepBtn")?.addEventListener("click", () => {
      (window as any).feheziko?.navigate("lessons");
    });

    // Bind Quick Dictation 30s Actions
    this.querySelector("#startQdBtn")?.addEventListener("click", () => {
      this.startQuickDictation();
    });

    this.querySelectorAll("#resetQdBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.resetQuickDictation();
      });
    });

    this.querySelector("#qdSubmitBtn")?.addEventListener("click", () => {
      this.submitQuickDictation();
    });

    this.querySelector("#qdReplayAudioBtn")?.addEventListener("click", () => {
      if (this.qdTargetPhrase) {
        const audio = (window as any).feheziko?.audio;
        if (audio) audio.speakFrench(this.qdTargetPhrase.phrase);
      }
    });

    const qdInputEl = this.querySelector("#qdInput") as HTMLInputElement;
    if (qdInputEl) {
      qdInputEl.addEventListener("input", (e: any) => {
        this.qdUserInput = e.target.value;
      });
      qdInputEl.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          this.submitQuickDictation();
        }
      });
    }
  }

  /**
   * MPANAMPY: Apprenant (Student) Space Dashboard
   */
  private renderApprenant() {
    const progress = this.db.getProgress();
    const challenges = this.learning.getChallenges();
    const badges = this.learning.getBadges();
    const level = this.learning.getLevel();
    const baseCurrentLevel = this.learning.getXpForCurrentLevelBase();
    const nextLevel = this.learning.getXpForNextLevel();

    const courseContent = this.db.getCourseContent();
    const allLevels = courseContent?.levels || [];
    const a1Level = allLevels.find((l: any) => l.id === "A1");
    const a1Total = a1Level ? (a1Level.lessons || []).length : 5;
    const completedA1Count = a1Level ? (a1Level.lessons || []).filter((l: any) => progress.completedLessons.includes(l.id)).length : 0;
    const remainingA1 = Math.max(0, a1Total - completedA1Count);

    const isMg = progress.accessibility.language === "mg";
    const displayName = progress.studentName ? progress.studentName : (isMg ? "Mpianatra" : "Apprenant");

    const t = isMg ? {
      welcome: `Tonga soa, ${displayName} !`,
      intro: "Araho ny fivoaranao ary mahazoa fahaizana vaovao isan'andro.",
      lessonsLeft: `${remainingA1} lesona sisa hahazoana diploma A1.`,
      statsTitle: "Tabilao fivoarana (Statistiques d'Activité)",
      weeklyXp: "Tombony XP isan'andro",
      challengesTitle: "Ireo fanamby anio (Défis Quotidiens)",
      badgesTitle: "Ireo mari-pankasitrahana (Badges acquis)",
      deckTitle: "Famerenana Spaced Repetition (SRS)",
      deckDesc: "Teniko averina ho fitadidiana maharitra.",
      noDeck: "Tsy misy teny tokony averina androany. Tsara izany!",
      roleSwitch: "Azonao ovaina ny sehatra (Mpampianatra, Sekoly...) eo amin'ny lohany ambony.",
      streakLabel: "Série-nao ankehitriny (Série active)",
      daySingular: "andro misesy",
      daysPlural: "andro misesy",
      streakActiveDesc: "Mirehitra tsara ny afonao! Ianaro ny lesona anio mba hitazonana ny herinao.",
      streakInactiveDesc: "Tsy mbola mirehitra ny afonao androany. Mahazoa XP mba hanombohana ny série!"
    } : {
      welcome: `Bienvenue, ${displayName} !`,
      intro: "Suivez vos progrès et maîtrisez la langue française jour après jour.",
      lessonsLeft: `${remainingA1} leçons restantes pour le certificat A1.`,
      statsTitle: "Tableau d'activité hebdomadaire",
      weeklyXp: "Points XP par jour",
      challengesTitle: "Défis quotidiens",
      badgesTitle: "Badges et Récompenses",
      deckTitle: "Révisions Spaced Repetition (SRS)",
      deckDesc: "Mots à réviser pour mémorisation à long terme.",
      noDeck: "Aucun mot à réviser aujourd'hui. Parfait !",
      roleSwitch: "Vous pouvez changer de rôle (Enseignant, École...) dans la barre supérieure.",
      streakLabel: "Votre série actuelle",
      daySingular: "jour actif",
      daysPlural: "jours consécutifs",
      streakActiveDesc: "Votre flamme brille ! Faites un exercice aujourd'hui pour prolonger votre série.",
      streakInactiveDesc: "Votre flamme est éteinte. Gagnez des points d'XP aujourd'hui pour l'allumer !"
    };

    // Revision words list
    const dueDeck = progress.revisionDeck.filter(item => {
      return new Date(item.nextReview).getTime() <= new Date().getTime();
    });

    // Prepare Hours Studied Bar Chart Data (last 7 days)
    const today = new Date();
    const last7DaysData = [];
    const hoursMap = progress.hoursStudied || {};
    
    // Day names and abbreviations in Malagasy and French
    const dayNamesMg = ["Alahady", "Alatsinainy", "Talata", "Alarobia", "Alakamisy", "Zoma", "Sabotsy"];
    const dayNamesFr = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const dayAbbrMg = ["Alah", "Alats", "Tal", "Alar", "Alak", "Zom", "Sab"];
    const dayAbbrFr = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = d.toDateString();
      const hours = hoursMap[dateKey] !== undefined ? hoursMap[dateKey] : 0;
      
      const dayIndex = d.getDay();
      const label = isMg ? dayAbbrMg[dayIndex] : dayAbbrFr[dayIndex];
      const fullName = isMg ? dayNamesMg[dayIndex] : dayNamesFr[dayIndex];
      
      last7DaysData.push({
        dateKey,
        hours,
        label,
        fullName,
        isToday: i === 0
      });
    }

    const last7DaysStreakStatus = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = d.toDateString();
      const hasStudied = (hoursMap[dateKey] || 0) > 0;
      
      const dayIndex = d.getDay();
      const label = isMg ? dayAbbrMg[dayIndex][0] : dayAbbrFr[dayIndex][0];
      
      last7DaysStreakStatus.push({
        label,
        active: hasStudied,
        isToday: i === 0,
        dayName: isMg ? dayNamesMg[dayIndex] : dayNamesFr[dayIndex]
      });
    }

    const maxHours = Math.max(...last7DaysData.map(d => d.hours), 1.5);

    const streakInfo = this.db.getCurrentStreakInfo();
    const displayStreak = streakInfo.currentStreak;

    const todayHours = hoursMap[today.toDateString()] || 0;
    const todayMinutes = Math.round(todayHours * 60);
    const dailyGoalMinutes = progress.dailyGoalMinutes || 30;
    const dailyGoalHours = dailyGoalMinutes / 60;
    const todayPercent = Math.min(100, Math.round((todayHours / dailyGoalHours) * 100));

    this.innerHTML = `
      <div class="space-y-6">
        <!-- Hero section -->
        <div class="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden animate-stagger animate-stagger-delay-1">
          <div class="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-12 -translate-y-6">
            <span class="text-9xl">🎓</span>
          </div>
          <div class="max-w-xl">
            <span class="bg-indigo-500/30 text-indigo-100 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-indigo-400/20">
              ${progress.subscription.status === "premium" ? "👑 Premium User" : "🔓 Free User"}
            </span>
            <h2 class="text-2xl md:text-3xl font-extrabold mt-3 tracking-tight">${t.welcome}</h2>
            <p class="text-indigo-100 text-sm mt-1 leading-relaxed">${t.intro}</p>
            
            <div class="flex items-center space-x-2 mt-4 text-xs font-mono bg-indigo-500/20 py-1.5 px-3 rounded-lg border border-indigo-500/20 w-fit">
              <span>🌟 Niveau ${level} : <strong>${progress.xp} XP</strong></span>
            </div>

            <!-- Enhanced Visual Streak Header Widget -->
            <div class="mt-5 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex flex-col gap-4 animate-stagger animate-stagger-delay-2">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div class="flex items-center space-x-3.5">
                  <div class="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-2xl relative shadow-inner transition-transform duration-300 hover:scale-110 active:scale-95 cursor-pointer">
                    <span class="${displayStreak > 0 ? "animate-bounce" : "opacity-40"}">🔥</span>
                    ${displayStreak > 0 ? `<span class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-indigo-700 animate-ping"></span>` : ""}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold font-mono text-indigo-200 uppercase tracking-wider block">${t.streakLabel}</span>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        ⚡ ${streakInfo.xpMultiplier} Bonus XP
                      </span>
                    </div>
                    <p class="text-xl font-extrabold text-white tracking-tight">
                      ${displayStreak} ${displayStreak > 1 ? t.daysPlural : t.daySingular}
                    </p>
                  </div>
                </div>
                <div class="text-xs text-indigo-100 max-w-sm border-l-2 border-indigo-400/30 pl-3 leading-relaxed flex flex-col gap-1">
                  <span>${displayStreak > 0 ? t.streakActiveDesc : t.streakInactiveDesc}</span>
                  <div class="flex items-center gap-3 text-[11px] text-indigo-200 mt-1">
                    <span>👑 Record : <strong class="text-white">${streakInfo.bestStreak}j</strong></span>
                    <span>🛡️ Protection : <strong class="text-emerald-300">${streakInfo.freezeShields} Gel Activé</strong></span>
                  </div>
                </div>
              </div>

              <!-- Streak Progress Bar towards 7-Day Habit Cycle -->
              <div class="pt-3 border-t border-white/10 space-y-2">
                <div class="flex justify-between items-center text-xs font-mono">
                  <span class="text-indigo-200">
                    ${displayStreak >= 7 
                      ? (isMg ? "🏆 Tanjona tratra! Mahatalanjona!" : "🏆 Défi de 7 jours accompli ! Magnifique !") 
                      : (isMg ? `Andro sisa hahazoana ny amboara: ${7 - (displayStreak % 7)} andro` : `Encore ${7 - (displayStreak % 7)} j pour le trophée hebdomadaire !`)
                    }
                  </span>
                  <span class="font-bold text-amber-300">${displayStreak % 7 || (displayStreak > 0 ? 7 : 0)}/7 andro</span>
                </div>

                <!-- Visual Streak Progress Bar -->
                <div class="w-full bg-indigo-950/40 rounded-full h-3 border border-white/10 overflow-hidden relative p-0.5">
                  <div class="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 h-full rounded-full transition-all duration-1000 ease-out shadow-xs" 
                       style="width: 0%" 
                       data-target="${((displayStreak % 7 || (displayStreak > 0 ? 7 : 0)) / 7) * 100}%">
                  </div>
                </div>

                <!-- 7-Day Habit Dots with staggered transitions -->
                <div class="grid grid-cols-7 gap-1.5 pt-1">
                  ${last7DaysStreakStatus.map((day) => {
                    const activeClass = day.active 
                      ? "bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/10 scale-105" 
                      : "bg-indigo-950/30 text-indigo-300 border-white/5 opacity-50";
                    const todayBorder = day.isToday ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-indigo-700" : "";
                    
                    return `
                      <div class="flex flex-col items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10 transition-all hover:bg-white/10 ${todayBorder}">
                        <span class="text-[9px] font-mono font-bold text-indigo-200 uppercase">${day.label}</span>
                        <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-500 ${activeClass}">
                          ${day.active ? "🔥" : "⚫"}
                        </div>
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>
            </div>

            <!-- Daily Goal Tracker Widget -->
            <div class="mt-4 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 space-y-3 animate-stagger animate-stagger-delay-3">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span class="text-xs font-bold font-mono text-indigo-200 uppercase tracking-wider block">
                    ${isMg ? "Fandrosoana Isan'andro" : "Progression Quotidienne"}
                  </span>
                  <p class="text-sm font-extrabold text-white">
                    ${isMg ? `Tanjona anio: ${todayMinutes} mn / ${dailyGoalMinutes} mn` : `Objectif du jour : ${todayMinutes} min / ${dailyGoalMinutes} min`}
                  </p>
                </div>
                <!-- Interactive Chips to set Daily Goal -->
                <div class="flex items-center space-x-1 bg-indigo-950/30 p-1 rounded-xl border border-white/10 w-fit self-start sm:self-auto">
                  ${[15, 30, 45, 60].map(mins => {
                    const active = mins === dailyGoalMinutes;
                    return `
                      <button data-goal="${mins}" class="goal-chip px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg transition-all ${
                        active 
                          ? "bg-amber-400 text-slate-900 shadow-xs scale-105 font-black" 
                          : "text-indigo-200 hover:bg-white/5"
                      }">
                        ${mins}m
                      </button>
                    `;
                  }).join("")}
                </div>
              </div>

              <!-- Progress bar and completion state -->
              <div class="space-y-2">
                <div class="flex justify-between items-center text-xs">
                  <span class="text-indigo-100/80 font-mono text-[11px]">
                    ${todayPercent >= 100 
                      ? (isMg ? "🏆 Tanjona tratra! Mahafinaritra!" : "🏆 Objectif atteint ! Bravo !") 
                      : (isMg ? "💪 Tohizo fa kely sisa !" : "💪 Continuez, vous y êtes presque !")
                    }
                  </span>
                  <span class="font-mono font-black text-amber-300 text-[13px]">${todayPercent}%</span>
                </div>
                
                <div class="w-full bg-indigo-950/40 rounded-full h-3 border border-white/10 overflow-hidden relative p-0.5">
                  <div class="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-1000 ease-out shadow-xs" 
                       style="width: 0%"
                       data-target="${todayPercent}%">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Next Recommended Step Highlight Widget -->
        ${(() => {
          const content = (window as any).feheziko?.languageContent;
          if (!content?.levels) return "";
          
          const allFlatLessons: any[] = [];
          content.levels.forEach((l: any) => allFlatLessons.push(...(l.lessons || [])));
          const nextLesson = allFlatLessons.find((l: any) => !progress.completedLessons.includes(l.id)) || allFlatLessons[0];
          if (!nextLesson) return "";

          const completedCount = progress.completedLessons.length;
          const totalCount = allFlatLessons.length;

          return `
            <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden animate-stagger animate-stagger-delay-3">
              <div class="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <div class="space-y-2 max-w-xl">
                <div class="flex items-center space-x-2">
                  <span class="bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full font-mono">
                    ⚡ ${isMg ? "DINGANA MANARAKA" : "PROCHAINE ÉTAPE"}
                  </span>
                  <span class="text-xs font-mono text-indigo-300">
                    ${isMg ? `Lesona #${completedCount + 1} amin'ny ${totalCount}` : `Étape ${completedCount + 1} sur ${totalCount}`}
                  </span>
                </div>

                <h3 class="text-xl md:text-2xl font-black text-white tracking-tight">
                  ${nextLesson.title}
                </h3>

                <p class="text-xs text-slate-300 leading-relaxed line-clamp-2">
                  ${nextLesson.content?.introduction || ""}
                </p>

                <div class="flex items-center space-x-3 pt-1 text-xs font-mono">
                  <span class="bg-white/10 px-2.5 py-1 rounded-lg text-amber-300 font-bold border border-white/10">
                    +${nextLesson.xp} XP
                  </span>
                  <span class="text-slate-300">⏱️ ~10 min</span>
                  <span class="text-slate-300">🎧 Audio & Prononciation</span>
                </div>
              </div>

              <button id="dashboardNextStepBtn" data-id="${nextLesson.id}" class="w-full md:w-auto bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm px-6 py-3.5 rounded-2xl transition-all shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 shrink-0 flex items-center justify-center gap-2 cursor-pointer">
                <span>🚀</span>
                <span>${isMg ? "Handeha hianatra anio" : "Lancer cette étape"}</span>
              </button>
            </div>
          `;
        })()}

        <!-- Learning Modules Circular Progress Overview -->
        ${this.renderModuleProgressWidget(isMg, progress, allLevels)}

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left Column - Weekly Progress & Spaced Repetition -->
          <div class="lg:col-span-2 space-y-6">

            <!-- Daily Speaking Challenge Widget -->
            ${this.renderDailySpeakingChallengeWidget(isMg)}

            <!-- 30-Second Quick Dictation Widget -->
            ${this.render30sQuickDictationWidget(isMg)}

            <!-- Recharts Pronunciation Scoring Trends Widget -->
            <div id="rechartsPronunciationContainer" class="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs relative overflow-hidden animate-stagger animate-stagger-delay-4"></div>

            <!-- D3 7-Day Progress Graph Card (Vocabulary Acquisition & Lesson Completion) -->
            <div class="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs relative overflow-hidden animate-stagger animate-stagger-delay-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <div class="flex items-center space-x-2">
                    <span class="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-sm font-bold">📊</span>
                    <h3 class="font-bold text-slate-800 dark:text-slate-100 text-base">
                      ${isMg ? "Fivoarana 7 Andro (Graphique D3)" : "Progression sur 7 Jours (Graphe D3)"}
                    </h3>
                  </div>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    ${isMg ? "Voambolana voaangona sy Lesona vita isan'andro" : "Acquisition de vocabulaire et leçons complétées"}
                  </p>
                </div>
                
                <!-- Legend & Action Controls -->
                <div class="flex items-center space-x-3 text-xs font-mono font-medium shrink-0">
                  <div class="flex items-center space-x-1.5">
                    <span class="w-3 h-3 rounded-full bg-indigo-500 inline-block shadow-xs"></span>
                    <span class="text-slate-600 dark:text-slate-300">${isMg ? "Voambolana" : "Vocabulaire"}</span>
                  </div>
                  <div class="flex items-center space-x-1.5">
                    <span class="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-xs"></span>
                    <span class="text-slate-600 dark:text-slate-300">${isMg ? "Lesona Vita" : "Leçons"}</span>
                  </div>
                  <!-- Test Milestone Button -->
                  <button id="triggerTestMilestoneBtn" class="px-2.5 py-1 text-[11px] font-sans font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/30 rounded-lg transition-all active:scale-95 flex items-center gap-1 shadow-2xs">
                    <span>🏆</span>
                    <span>${isMg ? "Milestone" : "Milestone"}</span>
                  </button>
                </div>
              </div>

              <!-- D3 Chart Canvas Container -->
              <div id="d3-progress-chart-container" class="w-full h-56 relative overflow-hidden rounded-xl bg-slate-50/50 dark:bg-slate-950/40 p-2 border border-slate-100 dark:border-slate-800/80">
              </div>
            </div>

            <!-- Weekly Progress SVG bar chart -->
            <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs animate-stagger animate-stagger-delay-5">
              <div class="flex justify-between items-start mb-1">
                <div>
                  <h3 class="font-bold text-slate-800 text-base">${t.statsTitle}</h3>
                  <p class="text-xs text-slate-500">${isMg ? "Ora nianarana isan'andro" : "Heures d'apprentissage par jour"}</p>
                </div>
                <!-- Total hours studied label -->
                <div class="text-right">
                  <span class="text-xs text-slate-400 block">${isMg ? "Tontalin'ny ora" : "Temps total"}</span>
                  <span class="text-lg font-black text-indigo-600 font-mono">
                    ${Math.round(last7DaysData.reduce((acc, d) => acc + d.hours, 0) * 10) / 10}h
                  </span>
                </div>
              </div>
              
              <!-- Clean SVG Bar Chart -->
              <div class="w-full mt-4 h-48 flex flex-col justify-between">
                <svg class="w-full h-full" viewBox="0 0 500 135" preserveAspectRatio="none">
                  <!-- Gradient definitions -->
                  <defs>
                    <linearGradient id="bar-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="#818cf8" />
                      <stop offset="100%" stop-color="#4f46e5" />
                    </linearGradient>
                    <linearGradient id="bar-gradient-today" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="#fbbf24" />
                      <stop offset="100%" stop-color="#f59e0b" />
                    </linearGradient>
                  </defs>

                  <!-- Grid Lines -->
                  <line x1="10" y1="20" x2="490" y2="20" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="4" />
                  <line x1="10" y1="65" x2="490" y2="65" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="4" />
                  <line x1="10" y1="110" x2="490" y2="110" stroke="#e2e8f0" stroke-width="1.5" />
                  
                  <!-- Y Axis Scale Hints on Right -->
                  <text x="495" y="24" text-anchor="end" class="text-[8px] font-mono font-bold fill-slate-400">${Math.round(maxHours * 10) / 10}h</text>
                  <text x="495" y="69" text-anchor="end" class="text-[8px] font-mono font-bold fill-slate-400">${Math.round((maxHours / 2) * 10) / 10}h</text>
                  <text x="495" y="108" text-anchor="end" class="text-[8px] font-mono font-bold fill-slate-400">0h</text>

                  <!-- Draw Bars -->
                  ${last7DaysData.map((item, i) => {
                    const colWidth = 470 / 7;
                    const barWidth = 26;
                    const chartHeight = 90;
                    const barHeight = (item.hours / maxHours) * chartHeight;
                    const x = 15 + i * colWidth + (colWidth - barWidth) / 2;
                    const displayHeight = Math.max(barHeight, 3);
                    const y = 110 - displayHeight;
                    const fillGrad = item.isToday ? "url(#bar-gradient-today)" : "url(#bar-gradient)";
                    const textY = y - 5;
                    const fontColor = item.isToday ? "fill-amber-600 font-extrabold" : "fill-slate-500 font-bold";
                    
                    return `
                      <!-- Bar group -->
                      <g class="group cursor-pointer">
                        <!-- Invisible hover trigger area for easy touching -->
                        <rect x="${15 + i * colWidth}" y="10" width="${colWidth}" height="110" fill="transparent" />
                        
                        <!-- Tooltip text (appears on hover / always visible) -->
                        <text x="${x + barWidth / 2}" y="${textY}" text-anchor="middle" class="text-[9px] font-mono transition-all duration-150 ${fontColor}">
                          ${item.hours > 0 ? item.hours + 'h' : '-'}
                        </text>

                        <!-- Actual SVG Rounded Rect Bar -->
                        <rect x="${x}" y="${y}" width="${barWidth}" height="${displayHeight}" rx="5" fill="${fillGrad}" class="transition-all duration-300 group-hover:opacity-90 hover:scale-x-105 origin-center" />
                      </g>
                    `;
                  }).join("")}
                </svg>
                
                <!-- X Axis Labels -->
                <div class="flex justify-between text-[10px] font-mono font-semibold text-slate-500 px-3 mt-1">
                  ${last7DaysData.map(item => `
                    <div class="text-center w-[60px] ${item.isToday ? "text-amber-500 font-extrabold" : ""}" title="${item.fullName}">
                      <span>${item.label}</span>
                      ${item.isToday ? `<span class="block text-[8px] -mt-1 font-sans">${isMg ? "Androany" : "Auj."}</span>` : ""}
                    </div>
                  `).join("")}
                </div>
              </div>
            </div>

            <!-- Active Recall Spaced Repetition Box -->
            <div class="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden animate-stagger animate-stagger-delay-6">
              <div class="absolute right-4 top-4 text-3xl opacity-25">🧠</div>
              <h3 class="font-bold text-lg mb-1">${t.deckTitle}</h3>
              <p class="text-xs text-slate-300 mb-4">${t.deckDesc}</p>

              ${
                dueDeck.length > 0
                  ? `
                <div class="bg-slate-800 border border-slate-700/50 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span class="text-xs bg-indigo-500/30 text-indigo-300 font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">Revision Deck</span>
                    <h4 class="text-xl font-bold mt-1.5 text-indigo-100">${dueDeck.length} Teny tokony haverina (Words due)</h4>
                    <p class="text-xs text-slate-400 mt-1">SuperMemo spaced-repetition algorithm active.</p>
                  </div>
                  <button onclick="window.feheziko.navigate('lessons')" class="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-colors whitespace-nowrap shadow-sm">
                    🚀 Averina Izao (Review Now)
                  </button>
                </div>
                `
                  : `
                <div class="text-center py-4 border border-dashed border-slate-700 rounded-xl">
                  <span class="text-2xl">🎉</span>
                  <p class="text-xs font-mono text-slate-400 mt-1">${t.noDeck}</p>
                </div>
                `
              }
            </div>

            <!-- Quick Review Widget -->
            <div class="animate-stagger animate-stagger-delay-7">
              ${this.renderQuickReviewWidget(isMg)}
            </div>
          </div>

          <!-- Right Column - Challenges, Badges & Classes -->
          <div class="space-y-6">
            <!-- Challenges -->
            <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs animate-stagger animate-stagger-delay-4">
              <h3 class="font-bold text-slate-800 text-base mb-3">${t.challengesTitle}</h3>
              <div class="space-y-3">
                ${challenges
                  .map(
                    c => `
                  <div class="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div class="flex justify-between items-start">
                      <div>
                        <h4 class="font-semibold text-xs text-slate-800">${c.title}</h4>
                        <p class="text-[10px] text-slate-500 mt-0.5">${c.description}</p>
                      </div>
                      <span class="text-[10px] font-bold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100">+${c.xpReward} XP</span>
                    </div>
                    <!-- Bar progress -->
                    <div class="flex items-center space-x-2 mt-2">
                      <div class="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div class="h-full bg-emerald-500 transition-all duration-1000 ease-out" 
                             style="width: 0%" 
                             data-target="${Math.min(100, (c.progressCurrent / c.progressMax) * 100)}%"></div>
                      </div>
                      <span class="text-[10px] font-mono font-bold text-slate-500">${c.progressCurrent}/${c.progressMax}</span>
                    </div>
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>

            <!-- Badges Shortcut Info -->
            <div class="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 text-indigo-900 text-xs space-y-2.5 shadow-xs animate-stagger animate-stagger-delay-5">
              <div class="flex items-center gap-2">
                <span class="text-xl">🏆</span>
                <span class="font-extrabold text-[13px] text-indigo-950">${t.badgesTitle}</span>
              </div>
              <p class="leading-relaxed text-[11px] text-indigo-700/90">${isMg ? "Mahazoa tokens sy badges amin'ny alalan'ny lesona vita, hazo, ary voambolana voafehy! Jereo eo amin'ny faran'ny pejy ny tsipiriany." : "Obtenez des jetons et des badges grâce à vos leçons, vos séries et vos révisions ! Voir les détails au bas de la page."}</p>
            </div>

            <!-- Role Change Info Notice -->
            <div class="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-amber-800 text-xs flex space-x-2 animate-stagger animate-stagger-delay-6">
              <span>💡</span>
              <p class="leading-normal">${t.roleSwitch}</p>
            </div>
          </div>
        </div>

        <!-- Badges & Rewards Full Workspace Module -->
        <div class="border-t border-slate-200/60 pt-8 mt-4 animate-stagger animate-stagger-delay-8">
          <fz-badges></fz-badges>
        </div>
      </div>
    `;
  }

  /**
   * MPANAMPY: Enseignant (Teacher) Space Dashboard
   */
  private renderEnseignant() {
    this.innerHTML = `
      <div class="space-y-6">
        <!-- Hero Section -->
        <div class="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden animate-stagger animate-stagger-delay-1">
          <div class="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-12 -translate-y-6">
            <span class="text-9xl">👩‍🏫</span>
          </div>
          <div>
            <span class="bg-emerald-500/30 text-emerald-100 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-emerald-400/20">Sehatra Mpampianatra (Espace Enseignant)</span>
            <h2 class="text-2xl md:text-3xl font-extrabold mt-3 tracking-tight">Lycée Nanisana - Terminale L1</h2>
            <p class="text-emerald-100 text-sm mt-1 leading-relaxed">Hanaraka akaiky ny ezaka, fanononana teny frantsay ary ny fanadinana ataon'ireo mpianatrao.</p>
          </div>
        </div>

        <!-- Bento Grid Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs animate-stagger animate-stagger-delay-2">
            <span class="text-xs text-slate-400 font-semibold uppercase tracking-wider">Isan'ny mpianatra</span>
            <h4 class="text-2xl font-bold text-slate-800 mt-1">32 Mpianatra</h4>
            <div class="flex items-center text-xs text-emerald-600 font-bold mt-1">
              <span>↗️ 100% mavitrika</span>
            </div>
          </div>
          <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs animate-stagger animate-stagger-delay-3">
            <span class="text-xs text-slate-400 font-semibold uppercase tracking-wider">Salan'isa XP</span>
            <h4 class="text-2xl font-bold text-slate-800 mt-1">452 XP</h4>
            <span class="text-xs text-slate-400 block mt-1">Nandritra ity herinandro ity</span>
          </div>
          <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs animate-stagger animate-stagger-delay-4">
            <span class="text-xs text-slate-400 font-semibold uppercase tracking-wider">Salan'isa fanononana</span>
            <h4 class="text-2xl font-bold text-slate-800 mt-1">87% tsara</h4>
            <span class="text-xs text-emerald-600 font-bold block mt-1">Tena tsara (Niveau A1)</span>
          </div>
          <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs animate-stagger animate-stagger-delay-5">
            <span class="text-xs text-slate-400 font-semibold uppercase tracking-wider">Asa asaina manaraka</span>
            <h4 class="text-lg font-bold text-indigo-600 mt-1">Dinika: Ao an-tsena</h4>
            <span class="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded mt-1 inline-block">Hatramin'ny Zoma</span>
          </div>
        </div>

        <!-- Class Roster Table -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden animate-stagger animate-stagger-delay-6">
          <div class="p-5 border-b border-slate-100 flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 class="font-bold text-slate-800 text-base">Mombamomba ny mpianatra (Suivi des Élèves)</h3>
              <p class="text-xs text-slate-500 mt-0.5">Faharetan'ny fianarana sy ny fitenena am-bava.</p>
            </div>
            <button class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-lg transition-colors shadow-xs">
              ➕ Manasa mpianatra vaovao
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-600">
              <thead class="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-100">
                <tr>
                  <th class="px-6 py-3">Mpianatra (Élève)</th>
                  <th class="px-6 py-3">Niveau / XP</th>
                  <th class="px-6 py-3">Série (Streak)</th>
                  <th class="px-6 py-3">Fanononana (Shadowing)</th>
                  <th class="px-6 py-3">Asa vita (Leçons)</th>
                  <th class="px-6 py-3">Hetsika farany</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr class="hover:bg-slate-50/50">
                  <td class="px-6 py-4 font-semibold text-slate-800 flex items-center space-x-2">
                    <span class="w-8 h-8 rounded-full bg-slate-100 text-sm flex items-center justify-center">👧</span>
                    <span>Andriana Soa</span>
                  </td>
                  <td class="px-6 py-4">
                    <span class="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded font-bold">Lv. 3 (940 XP)</span>
                  </td>
                  <td class="px-6 py-4 font-mono font-bold text-amber-600">🔥 12 andro</td>
                  <td class="px-6 py-4">
                    <div class="flex items-center space-x-1">
                      <span class="text-xs font-bold text-emerald-600">92%</span>
                      <div class="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div class="h-full bg-emerald-500 transition-all duration-1000 ease-out" style="width: 0%" data-target="92%"></div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 font-mono">3 / 3</td>
                  <td class="px-6 py-4 text-xs text-slate-400">Androany, 09:12</td>
                </tr>
                <tr class="hover:bg-slate-50/50">
                  <td class="px-6 py-4 font-semibold text-slate-800 flex items-center space-x-2">
                    <span class="w-8 h-8 rounded-full bg-slate-100 text-sm flex items-center justify-center">👦</span>
                    <span>Rakoto Rabe</span>
                  </td>
                  <td class="px-6 py-4">
                    <span class="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded font-bold">Lv. 2 (410 XP)</span>
                  </td>
                  <td class="px-6 py-4 font-mono font-bold text-amber-600">🔥 4 andro</td>
                  <td class="px-6 py-4">
                    <div class="flex items-center space-x-1">
                      <span class="text-xs font-bold text-emerald-600">81%</span>
                      <div class="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div class="h-full bg-emerald-500 transition-all duration-1000 ease-out" style="width: 0%" data-target="81%"></div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 font-mono">2 / 3</td>
                  <td class="px-6 py-4 text-xs text-slate-400">Omaly, 18:45</td>
                </tr>
                <tr class="hover:bg-slate-50/50">
                  <td class="px-6 py-4 font-semibold text-slate-800 flex items-center space-x-2">
                    <span class="w-8 h-8 rounded-full bg-slate-100 text-sm flex items-center justify-center">👧</span>
                    <span>Razafy Marie</span>
                  </td>
                  <td class="px-6 py-4">
                    <span class="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded font-bold">Lv. 1 (90 XP)</span>
                  </td>
                  <td class="px-6 py-4 font-mono font-bold text-slate-400">💤 0 andro</td>
                  <td class="px-6 py-4">
                    <div class="flex items-center space-x-1">
                      <span class="text-xs font-bold text-amber-500">72%</span>
                      <div class="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div class="h-full bg-amber-500 transition-all duration-1000 ease-out" style="width: 0%" data-target="72%"></div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 font-mono">1 / 3</td>
                  <td class="px-6 py-4 text-xs text-rose-500 font-semibold">Tsy niditra 4 andro</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * MPANAMPY: École (School) Space Dashboard
   */
  private renderEcole() {
    this.innerHTML = `
      <div class="space-y-6">
        <!-- Hero Section -->
        <div class="bg-gradient-to-r from-blue-600 to-blue-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden animate-stagger animate-stagger-delay-1">
          <div class="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-12 -translate-y-6">
            <span class="text-9xl">🏫</span>
          </div>
          <div>
            <span class="bg-blue-500/30 text-blue-100 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-blue-400/20">Sehatry ny Sekoly (Espace École)</span>
            <h2 class="text-2xl md:text-3xl font-extrabold mt-3 tracking-tight">Direction de l'Établissement</h2>
            <p class="text-blue-100 text-sm mt-1 leading-relaxed">Tantano ny fanomezan-dalana sy ny fivoaran'ny fiteny frantsay ho an'ireo mpampianatra sy mpianatra rehetra ao amin'ny sekoly.</p>
          </div>
        </div>

        <!-- Analytical Bento Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs md:col-span-2 space-y-4 animate-stagger animate-stagger-delay-2">
            <h3 class="font-bold text-slate-800 text-base">Fanasokajiana ny ezaka an-tsary (Statistiques de l'établissement)</h3>
            
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <span class="text-xs text-slate-400 font-semibold">Mpampianatra</span>
                <p class="text-2xl font-bold text-slate-800 mt-1">14 mavitrika</p>
              </div>
              <div class="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <span class="text-xs text-slate-400 font-semibold">Mpianatra mampiasa</span>
                <p class="text-2xl font-bold text-slate-800 mt-1">420 Mpianatra</p>
              </div>
              <div class="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <span class="text-xs text-slate-400 font-semibold">Taham-pahavitrihana</span>
                <p class="text-2xl font-bold text-emerald-600 mt-1">89.4%</p>
              </div>
            </div>

            <!-- School analytics representation -->
            <div class="p-4 bg-indigo-50/30 border border-indigo-100 rounded-xl space-y-2">
              <div class="flex justify-between items-center text-xs font-bold text-slate-700">
                <span>Vitan'ny mpianatra ny programam-pianarana (Progression globale)</span>
                <span>74%</span>
              </div>
              <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-600 transition-all duration-1000 ease-out" style="width: 0%" data-target="74%"></div>
              </div>
            </div>
          </div>

          <div class="bg-slate-900 rounded-2xl p-5 text-white flex flex-col justify-between animate-stagger animate-stagger-delay-3">
            <div>
              <span class="bg-yellow-500/20 text-yellow-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-yellow-500/30">Lalana fahazoan-dalana (Licences)</span>
              <h4 class="text-xl font-bold text-indigo-100 mt-2">Pake Sekoly: Premium Pro</h4>
              <p class="text-xs text-slate-400 mt-1 leading-relaxed">Ny sekolinao dia manana fahafahana mampiasa an'i Feheziko feno ho an'ny mpianatra rehetra mandritra ny taom-pianarana.</p>
            </div>
            
            <div class="border-t border-slate-800 pt-4 mt-4 flex items-center justify-between text-xs font-mono">
              <span class="text-slate-400">Haharitra hatramin'ny :</span>
              <span class="text-emerald-400 font-bold">30 Jona 2027</span>
            </div>
          </div>
        </div>

        <!-- Academic Classes diagnostics -->
        <div class="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs animate-stagger animate-stagger-delay-4">
          <h3 class="font-bold text-slate-800 text-base mb-3">Salan'isan'ny Kilasy tsirairay (Diagnostic par Classe)</h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div class="flex items-center space-x-3">
                <span class="text-lg">📚</span>
                <div>
                  <h4 class="text-xs font-bold text-slate-800">Classe Terminale L1</h4>
                  <p class="text-[10px] text-slate-400">Mpampianatra: Rabe Soa</p>
                </div>
              </div>
              <div class="text-right">
                <span class="text-xs font-bold text-emerald-600">92% Oral Score</span>
                <span class="text-[10px] text-slate-400 block">32 Mpianatra</span>
              </div>
            </div>
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div class="flex items-center space-x-3">
                <span class="text-lg">📚</span>
                <div>
                  <h4 class="text-xs font-bold text-slate-800">Classe Terminale A</h4>
                  <p class="text-[10px] text-slate-400">Mpampianatra: Madame Rakotomalala</p>
                </div>
              </div>
              <div class="text-right">
                <span class="text-xs font-bold text-emerald-600">88% Oral Score</span>
                <span class="text-[10px] text-slate-400 block">40 Mpianatra</span>
              </div>
            </div>
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div class="flex items-center space-x-3">
                <span class="text-lg">📚</span>
                <div>
                  <h4 class="text-xs font-bold text-slate-800">Classe Première S2</h4>
                  <p class="text-[10px] text-slate-400">Mpampianatra: Monsieur Jean</p>
                </div>
              </div>
              <div class="text-right">
                <span class="text-xs font-bold text-amber-500">76% Oral Score</span>
                <span class="text-[10px] text-slate-400 block">35 Mpianatra</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * MPANAMPY: Administrateur Space Dashboard
   */
  private renderAdmin() {
    const queueLength = this.db.getSyncQueueLength();
    this.innerHTML = `
      <div class="space-y-6">
        <!-- Hero Section -->
        <div class="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden animate-stagger animate-stagger-delay-1">
          <div class="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-12 -translate-y-6">
            <span class="text-9xl">⚙️</span>
          </div>
          <div>
            <span class="bg-indigo-500/30 text-indigo-100 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-indigo-400/20">Sehatra Administrator (Espace SuperAdmin)</span>
            <h2 class="text-2xl md:text-3xl font-extrabold mt-3 tracking-tight">Feheziko Engine Center</h2>
            <p class="text-slate-300 text-sm mt-1 leading-relaxed">Tantano ny fanomanana fiteny, fampandehanana offline ary ny fitaovana AI rehetra momba ny fampiharana.</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Dynamic Language Loader Pack -->
          <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-4 animate-stagger animate-stagger-delay-2">
            <div class="flex justify-between items-center">
              <h3 class="font-bold text-slate-800 text-base">Fitaovana fitantanana fiteny (Language Packages)</h3>
              <button id="addLanguageBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-1.5 px-3 rounded-lg transition-colors">
                ➕ Fametrahana fanampiny
              </button>
            </div>
            
            <p class="text-xs text-slate-500">Ny fampiharana dia miasa amin'ny alalan'ny rakitra JSON ihany. Tsy mila manova kaody rehefa mampiditra fiteny vaovao.</p>

            <div class="space-y-2">
              <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div class="flex items-center space-x-3">
                  <span class="text-xl">🇫🇷</span>
                  <div>
                    <h4 class="text-xs font-bold text-slate-800">Feheziko-Fr (Frantsay)</h4>
                    <p class="text-[9px] text-emerald-600 font-semibold uppercase tracking-wider">Mandeha tsara (Actif)</p>
                  </div>
                </div>
                <span class="text-xs font-mono text-slate-400">fr.json (48KB)</span>
              </div>

              <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 opacity-60">
                <div class="flex items-center space-x-3">
                  <span class="text-xl">🇬🇧</span>
                  <div>
                    <h4 class="text-xs font-bold text-slate-800">Feheziko-En (Anglais)</h4>
                    <p class="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Efa voaomana (Standby)</p>
                  </div>
                </div>
                <span class="text-xs font-mono text-slate-400">en.json (0KB)</span>
              </div>

              <div id="newLanguagesContainer" class="space-y-2">
                <!-- Dynamically installed languages show here -->
              </div>
            </div>
          </div>

          <!-- Offline Synchronization Engine -->
          <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-4 animate-stagger animate-stagger-delay-3">
            <h3 class="font-bold text-slate-800 text-base">Moteur de Synchronisation Offline</h3>
            <p class="text-xs text-slate-500">Mampiasa IndexedDB hitahirizana ny fandrosoana rehetra sy ny feo voaray (audio recordings). Rehefa misy internet dia mandefa avy hatrany.</p>

            <div class="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
              <div class="flex justify-between items-center text-xs font-mono">
                <span class="text-slate-500">Synchronisation status:</span>
                <span class="text-emerald-600 font-bold">Synchronisé</span>
              </div>
              <div class="flex justify-between items-center text-xs font-mono">
                <span class="text-slate-500">Mpianatra ao amin'ny fitahirizana:</span>
                <span class="text-slate-800 font-bold">Lycée Nanisana C1</span>
              </div>
              <div class="flex justify-between items-center text-xs font-mono">
                <span class="text-slate-500">Drakitra pending (Log sync queue):</span>
                <span class="text-indigo-600 font-bold font-mono">${queueLength} logs</span>
              </div>
            </div>

            <div class="flex space-x-3">
              <button id="syncNowBtn" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition-colors shadow-xs">
                🔄 Handefa drakitra izao (Sync Now)
              </button>
              <button id="clearCacheBtn" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-colors border border-slate-200">
                🧹 Fafao ny Cache
              </button>
            </div>
          </div>
        </div>

        <!-- API Switchboard & Future AI Modules -->
        <div class="bg-slate-900 rounded-3xl p-6 text-white space-y-4 animate-stagger animate-stagger-delay-4">
          <div class="flex items-center space-x-3">
            <span class="text-2xl">🤖</span>
            <div>
              <h3 class="font-bold text-base">Moteur d'Intelligence Artificielle (AI Module Manager)</h3>
              <p class="text-xs text-slate-400 mt-0.5">Ireo fitaovana hifehezana ny fanononana, feo ary ny resaka miaraka amin'ny Robot mpanampy.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div class="p-4 bg-slate-800 border border-slate-700 rounded-2xl">
              <div class="flex justify-between items-center">
                <span class="font-bold text-xs">Synthèse Vocale (TTS)</span>
                <span class="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded">WEB SPEECH API</span>
              </div>
              <p class="text-[10px] text-slate-400 mt-2">Mampiasa ny feo frantsay ao anatin'ny navigateur mba tsy handaniana drakitra internet.</p>
            </div>

            <div class="p-4 bg-slate-800 border border-slate-700 rounded-2xl">
              <div class="flex justify-between items-center">
                <span class="font-bold text-xs">Reconnaissance Vocale</span>
                <span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded">READY</span>
              </div>
              <p class="text-[10px] text-slate-400 mt-2">Fampitahana ny onjam-peo sy ny fitenena (phonetic evaluation matrix).</p>
            </div>

            <div class="p-4 bg-slate-800 border border-slate-700 rounded-2xl">
              <div class="flex justify-between items-center">
                <span class="font-bold text-xs">Correction IA & Chat</span>
                <span class="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded">GEMINI 2.5 FLASH</span>
              </div>
              <p class="text-[10px] text-slate-400 mt-2">Fanamarinana ny fitsipi-pitenenana sy ny dinika mandeha ho azy mivantana (Future Integration).</p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Bind Admin click logic
    this.querySelector("#syncNowBtn")?.addEventListener("click", async (e: Event) => {
      const btn = e.currentTarget as HTMLButtonElement;
      if (!btn) return;
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      const isMgLang = this.db.getProgress().accessibility.language === "mg";
      btn.innerHTML = isMgLang ? "⏳ Am-pandehanana..." : "⏳ Synchronisation...";

      const success = await this.db.triggerSync();

      btn.disabled = false;
      btn.innerHTML = originalHtml;

      if (success) {
        alert(isMgLang 
          ? "Vita soa aman-tsara ny fandefasana drakitra any amin'ny Cloud!" 
          : "Synchronisation effectuée avec succès !"
        );
      } else {
        alert(isMgLang
          ? "Tsy nahomby ny fampitahana. Jereo azafady raha mifandray amin'ny internet ianao."
          : "Échec de la synchronisation. Veuillez vérifier votre connexion internet."
        );
      }
    });

    this.querySelector("#clearCacheBtn")?.addEventListener("click", () => {
      if (confirm("Tena hodiovina ve ny drakitra rehetra amin'ny milina? Ho fafana koa ny naoty.")) {
        localStorage.clear();
        location.reload();
      }
    });

    // Dynamic Language Installer simulator!
    const addLanguageBtn = this.querySelector("#addLanguageBtn");
    addLanguageBtn?.addEventListener("click", () => {
      const container = this.querySelector("#newLanguagesContainer");
      if (container) {
        container.innerHTML = `
          <div class="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-xl animate-bounce">
            <div class="flex items-center space-x-3">
              <span class="text-xl">🇨🇳</span>
              <div>
                <h4 class="text-xs font-bold text-indigo-900">Feheziko-Zh (Chinois)</h4>
                <p class="text-[9px] text-indigo-600 font-semibold uppercase tracking-wider">Mandeha tsara (Installé avec Succès !)</p>
              </div>
            </div>
            <span class="text-xs font-mono text-indigo-400">zh.json (32KB)</span>
          </div>
        `;
        alert("Fiteny sinoa (Chinois) tafapetraka soa aman-tsara tsy nisy fanovana kaody !");
      }
    });
  }

  private renderQuickReviewWidget(isMg: boolean): string {
    let qrHtml = "";
    if (this.qrCurrentIndex === -1) {
      // Not started state
      qrHtml = `
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center space-x-2">
              <span class="text-xl">⚡</span>
              <h4 class="text-base font-black tracking-tight text-white">${isMg ? "Famerenana Mailaka" : "Quick Review"}</h4>
              <span class="bg-amber-400/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-400/30 font-mono">Lightning Round</span>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed max-w-md">
              ${isMg 
                ? "Andramo amin'ny alalan'ny karatra ny voambolana 3 avy amin'ny rakibolanao mba hahazoana XP fanampiny!" 
                : "Test your knowledge on 3 random words from your dictionary list in a fast flashcard game!"}
            </p>
          </div>
          <button id="startQrBtn" class="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs py-2.5 px-4 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md shadow-amber-500/10 whitespace-nowrap self-start sm:self-auto">
            🚀 ${isMg ? "Hanomboka" : "Start Round"}
          </button>
        </div>
      `;
    } else if (this.qrCurrentIndex < this.qrWords.length) {
      // Active question state
      const currentWord = this.qrWords[this.qrCurrentIndex];
      const progressPercent = Math.round((this.qrCurrentIndex / this.qrWords.length) * 100);
      qrHtml = `
        <div class="space-y-4">
          <!-- Header and progress bar -->
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                ${isMg ? `Teny faha-${this.qrCurrentIndex + 1} amin'ny ${this.qrWords.length}` : `Word ${this.qrCurrentIndex + 1} of ${this.qrWords.length}`}
              </span>
            </div>
            <span class="text-[10px] font-mono font-bold text-slate-300">${progressPercent}%</span>
          </div>

          <!-- Micro-progress bar -->
          <div class="w-full bg-slate-950/40 rounded-full h-1.5 border border-white/5 overflow-hidden">
            <div class="bg-amber-400 h-full rounded-full transition-all duration-300" style="width: ${progressPercent}%"></div>
          </div>

          <!-- Card Body -->
          <div class="bg-slate-950/30 border border-white/10 rounded-2xl p-6 text-center space-y-4 shadow-inner relative min-h-[160px] flex flex-col justify-center items-center animate-fade-in">
            <div class="space-y-1">
              <h3 class="text-3xl font-black text-white tracking-tight select-all">${currentWord.word}</h3>
              <p class="text-[10px] font-mono text-indigo-300">[ ${currentWord.type || "mot"} • ${currentWord.phonetic || ""} ]</p>
            </div>

            ${!this.qrShowAnswer 
              ? `
              <button id="revealQrBtn" class="bg-indigo-600/50 hover:bg-indigo-600 text-indigo-100 hover:text-white font-bold text-xs py-2 px-4 rounded-xl border border-indigo-400/20 transition-all active:scale-95 shadow-sm mt-2">
                👀 ${isMg ? "Asehoy ny dikan-teny" : "Reveal Translation"}
              </button>
              `
              : `
              <div class="space-y-3 w-full border-t border-white/10 pt-4 mt-2">
                <div>
                  <span class="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">${isMg ? "Dikan-teny" : "Translation"}</span>
                  <p class="text-lg font-extrabold text-amber-300">${currentWord.translation}</p>
                </div>
                ${currentWord.definition ? `
                  <p class="text-xs text-slate-300 max-w-md mx-auto leading-relaxed bg-white/5 p-2.5 rounded-xl border border-white/5">
                    ${currentWord.definition}
                  </p>
                ` : ""}
                
                <!-- Correct / Incorrect action buttons -->
                <div class="flex justify-center items-center gap-3 pt-2">
                  <button id="qrIncorrectBtn" class="flex-1 max-w-[140px] bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 border border-rose-500/30 font-bold text-xs py-2 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5">
                    ❌ ${isMg ? "Diso" : "Incorrect"}
                  </button>
                  <button id="qrCorrectBtn" class="flex-1 max-w-[140px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 font-bold text-xs py-2 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/5">
                    ✅ ${isMg ? "Marina" : "Correct"}
                  </button>
                </div>
              </div>
              `
            }
          </div>
        </div>
      `;
    } else {
      // Completed state
      const totalWords = this.qrWords.length;
      const scorePercentage = Math.round((this.qrCorrectCount / totalWords) * 100);
      const earnedXp = this.qrCorrectCount * 5 + 5;
      
      qrHtml = `
        <div class="text-center py-4 space-y-5">
          <div class="space-y-1">
            <span class="text-4xl block animate-bounce">🏆</span>
            <h4 class="text-xl font-black tracking-tight text-white">${isMg ? "Vita ny famerenana!" : "Round Completed!"}</h4>
            <p class="text-xs text-slate-300 leading-relaxed">
              ${isMg 
                ? `Nahazo valiny marina ${this.qrCorrectCount} tamin'ny ${totalWords} ianao.` 
                : `You got ${this.qrCorrectCount} out of ${totalWords} translations correct.`}
            </p>
          </div>

          <!-- Circular Score & XP Badge -->
          <div class="inline-flex flex-col items-center justify-center bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 space-y-1">
            <span class="text-3xl font-black text-amber-300">${scorePercentage}%</span>
            <span class="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">+${earnedXp} XP Gained!</span>
          </div>

          <div>
            <button id="resetQrBtn" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-sm">
              🔄 ${isMg ? "Averina indray" : "Review Again"}
            </button>
          </div>
        </div>
      `;
    }

    return `
      <!-- Quick Review Widget -->
      <div class="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden border border-slate-800 shadow-md">
        <div class="absolute right-4 top-4 text-3xl opacity-10 pointer-events-none">⚡</div>
        ${qrHtml}
      </div>
    `;
  }

  private getWordDetails(wordStr: string): any {
    const content = (window as any).feheziko?.languageContent;
    const customWordsStored = localStorage.getItem("feheziko_custom_words");
    let customWords: any[] = [];
    try {
      if (customWordsStored) customWords = JSON.parse(customWordsStored);
    } catch {}

    const combinedDict = [...(content?.dictionary || []), ...customWords];
    const found = combinedDict.find((item: any) => item.word.toLowerCase() === wordStr.toLowerCase());
    if (found) return found;

    // Default fallback
    return {
      word: wordStr,
      translation: "Dikan-teny tsy hita",
      definition: "Tsy misy famaritana ato amin'ny rakibolana.",
      type: "mot"
    };
  }

  private initializeQuickReview() {
    const progress = this.db.getProgress();
    const content = (window as any).feheziko?.languageContent;
    
    const customWordsStored = localStorage.getItem("feheziko_custom_words");
    let customWords: any[] = [];
    try {
      if (customWordsStored) customWords = JSON.parse(customWordsStored);
    } catch {}

    const bookmarkedWords = progress.revisionDeck.map(item => item.word);
    
    // Build user words pool
    const userWordsPool = Array.from(new Set([
      ...customWords.map(w => w.word),
      ...bookmarkedWords
    ]));

    // If user has fewer than 3 words, fill with standard dictionary words
    const standardWords = content?.dictionary.map((item: any) => item.word) || [];
    
    const pool = [...userWordsPool];
    if (pool.length < 3) {
      for (const w of standardWords) {
        if (!pool.includes(w)) {
          pool.push(w);
        }
        if (pool.length >= 5) break; // pull a few extra for shuffling
      }
    }

    // Shuffle pool
    const shuffled = pool.sort(() => 0.5 - Math.random());
    
    // Pick first 3
    const selectedWords = shuffled.slice(0, 3);
    
    // Map to details
    this.qrWords = selectedWords.map(w => this.getWordDetails(w));
    this.qrCurrentIndex = 0;
    this.qrShowAnswer = false;
    this.qrCorrectCount = 0;
  }

  private handleQrAnswer(wasCorrect: boolean) {
    if (wasCorrect) {
      this.qrCorrectCount++;
    }
    
    // Track correct/incorrect back to SuperMemo database
    const activeWordObj = this.qrWords[this.qrCurrentIndex];
    if (activeWordObj) {
      this.db.addToRevisionDeck(activeWordObj.word);
      this.db.reviewWord(activeWordObj.word, wasCorrect);
    }

    this.qrCurrentIndex++;
    this.qrShowAnswer = false;

    // If we just finished, award XP!
    if (this.qrCurrentIndex === this.qrWords.length) {
      const earnedXp = this.qrCorrectCount * 5 + 5; // 5 XP per correct + 5 bonus XP for completion
      this.db.addXp(earnedXp);
    }
    
    window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
  }

  /**
   * Render D3.js 7-Day Dual Metric Progress Chart
   * Displays Vocabulary Acquisition area & Lesson Completion curves
   */
  private renderD3ProgressChart() {
    const container = this.querySelector("#d3-progress-chart-container") as HTMLElement;
    if (!container) return;

    container.innerHTML = ""; // Clear previous render

    const data = this.db.get7DayProgressData();
    const isMg = this.db.getProgress().accessibility.language === "mg";

    const margin = { top: 25, right: 25, bottom: 30, left: 30 };
    const width = container.clientWidth || 550;
    const height = 210;

    const svg = d3
      .select(container)
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("class", "w-full h-full overflow-visible");

    const defs = svg.append("defs");

    // Vocabulary Area Gradient Fill
    const vocabGradient = defs
      .append("linearGradient")
      .attr("id", "d3-vocab-area-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    vocabGradient.append("stop").attr("offset", "0%").attr("stop-color", "#6366f1").attr("stop-opacity", 0.35);
    vocabGradient.append("stop").attr("offset", "100%").attr("stop-color", "#6366f1").attr("stop-opacity", 0.02);

    // X Point Scale
    const xLabels = data.map(d => isMg ? d.dayAbbrMg : d.dayAbbrFr);
    const xScale = d3
      .scalePoint()
      .domain(xLabels)
      .range([margin.left, width - margin.right])
      .padding(0.2);

    // Y Scale for Vocabulary
    const maxVocab = Math.max(...data.map(d => d.vocabCount), 10);
    const yScaleVocab = d3
      .scaleLinear()
      .domain([0, maxVocab * 1.15])
      .range([height - margin.bottom, margin.top]);

    // Y Scale for Lessons
    const maxLessons = Math.max(...data.map(d => d.lessonsCount), 3);
    const yScaleLessons = d3
      .scaleLinear()
      .domain([0, maxLessons * 1.25])
      .range([height - margin.bottom, margin.top]);

    // Background Grid lines
    const yTicks = [0, Math.round(maxVocab / 2), maxVocab];
    yTicks.forEach(tickVal => {
      const y = yScaleVocab(tickVal);
      svg
        .append("line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", y)
        .attr("y2", y)
        .attr("stroke", "currentColor")
        .attr("stroke-opacity", 0.08)
        .attr("stroke-dasharray", "3 3");
    });

    // Vocabulary Area Path
    const areaVocab = d3
      .area<any>()
      .x(d => xScale(isMg ? d.dayAbbrMg : d.dayAbbrFr)!)
      .y0(height - margin.bottom)
      .y1(d => yScaleVocab(d.vocabCount))
      .curve(d3.curveMonotoneX);

    svg
      .append("path")
      .datum(data)
      .attr("fill", "url(#d3-vocab-area-gradient)")
      .attr("d", areaVocab);

    // Vocabulary Line Path
    const lineVocab = d3
      .line<any>()
      .x(d => xScale(isMg ? d.dayAbbrMg : d.dayAbbrFr)!)
      .y(d => yScaleVocab(d.vocabCount))
      .curve(d3.curveMonotoneX);

    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#6366f1")
      .attr("stroke-width", 2.5)
      .attr("d", lineVocab);

    // Lesson Completion Line Path (Emerald)
    const lineLessons = d3
      .line<any>()
      .x(d => xScale(isMg ? d.dayAbbrMg : d.dayAbbrFr)!)
      .y(d => yScaleLessons(d.lessonsCount))
      .curve(d3.curveMonotoneX);

    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#10b981")
      .attr("stroke-width", 2.5)
      .attr("stroke-dasharray", "5 3")
      .attr("d", lineLessons);

    // HTML Tooltip Element
    let tooltip = container.querySelector(".d3-chart-tooltip") as HTMLElement;
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.className =
        "d3-chart-tooltip absolute hidden pointer-events-none bg-slate-950/90 text-white text-[11px] font-sans p-2.5 rounded-xl border border-amber-400/30 shadow-xl z-20 backdrop-blur-md transition-opacity duration-150";
      container.appendChild(tooltip);
    }

    // Vocabulary Data Nodes
    svg
      .selectAll(".vocab-node")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "vocab-node cursor-pointer")
      .attr("cx", d => xScale(isMg ? d.dayAbbrMg : d.dayAbbrFr)!)
      .attr("cy", d => yScaleVocab(d.vocabCount))
      .attr("r", 4.5)
      .attr("fill", "#ffffff")
      .attr("stroke", "#6366f1")
      .attr("stroke-width", 2.5)
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget).attr("r", 7).attr("fill", "#6366f1");
        tooltip.style.display = "block";
        const dayLabel = isMg ? d.dayLabelMg : d.dayLabelFr;
        tooltip.innerHTML = `
          <div class="font-bold text-amber-300 border-b border-white/10 pb-1 mb-1">${dayLabel} ${d.isToday ? " (Today)" : ""}</div>
          <div class="flex items-center justify-between gap-3 text-indigo-200">
            <span>📚 Vocabulaire:</span>
            <strong class="text-white">${d.vocabCount} words</strong>
          </div>
          <div class="flex items-center justify-between gap-3 text-emerald-300 mt-0.5">
            <span>🎯 Leçons:</span>
            <strong class="text-white">${d.lessonsCount} done</strong>
          </div>
        `;
        const rect = container.getBoundingClientRect();
        const xPos = event.clientX - rect.left;
        const yPos = event.clientY - rect.top;
        tooltip.style.left = `${Math.min(xPos + 10, width - 140)}px`;
        tooltip.style.top = `${Math.max(yPos - 50, 10)}px`;
      })
      .on("mouseout", (event) => {
        d3.select(event.currentTarget).attr("r", 4.5).attr("fill", "#ffffff");
        tooltip.style.display = "none";
      });

    // Lesson Data Nodes
    svg
      .selectAll(".lesson-node")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "lesson-node cursor-pointer")
      .attr("cx", d => xScale(isMg ? d.dayAbbrMg : d.dayAbbrFr)!)
      .attr("cy", d => yScaleLessons(d.lessonsCount))
      .attr("r", 4.5)
      .attr("fill", "#ffffff")
      .attr("stroke", "#10b981")
      .attr("stroke-width", 2.5)
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget).attr("r", 7).attr("fill", "#10b981");
        tooltip.style.display = "block";
        const dayLabel = isMg ? d.dayLabelMg : d.dayLabelFr;
        tooltip.innerHTML = `
          <div class="font-bold text-amber-300 border-b border-white/10 pb-1 mb-1">${dayLabel} ${d.isToday ? " (Today)" : ""}</div>
          <div class="flex items-center justify-between gap-3 text-emerald-300">
            <span>🎯 Leçons:</span>
            <strong class="text-white">${d.lessonsCount} done</strong>
          </div>
          <div class="flex items-center justify-between gap-3 text-indigo-200 mt-0.5">
            <span>📚 Vocabulaire:</span>
            <strong class="text-white">${d.vocabCount} words</strong>
          </div>
        `;
        const rect = container.getBoundingClientRect();
        const xPos = event.clientX - rect.left;
        const yPos = event.clientY - rect.top;
        tooltip.style.left = `${Math.min(xPos + 10, width - 140)}px`;
        tooltip.style.top = `${Math.max(yPos - 50, 10)}px`;
      })
      .on("mouseout", (event) => {
        d3.select(event.currentTarget).attr("r", 4.5).attr("fill", "#ffffff");
        tooltip.style.display = "none";
      });

    // X Axis Labels
    data.forEach(d => {
      const x = xScale(isMg ? d.dayAbbrMg : d.dayAbbrFr)!;
      const y = height - margin.bottom + 20;
      const label = isMg ? d.dayAbbrMg : d.dayAbbrFr;

      svg
        .append("text")
        .attr("x", x)
        .attr("y", y)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("font-family", "monospace")
        .attr("font-weight", d.isToday ? "800" : "600")
        .attr("fill", d.isToday ? "#f59e0b" : "currentColor")
        .attr("opacity", d.isToday ? 1 : 0.6)
        .text(label);
    });
  }

  /**
   * MPANAMPY: Daily Speaking Challenge Logic & Template
   */
  private getTodaySpeakingPhrase() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const index = Math.abs(dayOfYear) % this.dailySpeakingPhrases.length;
    return this.dailySpeakingPhrases[index];
  }

  private getTodayDateKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;
  }

  private getDailySpeakingCompletion() {
    const key = `feheziko_daily_speaking_${this.getTodayDateKey()}`;
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }

  private async speakDailyPhrase(text: string) {
    const audio = (window as any).feheziko?.audio;
    if (!audio) return;
    try {
      const btn = this.querySelector("#speakDailyPhraseBtn");
      if (btn) btn.classList.add("scale-95", "opacity-70");
      await audio.speakFrench(text);
      if (btn) btn.classList.remove("scale-95", "opacity-70");
    } catch (e) {
      console.error("Audio speak error:", e);
    }
  }

  private async startDailySpeakingRecord(phraseObj: any) {
    const audio = (window as any).feheziko?.audio;
    if (!audio || this.speakingChallengeRecording) return;

    this.speakingChallengeRecording = true;
    this.speakingChallengeResult = null;
    this.speakingChallengeInterimTranscript = "";
    this.speakingChallengeProgress = 0;
    this.render();

    let elapsed = 0;
    this.speakingChallengeTimer = setInterval(() => {
      elapsed += 100;
      this.speakingChallengeProgress = Math.min(100, Math.floor((elapsed / 2500) * 100));
      const bar = this.querySelector("#dailyRecordProgressBar") as HTMLElement;
      if (bar) bar.style.width = `${this.speakingChallengeProgress}%`;

      const simBars = this.querySelectorAll(".daily-sim-wave-bar");
      simBars.forEach(b => {
        const h = Math.floor(Math.random() * 26) + 6;
        (b as HTMLElement).style.height = `${h}px`;
      });
    }, 100);

    try {
      const res = await audio.recordAndEvaluate(phraseObj.phrase, (transcript: string) => {
        this.speakingChallengeInterimTranscript = transcript;
        const liveLabel = this.querySelector("#dailyLiveTranscriptLabel");
        if (liveLabel) liveLabel.textContent = `"${transcript}"`;
      });

      if (this.speakingChallengeTimer) {
        clearInterval(this.speakingChallengeTimer);
        this.speakingChallengeTimer = null;
      }
      this.speakingChallengeRecording = false;
      this.speakingChallengeResult = res;

      // Save completion in localStorage & add XP
      const completionKey = `feheziko_daily_speaking_${this.getTodayDateKey()}`;
      const recordData = {
        completed: true,
        phraseId: phraseObj.id,
        score: res.score,
        accuracyPercent: res.accuracyPercent,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(completionKey, JSON.stringify(recordData));

      if (this.db) {
        this.db.addXp(25);
        this.db.addStudyHours(0.05);
      }

      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
    } catch (err) {
      console.error("Daily speaking recording error:", err);
      if (this.speakingChallengeTimer) {
        clearInterval(this.speakingChallengeTimer);
        this.speakingChallengeTimer = null;
      }
      this.speakingChallengeRecording = false;
      this.render();
    }
  }

  private renderDailySpeakingChallengeWidget(isMg: boolean) {
    const todayPhrase = this.getTodaySpeakingPhrase();
    const completion = this.getDailySpeakingCompletion();
    const isCompleted = completion && completion.completed;
    const activeScore = this.speakingChallengeResult?.score || completion?.score || 0;

    return `
      <div class="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl p-5 text-white shadow-md border border-indigo-700/40 relative overflow-hidden animate-stagger animate-stagger-delay-4 space-y-4">
        <div class="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
          <span class="text-9xl">🎙️</span>
        </div>

        <!-- Header bar -->
        <div class="flex items-center justify-between flex-wrap gap-2 border-b border-indigo-800/60 pb-3">
          <div class="flex items-center space-x-2.5">
            <div class="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-lg shadow-inner">
              <span>🎙️</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-extrabold text-sm md:text-base text-white tracking-tight">
                  ${isMg ? "Sada Fitenenana Anio" : "Défi d'Élocution du Jour"}
                </h3>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  ${isMg ? "Fanononana" : "Prononciation"}
                </span>
              </div>
              <p class="text-[11px] text-indigo-200/80">
                ${isMg ? "Fitaovana iray kitika mba hampitomboana ny fahatokisana miteny" : "Entraînez-vous chaque jour en un clic pour parler avec assurance"}
              </p>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            ${isCompleted ? `
              <span class="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-400 text-slate-950 flex items-center gap-1 shadow-xs">
                <span>🏆</span>
                <span>+25 XP ${isMg ? "Lasa" : "Gagnés"}</span>
              </span>
            ` : `
              <span class="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                <span>🌟</span>
                <span>+25 XP Bonus</span>
              </span>
            `}
          </div>
        </div>

        <!-- Phrase display card -->
        <div class="bg-indigo-950/60 border border-indigo-800/50 rounded-xl p-4 space-y-2 relative">
          <div class="flex justify-between items-center text-[10px] font-mono text-indigo-300/80 uppercase tracking-wider">
            <span>${isMg ? "Fehezanteny anio" : "Phrase du jour"} • ${isMg ? todayPhrase.categoryMg : todayPhrase.categoryFr}</span>
            <span>${isMg ? "Tanjona" : "Cible"}: French (FR)</span>
          </div>

          <!-- Main French Text -->
          <div class="text-lg md:text-xl font-black text-white leading-snug tracking-tight font-sans">
            "${todayPhrase.phrase}"
          </div>

          <!-- Phonetic & Translation -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs pt-1 border-t border-indigo-800/40">
            <span class="font-mono text-amber-300/90 text-[11px]">
              🗣️ [${todayPhrase.phonetic}]
            </span>
            <span class="text-indigo-200/90 italic text-[11px]">
              ${isMg ? todayPhrase.translationMg : todayPhrase.translationFr}
            </span>
          </div>
        </div>

        <!-- Live Recording / Active State -->
        ${this.speakingChallengeRecording ? `
          <div class="bg-rose-950/40 border border-rose-500/40 rounded-xl p-4 space-y-3 animate-pulse">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="w-3 h-3 rounded-full bg-rose-500 animate-ping"></span>
                <span class="text-xs font-bold text-rose-200 font-mono">
                  ${isMg ? "Mihaino amim-pitandremana..." : "Écoute attentive en cours..."}
                </span>
              </div>
              <span class="text-xs font-mono text-rose-300">${this.speakingChallengeProgress}%</span>
            </div>

            <!-- Visual Simulated Soundwave Bars -->
            <div class="flex items-center justify-center space-x-1.5 h-9 py-1 bg-black/20 rounded-lg">
              ${[12, 24, 8, 20, 30, 15, 25, 10, 22, 18, 28, 14, 26, 9].map(h => `
                <div class="daily-sim-wave-bar w-1.5 bg-gradient-to-t from-rose-500 to-amber-400 rounded-full transition-all duration-100" style="height: ${h}px"></div>
              `).join("")}
            </div>

            <!-- Real-time transcript feedback label -->
            <div class="text-center text-xs font-mono text-rose-200/90 italic min-h-[1.25rem]" id="dailyLiveTranscriptLabel">
              ${this.speakingChallengeInterimTranscript ? `"${this.speakingChallengeInterimTranscript}"` : (isMg ? "Abilio ny feonao..." : "Parlez maintenant...")}
            </div>

            <!-- Recording Progress Bar -->
            <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-rose-500/30">
              <div id="dailyRecordProgressBar" class="bg-rose-500 h-full transition-all duration-100" style="width: ${this.speakingChallengeProgress}%"></div>
            </div>
          </div>
        ` : ''}

        <!-- Evaluation Results Display -->
        ${(this.speakingChallengeResult || isCompleted) && !this.speakingChallengeRecording ? `
          <div class="bg-slate-900/90 border ${activeScore >= 80 ? 'border-emerald-500/40' : 'border-amber-500/40'} rounded-xl p-3.5 space-y-2.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="text-lg">${activeScore >= 80 ? '🏆' : '👍'}</span>
                <div>
                  <span class="text-xs font-extrabold ${activeScore >= 80 ? 'text-emerald-300' : 'text-amber-300'} font-mono">
                    ${activeScore}% ${isMg ? "Fahatsarana" : "Score"}
                  </span>
                  <p class="text-[11px] text-slate-300">
                    ${this.speakingChallengeResult?.feedback || (isMg ? "Nahazoana tsara ny fanononana anio!" : "Prononciation enregistrée avec succès !")}
                  </p>
                </div>
              </div>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${activeScore >= 80 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}">
                ${activeScore >= 80 ? (isMg ? "Tena Tsara" : "Excellent") : (isMg ? "Mendrika" : "Correct")}
              </span>
            </div>

            <!-- Recognized words breakdown chips -->
            ${this.speakingChallengeResult?.words ? `
              <div class="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800">
                ${this.speakingChallengeResult.words.map((w: any) => `
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono ${w.status === 'matched' ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-700/50' : w.status === 'fuzzy' ? 'bg-amber-900/60 text-amber-200 border border-amber-700/50' : 'bg-slate-800 text-slate-400 border border-slate-700'}">
                    ${w.status === 'matched' ? '✓' : '•'} ${w.word}
                  </span>
                `).join('')}
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Control Action Bar -->
        <div class="flex items-center justify-between gap-3 pt-1">
          <!-- Listen Native Audio button -->
          <button id="speakDailyPhraseBtn" class="flex-1 bg-white/10 hover:bg-white/20 text-indigo-100 font-bold py-2.5 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 border border-white/10 active:scale-95 cursor-pointer">
            <svg class="w-4 h-4 text-amber-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <span>${isMg ? "Mihaino feo" : "Écouter le modèle"}</span>
          </button>

          <!-- One-click Record button -->
          <button id="recordDailyPhraseBtn" class="flex-1 ${isCompleted && !this.speakingChallengeRecording ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950'} font-extrabold py-2.5 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 cursor-pointer disabled:opacity-50" ${this.speakingChallengeRecording ? 'disabled' : ''}>
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span>
              ${this.speakingChallengeRecording 
                ? (isMg ? "Mihaino..." : "Enregistrement...") 
                : isCompleted 
                  ? (isMg ? "✓ Vita (Andramo indray)" : "✓ Réussi (Réessayer)") 
                  : (isMg ? "🎙️ Handray feo 1-Kitika" : "🎙️ Enregistrer 1-Clic")
              }
            </span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * MPANAMPY: 30-Second Quick Dictation Methods & Renderer
   */
  private startQuickDictation() {
    this.qdActive = true;
    this.qdTimeLeft = 30;
    this.qdUserInput = "";
    this.qdSubmitted = false;
    this.qdAccuracyScore = 0;

    const randomIdx = Math.floor(Math.random() * this.qdSentences.length);
    this.qdTargetPhrase = this.qdSentences[randomIdx];

    if (this.qdTimer) clearInterval(this.qdTimer);

    // Speak sentence immediately
    if (this.qdTargetPhrase) {
      const audio = (window as any).feheziko?.audio;
      if (audio) audio.speakFrench(this.qdTargetPhrase.phrase);
    }

    this.qdTimer = setInterval(() => {
      if (this.qdTimeLeft > 1) {
        this.qdTimeLeft--;
        const timerLabel = this.querySelector("#qdTimerLabel");
        const timerBar = this.querySelector("#qdTimerBar") as HTMLElement;
        if (timerLabel) timerLabel.textContent = `${this.qdTimeLeft}s`;
        if (timerBar) timerBar.style.width = `${Math.round((this.qdTimeLeft / 30) * 100)}%`;
      } else {
        this.qdTimeLeft = 0;
        clearInterval(this.qdTimer);
        this.submitQuickDictation();
      }
    }, 1000);

    this.render();
  }

  private submitQuickDictation() {
    if (this.qdTimer) clearInterval(this.qdTimer);
    this.qdSubmitted = true;

    if (this.qdTargetPhrase) {
      const inputEl = this.querySelector("#qdInput") as HTMLInputElement;
      if (inputEl) this.qdUserInput = inputEl.value;

      const target = this.qdTargetPhrase.phrase.toLowerCase().trim().replace(/[.,!?;:]/g, "");
      const input = this.qdUserInput.toLowerCase().trim().replace(/[.,!?;:]/g, "");
      
      if (target === input) {
        this.qdAccuracyScore = 100;
      } else if (!input) {
        this.qdAccuracyScore = 0;
      } else {
        const targetWords = target.split(/\s+/);
        const inputWords = input.split(/\s+/);
        let matches = 0;
        targetWords.forEach(w => {
          if (inputWords.includes(w)) matches++;
        });
        this.qdAccuracyScore = Math.min(100, Math.round((matches / Math.max(1, targetWords.length)) * 100));
      }

      const xpEarned = this.qdAccuracyScore >= 80 ? 15 : this.qdAccuracyScore >= 50 ? 10 : 5;
      this.db.addXp(xpEarned);
    }

    this.render();
  }

  private resetQuickDictation() {
    if (this.qdTimer) clearInterval(this.qdTimer);
    this.qdActive = false;
    this.qdSubmitted = false;
    this.render();
  }

  private render30sQuickDictationWidget(isMg: boolean): string {
    if (!this.qdActive) {
      return `
        <div class="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 border border-purple-500/30 shadow-md relative overflow-hidden animate-stagger animate-stagger-delay-5 space-y-3">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-xl shadow-xs">
                ✍️
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-extrabold text-sm md:text-base text-white tracking-tight">
                    ${isMg ? "Dictée Rapide 30s (Fandikana Feo)" : "Dictée Rapide 30 Secondes"}
                  </h3>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    ⏱️ 30 sec
                  </span>
                </div>
                <p class="text-[11px] text-purple-200/80 mt-0.5">
                  ${isMg ? "Hainoy ny feo frantsay vao vakina ary soraty ao anatin'ny 30 segondra." : "Écoutez la phrase dictée et saisissez rapidement ce que vous entendez en 30s."}
                </p>
              </div>
            </div>

            <button id="startQdBtn" class="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-md hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer">
              <span>🎧</span>
              <span>${isMg ? "Hanomboka ny Dictée 30s" : "Lancer la Dictée 30s"}</span>
            </button>
          </div>
        </div>
      `;
    }

    if (this.qdSubmitted) {
      const isGood = this.qdAccuracyScore >= 70;
      const xp = this.qdAccuracyScore >= 80 ? 15 : this.qdAccuracyScore >= 50 ? 10 : 5;

      return `
        <div class="bg-slate-900 text-white rounded-2xl p-5 border ${isGood ? 'border-emerald-500/40' : 'border-amber-500/40'} shadow-lg space-y-4 animate-stagger">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-2xl">${isGood ? '🎉' : '✍️'}</span>
              <div>
                <h4 class="font-bold text-sm text-white">${isMg ? "Valin'ny Dictée 30s" : "Résultat de la Dictée 30s"}</h4>
                <p class="text-xs text-slate-400">${isMg ? "Naoty azonao amin'ny fandikana feo" : "Score d'exactitude de votre saisie"}</p>
              </div>
            </div>
            <span class="px-3 py-1 rounded-xl text-xs font-mono font-black ${isGood ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}">
              +${xp} XP
            </span>
          </div>

          <div class="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
            <div class="text-xs font-mono text-slate-400 uppercase tracking-wider">${isMg ? "Fehezanteny marina" : "Phrase modèle"} :</div>
            <p class="text-base font-extrabold text-amber-300">"${this.qdTargetPhrase?.phrase}"</p>
            <p class="text-xs text-slate-400 italic">${isMg ? this.qdTargetPhrase?.translationMg : this.qdTargetPhrase?.translationFr}</p>
            
            <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <span class="text-slate-400">${isMg ? "Ny nosoratanao" : "Votre réponse"} : <strong class="text-white">"${this.qdUserInput || (isMg ? '(Tsy nisy)' : '(Vide)')}"</strong></span>
              <span class="font-black text-indigo-300">${this.qdAccuracyScore}% ${isMg ? 'taham-pahamarinana' : 'd\'exactitude'}</span>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <button id="startQdBtn" class="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all active:scale-95 cursor-pointer">
              🔄 ${isMg ? "Dictée 30s vaovao" : "Nouvelle Dictée 30s"}
            </button>
            <button id="resetQdBtn" class="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer">
              ✕ ${isMg ? "Katonana" : "Fermer"}
            </button>
          </div>
        </div>
      `;
    }

    // Active playing state
    return `
      <div class="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 border border-purple-500/40 shadow-xl space-y-4 animate-stagger">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-xl">✍️</span>
            <span class="font-extrabold text-sm text-white">${isMg ? "Dictée 30s an-dàlana" : "Session Dictée 30s"}</span>
          </div>

          <!-- Countdown timer -->
          <div class="flex items-center space-x-2 bg-black/40 px-3 py-1 rounded-xl border border-white/10 font-mono">
            <span class="text-amber-400 text-xs font-bold animate-pulse">⏱️</span>
            <span id="qdTimerLabel" class="text-sm font-black text-white">${this.qdTimeLeft}s</span>
          </div>
        </div>

        <!-- Timer progress bar -->
        <div class="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div id="qdTimerBar" class="bg-gradient-to-r from-amber-400 to-purple-400 h-full transition-all duration-1000 ease-linear" style="width: ${Math.round((this.qdTimeLeft / 30) * 100)}%"></div>
        </div>

        <div class="bg-slate-950/80 p-4 rounded-xl border border-purple-500/20 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono text-purple-300 font-semibold">${isMg ? "Henoy tsara ary soraty mivantana :" : "Écoutez l'audio et saisissez la phrase :"}</span>
            <button id="qdReplayAudioBtn" class="bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-400/30 text-xs font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 active:scale-95 cursor-pointer">
              <span>🔊</span>
              <span>${isMg ? "Averina ny feo" : "Réécouté"}</span>
            </button>
          </div>

          <input id="qdInput" type="text" placeholder="${isMg ? "Soraty eto ny teny renay..." : "Tapez ici ce que vous entendez..."}" value="${this.qdUserInput}" class="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 text-white rounded-xl px-4 py-3 text-sm font-medium focus:outline-hidden transition-all shadow-inner" autofocus />
        </div>

        <div class="flex items-center justify-between pt-1">
          <button id="resetQdBtn" class="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer">
            ✕ ${isMg ? "Ajanona" : "Annuler"}
          </button>
          <button id="qdSubmitBtn" class="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer">
            ✓ ${isMg ? "Hamarino" : "Valider la saisie"}
          </button>
        </div>
      </div>
    `;
  }

  /**
   * MPANAMPY: Circular Progress Indicators for Learning Modules
   */
  private renderModuleProgressWidget(isMg: boolean, progress: any, allLevels: any[]) {
    const completedSet = new Set(progress.completedLessons || []);

    const levelMeta: Record<string, { badge: string; nameMg: string; nameFr: string; strokeColor: string; bgClass: string; textClass: string; borderClass: string; icon: string }> = {
      A1: {
        badge: "A1",
        nameMg: "Filohan-teny Fototra (Débutant)",
        nameFr: "Niveau Débutant",
        strokeColor: "#10b981", // Emerald 500
        bgClass: "bg-emerald-500/10 dark:bg-emerald-950/40",
        textClass: "text-emerald-700 dark:text-emerald-300",
        borderClass: "border-emerald-200 dark:border-emerald-800/60",
        icon: "🌱"
      },
      A2: {
        badge: "A2",
        nameMg: "Fiainana Andavanandro (Élémentaire)",
        nameFr: "Niveau Élémentaire",
        strokeColor: "#6366f1", // Indigo 500
        bgClass: "bg-indigo-500/10 dark:bg-indigo-950/40",
        textClass: "text-indigo-700 dark:text-indigo-300",
        borderClass: "border-indigo-200 dark:border-indigo-800/60",
        icon: "🌿"
      },
      B1: {
        badge: "B1",
        nameMg: "Serasera Mahaleo Tena (Intermédiaire)",
        nameFr: "Niveau Intermédiaire",
        strokeColor: "#f59e0b", // Amber 500
        bgClass: "bg-amber-500/10 dark:bg-amber-950/40",
        textClass: "text-amber-700 dark:text-amber-300",
        borderClass: "border-amber-200 dark:border-amber-800/60",
        icon: "🌳"
      },
      B2: {
        badge: "B2",
        nameMg: "Fitiavana sy Maîtrise (Avancé)",
        nameFr: "Niveau Avancé",
        strokeColor: "#a855f7", // Purple 500
        bgClass: "bg-purple-500/10 dark:bg-purple-950/40",
        textClass: "text-purple-700 dark:text-purple-300",
        borderClass: "border-purple-200 dark:border-purple-800/60",
        icon: "⭐"
      }
    };

    const modulesToDisplay = allLevels.length > 0 ? allLevels : [
      { id: "A1", title: "A1 - Débutant", lessons: [{ id: "l1" }, { id: "l2" }, { id: "l3_a1" }, { id: "l4_a1" }, { id: "l5_a1" }, { id: "l6_a1" }, { id: "l7_a1" }, { id: "l8_a1" }, { id: "l9_a1" }] },
      { id: "A2", title: "A2 - Élémentaire", lessons: [{ id: "l3" }, { id: "l4" }, { id: "l5" }, { id: "l6" }, { id: "l7_a2" }, { id: "l8_a2" }, { id: "l9_a2" }, { id: "l10_a2" }, { id: "l11_a2" }, { id: "l12_a2" }] },
      { id: "B1", title: "B1 - Intermédiaire", lessons: [{ id: "l1_b1" }, { id: "l2_b1" }, { id: "l3_b1" }] },
      { id: "B2", title: "B2 - Avancé", lessons: [{ id: "l1_b2" }, { id: "l2_b2" }] }
    ];

    let totalLessonsCount = 0;
    let totalCompletedLessonsCount = 0;

    const moduleData = modulesToDisplay.map((lvl: any) => {
      const lessons = lvl.lessons || [];
      const count = lessons.length;
      const completedCount = lessons.filter((les: any) => completedSet.has(les.id)).length;
      const percent = count > 0 ? Math.round((completedCount / count) * 100) : 0;

      totalLessonsCount += count;
      totalCompletedLessonsCount += completedCount;

      const meta = levelMeta[lvl.id] || {
        badge: lvl.id,
        nameMg: lvl.title || lvl.id,
        nameFr: lvl.title || lvl.id,
        strokeColor: "#3b82f6",
        bgClass: "bg-blue-500/10 dark:bg-blue-950/40",
        textClass: "text-blue-700 dark:text-blue-300",
        borderClass: "border-blue-200 dark:border-blue-800/60",
        icon: "📚"
      };

      return {
        id: lvl.id,
        title: isMg ? meta.nameMg : meta.nameFr,
        count,
        completedCount,
        percent,
        meta
      };
    });

    const overallCurriculumPercent = totalLessonsCount > 0 ? Math.round((totalCompletedLessonsCount / totalLessonsCount) * 100) : 0;

    // SVG Circle Math: Radius = 34, Circumference = 2 * PI * 34 = 213.63
    const circumference = 213.63;

    return `
      <div class="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs space-y-4 animate-stagger animate-stagger-delay-3">
        <!-- Header bar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center text-xl shadow-2xs">
              🎯
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-extrabold text-slate-800 dark:text-slate-100 text-base tracking-tight">
                  ${isMg ? "Fivoarana amin'ireo Ambaratonga (Modules de Formation)" : "Progression des Modules de Formation"}
                </h3>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  ${totalCompletedLessonsCount}/${totalLessonsCount} ${isMg ? "Lesona Vita" : "Leçons Complétées"}
                </span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ${isMg ? "Avereno sy araho amim-pifaliana ny taham-pahavitana isaky ny modely A1 hatramin'ny B2" : "Visualisation circulaire intuitive du taux d'avancement par module"}
              </p>
            </div>
          </div>

          <!-- Overall global progress indicator pill -->
          <div class="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shrink-0">
            <span class="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">${isMg ? "Fivoarana ankapobeny" : "Global"}</span>
            <span class="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400">${overallCurriculumPercent}%</span>
          </div>
        </div>

        <!-- Module Progress Cards Grid with Circular Indicators -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          ${moduleData.map((m: any) => {
            const targetOffset = circumference - (circumference * m.percent) / 100;
            const isFinished = m.percent >= 100;
            const isStarted = m.percent > 0;

            return `
              <div onclick="window.feheziko.navigate('lessons')" 
                   class="group bg-slate-50/70 hover:bg-white dark:bg-slate-950/40 dark:hover:bg-slate-900 border ${m.meta.borderClass} rounded-2xl p-4 transition-all duration-300 hover:shadow-md cursor-pointer relative overflow-hidden flex flex-col justify-between">
                
                <!-- Badge and status icon top row -->
                <div class="flex items-center justify-between gap-2 mb-3">
                  <div class="flex items-center space-x-1.5">
                    <span class="text-lg">${m.meta.icon}</span>
                    <span class="px-2 py-0.5 rounded-lg text-xs font-mono font-black ${m.meta.bgClass} ${m.meta.textClass} border ${m.meta.borderClass}">
                      ${m.meta.badge}
                    </span>
                  </div>

                  ${isFinished ? `
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                      <span>✓</span> Vita
                    </span>
                  ` : isStarted ? `
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Mitohy
                    </span>
                  ` : `
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      Dispo
                    </span>
                  `}
                </div>

                <!-- Circular Progress Ring & Title -->
                <div class="flex items-center justify-between my-2">
                  <div class="space-y-1 max-w-[120px]">
                    <h4 class="font-bold text-xs text-slate-800 dark:text-slate-100 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      ${m.title}
                    </h4>
                    <p class="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                      ${m.completedCount} / ${m.count} ${isMg ? "lesona" : "cours"}
                    </p>
                  </div>

                  <!-- SVG Circular Progress Indicator -->
                  <div class="relative w-20 h-20 shrink-0 flex items-center justify-center">
                    <svg class="w-20 h-20 transform -rotate-90 origin-center" viewBox="0 0 80 80">
                      <!-- Track Background Ring -->
                      <circle cx="40" cy="40" r="34" stroke-width="7" class="text-slate-200/80 dark:text-slate-800" fill="none" />

                      <!-- Foreground Animated Progress Ring -->
                      <circle cx="40" 
                              cy="40" 
                              r="34" 
                              stroke-width="7" 
                              stroke="${m.meta.strokeColor}" 
                              fill="none" 
                              stroke-dasharray="${circumference}" 
                              stroke-dashoffset="${circumference}" 
                              data-circle-target="${targetOffset}" 
                              stroke-linecap="round" 
                              class="transition-all duration-1000 ease-out" />
                    </svg>
                    
                    <!-- Inner Percentage Text -->
                    <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span class="font-mono font-black text-xs text-slate-800 dark:text-slate-100 tracking-tighter">
                        ${m.percent}%
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Bottom action line -->
                <div class="mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-800 flex items-center justify-between text-[11px] font-extrabold ${m.meta.textClass} group-hover:translate-x-0.5 transition-transform">
                  <span>${isMg ? "Jereo ny lesona" : "Accéder aux cours"}</span>
                  <span>→</span>
                </div>

              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  /**
   * MPANAMPY: Render Recharts Pronunciation Scoring Trends Widget
   */
  private renderRechartsPronunciationChart(isMg: boolean) {
    const container = this.querySelector("#rechartsPronunciationContainer");
    if (!container) return;

    if (!this.pronunciationRoot) {
      this.pronunciationRoot = createRoot(container);
    }
    this.pronunciationRoot.render(
      React.createElement(FzPronunciationChart, { isMg, db: this.db })
    );
  }

  /**
   * Integrated 'Achievement Unlocked' Toast System
   * Triggers when user reaches milestones in fz-badges or completes challenges
   */
  private triggerAchievementUnlockedToast(badgeIds?: string[], customTitle?: string, customMsg?: string, customIcon?: string) {
    const gameEngine = (window as any).feheziko?.game;
    const gameBadges = gameEngine ? gameEngine.getBadgesList() : [];
    const learningBadges = this.learning ? this.learning.getBadges() : [];
    const progress = this.db.getProgress();
    const isMg = progress.accessibility.language === "mg";

    let title = customTitle || (isMg ? "Mari-pankasitrahana Vaovao! 🏆" : "Succès Débloqué ! 🏆");
    let msg = customMsg || (isMg ? "Nahavita fanamby lehibe ianao ary nahazo valisoa!" : "Vous avez atteint un nouveau jalon exceptionnel !");
    let icon = customIcon || "👑";
    let tokenReward = 25;
    let xpReward = 50;

    if (badgeIds && badgeIds.length > 0) {
      const gBadge = gameBadges.find((b: any) => b.id === badgeIds[0]);
      if (gBadge) {
        title = isMg ? gBadge.nameMg : gBadge.nameFr;
        msg = isMg ? gBadge.descriptionMg : gBadge.descriptionFr;
        icon = gBadge.icon || "🏆";
        tokenReward = gBadge.tokenReward || 20;
      } else {
        const lBadge = learningBadges.find((b: any) => b.id === badgeIds[0]);
        if (lBadge) {
          title = lBadge.name;
          msg = lBadge.description;
          icon = lBadge.icon || "🏆";
        }
      }
    }

    // Ensure container exists
    let container = document.getElementById("fz-dashboard-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "fz-dashboard-toast-container";
      container.className = "fixed top-6 right-6 z-50 pointer-events-none flex flex-col gap-3 max-w-sm w-full p-4 sm:p-0";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className =
      "pointer-events-auto w-full relative overflow-hidden rounded-2xl border-2 border-amber-400 bg-slate-950/95 p-4 shadow-[0_20px_50px_rgba(245,158,11,0.4)] ring-2 ring-amber-400/30 text-white flex gap-3.5 animate-toast-in backdrop-blur-xl transition-all duration-300";

    // Confetti particles container
    const particlesContainer = document.createElement("div");
    particlesContainer.className = "absolute inset-0 pointer-events-none overflow-hidden";
    toast.appendChild(particlesContainer);

    for (let i = 0; i < 15; i++) {
      const p = document.createElement("div");
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 60;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      const size = 4 + Math.random() * 6;
      const colors = ["#fbbf24", "#38bdf8", "#f43f5e", "#34d399", "#a78bfa"];

      p.className = "absolute left-7 top-7 rounded-full opacity-90 animate-ping";
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      p.style.transform = `translate(${tx}px, ${ty}px)`;
      particlesContainer.appendChild(p);
    }

    toast.innerHTML += `
      <div class="relative shrink-0 flex items-center justify-center">
        <div class="absolute inset-0 bg-amber-400/30 rounded-2xl blur-lg scale-125 animate-pulse"></div>
        <div class="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 border border-amber-200/50 flex items-center justify-center text-2xl shadow-inner transform hover:scale-110 transition-transform">
          ${icon}
        </div>
      </div>

      <div class="flex-1 min-w-0 pr-6">
        <div class="flex items-center gap-1.5 mb-0.5">
          <span class="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          <span class="text-[10px] font-mono font-black uppercase tracking-wider text-amber-300">
            ${isMg ? "MARI-PANKASITRAHANA TRATRA" : "ACHIEVEMENT UNLOCKED"}
          </span>
        </div>
        <h4 class="text-sm font-extrabold text-white leading-tight tracking-tight">${title}</h4>
        <p class="text-xs text-slate-300 mt-1 leading-snug line-clamp-2">${msg}</p>

        <div class="flex items-center gap-2 mt-2.5">
          <span class="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold">
            🪙 +${tokenReward} Tokens
          </span>
          <span class="inline-flex items-center gap-1 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold">
            ⭐ +${xpReward} XP
          </span>
        </div>
      </div>

      <button class="toast-close-btn absolute top-2.5 right-2.5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors pointer-events-auto">
        ✕
      </button>
    `;

    container.appendChild(toast);

    try {
      this.db.addTokens(tokenReward);
      this.db.addXp(xpReward);
    } catch (e) {}

    const closeBtn = toast.querySelector(".toast-close-btn");
    closeBtn?.addEventListener("click", () => {
      toast.remove();
    });

    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-10px)";
        setTimeout(() => toast.remove(), 300);
      }
    }, 5500);
  }
}

customElements.define("fz-dashboard", FzDashboard);
