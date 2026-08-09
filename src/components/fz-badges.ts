/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseEngine } from "../core/DatabaseEngine";
import { GameEngine, GameBadge } from "../core/GameEngine";

export class FzBadges extends HTMLElement {
  private db!: DatabaseEngine;
  private game!: GameEngine;
  private showDevPlayground: boolean = false;
  private selectedFilter: "all" | "unlocked" | "locked" = "all";

  constructor() {
    super();
  }

  connectedCallback() {
    this.db = (window as any).feheziko?.db;
    this.game = (window as any).feheziko?.game;
    
    // Auto-check and unlock any badges earned from recent activity data
    if (this.game) {
      this.game.checkAndAwardBadges();
    }

    this.render();

    window.addEventListener("feheziko_state_changed", () => {
      if (this.game) {
        this.game.checkAndAwardBadges();
      }
      this.render();
    });

    window.addEventListener("feheziko_badge_unlocked", (e: any) => {
      const badgeIds = e.detail?.badgeIds || [];
      this.celebrateUnlock(badgeIds);
    });

    window.addEventListener("feheziko_lesson_perfected", (e: any) => {
      const lesson = e.detail?.lesson;
      if (lesson) {
        this.celebratePerfectLesson(lesson);
      }
    });
  }

  private celebrateUnlock(badgeIds: string[]) {
    // Locate newly unlocked badges to show custom toast/celebration
    const list = this.game.getBadgesList();
    const progress = this.db.getProgress();
    const isMg = progress.accessibility.language === "mg";

    badgeIds.forEach(id => {
      const badge = list.find(b => b.id === id);
      if (badge) {
        const title = isMg ? badge.nameMg : badge.nameFr;
        const msg = isMg 
          ? `Azonao ny mari-pankasitrahana "${title}" sy +${badge.tokenReward} Tokens!` 
          : `Vous avez débloqué le badge "${title}" et gagné +${badge.tokenReward} jetons !`;
        
        this.showToast(title, msg, badge.icon, badge.tokenReward);
        this.triggerConfettiCelebration('high');
      }
    });
  }

  private celebratePerfectLesson(lesson: any) {
    const isMg = this.db.getProgress().accessibility.language === "mg";
    const title = isMg ? "Lesona Tonga Lafatra! 🏆" : "Leçon Parfaite ! 🏆";
    const titleText = isMg ? (lesson.titleMg || lesson.title) : (lesson.titleFr || lesson.title);
    const msg = isMg
      ? `Arahabaina! Nahavita ny lesona "${titleText}" ianao nefa tsy nanao fahadisoana mihitsy! nahazo +30 XP bonus!`
      : `Félicitations ! Vous avez terminé la leçon "${titleText}" sans aucune faute ! +30 XP bonus !`;

    // Award +30 XP bonus for perfection!
    this.db.addXp(30);

    // Show custom high-contrast gold toast for lesson perfection
    this.showToast(title, msg, "🏆", 30);
    this.triggerConfettiCelebration('high');
  }

  private showToast(title: string, message: string, icon: string, reward: number) {
    // Inject custom CSS for premium animations if not already present
    this.injectStyles();

    const progress = this.db.getProgress();
    const isMg = progress.accessibility.language === "mg";

    const label = icon === "🏆" 
      ? (isMg ? "LESONA TONGA LAFATRA" : "LEÇON PARFAITE") 
      : (isMg ? "MARI-BONINAHITRA VAOVAO" : "MILESTONE UNLOCKED");

    const rewardUnit = icon === "🏆" ? "XP" : "Tokens";
    const rewardIcon = icon === "🏆" ? "⭐" : "🪙";

    // Ensure container exists
    let container = document.getElementById("fz-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "fz-toast-container";
      container.className = "fixed top-6 right-6 z-50 pointer-events-none flex flex-col gap-3.5 max-w-sm w-full p-4 sm:p-0";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "pointer-events-auto w-full relative overflow-hidden rounded-2xl border border-amber-400/40 bg-slate-950/95 p-4 shadow-[0_20px_50px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/25 text-white flex gap-4 animate-toast-in";
    
    // Add shine sweep overlay
    const shine = document.createElement("div");
    shine.className = "absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-full pointer-events-none";
    shine.style.animation = "toast-shine 2s cubic-bezier(0.4, 0, 0.2, 1) infinite";
    toast.appendChild(shine);

    // Confetti particles container
    const particlesContainer = document.createElement("div");
    particlesContainer.className = "absolute inset-0 pointer-events-none overflow-hidden";
    toast.appendChild(particlesContainer);

    // Create 20 colorful confetti particles radiating from the icon position
    for (let i = 0; i < 20; i++) {
      const p = document.createElement("div");
      const angle = Math.random() * Math.PI * 2;
      const distance = 40 + Math.random() * 80;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      const rot = Math.random() * 360;
      const size = 5 + Math.random() * 7;
      
      const colors = ["#fbbf24", "#38bdf8", "#f43f5e", "#34d399", "#a78bfa", "#f472b6"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      p.className = "absolute left-8 top-8 animate-confetti rounded-full";
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.backgroundColor = randomColor;
      p.style.setProperty("--tx", `${tx}px`);
      p.style.setProperty("--ty", `${ty}px`);
      p.style.setProperty("--rot", `${rot}deg`);
      p.style.animationDelay = `${Math.random() * 0.15}s`;
      particlesContainer.appendChild(p);
    }

    toast.innerHTML += `
      <!-- Icon with pulse glow -->
      <div class="relative shrink-0 flex items-center justify-center">
        <div class="absolute inset-0 bg-amber-400/25 rounded-2xl blur-md scale-110 animate-pulse"></div>
        <div class="w-14 h-14 rounded-2xl border-2 border-amber-400/40 bg-amber-950/40 flex items-center justify-center text-3xl shadow-inner relative z-10">
          <span>${icon}</span>
        </div>
      </div>
      
      <!-- Content -->
      <div class="flex-1 min-w-0 pr-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[9px] font-black uppercase tracking-widest text-amber-400 font-mono">${label}</span>
          <span class="flex items-center gap-0.5 bg-amber-400/10 text-amber-400 text-[9px] font-black font-mono px-2 py-0.5 rounded border border-amber-400/20">
            ${rewardIcon} +${reward} ${rewardUnit}
          </span>
        </div>
        <h3 class="text-sm font-extrabold text-slate-100 mt-1 truncate">${title}</h3>
        <p class="text-[11px] text-slate-300 font-medium leading-relaxed mt-0.5">${message}</p>
      </div>
    `;

    container.appendChild(toast);

    // Remove toast after animation completes
    setTimeout(() => {
      toast.remove();
      if (container && container.children.length === 0) {
        container.remove();
      }
    }, 5500);
  }

  private injectStyles() {
    if (!document.getElementById("fz-toast-styles")) {
      const style = document.createElement("style");
      style.id = "fz-toast-styles";
      style.textContent = `
        @keyframes toast-slide-in {
          0% { opacity: 0; transform: translate3d(120%, 0, 0) scale(0.85); }
          8% { opacity: 1; transform: translate3d(-10px, 0, 0) scale(1.04); }
          10% { transform: translate3d(0, 0, 0) scale(1); }
          90% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
          100% { opacity: 0; transform: translate3d(120%, 0, 0) scale(0.9); }
        }
        @keyframes toast-shine {
          0% { transform: translateX(-150%) skewX(-25deg); }
          100% { transform: translateX(250%) skewX(-25deg); }
        }
        @keyframes confetti-pop {
          0% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0) rotate(var(--rot)); opacity: 0; }
        }
        @keyframes fz-confetti-fall {
          0% {
            transform: translateY(-20px) rotate(0deg) translateX(0);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg) translateX(var(--drift));
            opacity: 0;
          }
        }
        .animate-toast-in {
          animation: toast-slide-in 5.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .animate-confetti {
          animation: confetti-pop 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }
        .animate-confetti-fall {
          animation: fz-confetti-fall var(--duration) linear forwards;
        }
      `;
      document.head.appendChild(style);
    }
  }

  private triggerConfettiCelebration(intensity: 'high' | 'medium' = 'medium') {
    this.injectStyles();

    const container = document.createElement("div");
    container.className = "fixed inset-0 pointer-events-none z-[9999] overflow-hidden";
    document.body.appendChild(container);

    const count = intensity === 'high' ? 95 : 45;
    const colors = ["#fbbf24", "#38bdf8", "#f43f5e", "#34d399", "#a78bfa", "#f472b6", "#10b981", "#6366f1"];
    const shapes = ["circle", "square", "triangle", "bar"];

    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      const left = Math.random() * 100;
      const delay = Math.random() * (intensity === 'high' ? 2.5 : 1.5);
      const duration = 2.5 + Math.random() * 2.5;
      const drift = -150 + Math.random() * 300;
      const size = 6 + Math.random() * 8;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];

      p.className = "absolute top-[-20px] animate-confetti-fall pointer-events-none";
      p.style.left = `${left}%`;
      p.style.width = `${size}px`;
      p.style.height = `${shape === 'bar' ? size * 0.3 : size}px`;
      p.style.setProperty("--duration", `${duration}s`);
      p.style.setProperty("--drift", `${drift}px`);
      p.style.animationDelay = `${delay}s`;

      if (shape === 'circle') {
        p.style.borderRadius = "50%";
        p.style.backgroundColor = color;
      } else if (shape === 'triangle') {
        p.style.width = "0";
        p.style.height = "0";
        p.style.borderLeft = `${size / 2}px solid transparent`;
        p.style.borderRight = `${size / 2}px solid transparent`;
        p.style.borderBottom = `${size}px solid ${color}`;
      } else {
        p.style.borderRadius = "2px";
        p.style.backgroundColor = color;
      }

      container.appendChild(p);
    }

    setTimeout(() => {
      container.remove();
    }, 6000);
  }

  private render() {
    if (!this.db || !this.game) return;

    const achievements = this.db.getAchievements();
    const progress = this.db.getProgress();
    const streakInfo = this.db.getCurrentStreakInfo();
    const isMg = progress.accessibility.language === "mg";
    const allBadges = this.game.getBadgesList();
    
    const tokens = achievements.tokens || 0;

    const t = isMg ? {
      title: "Mari-pankasitrahana & Token (Badges & Jetons)",
      subtitle: "Ny ezaka ataonao dia omena mari-boninahitra sy token dizitaly azo ampiasaina.",
      tokensCardTitle: "Ny Token-nao ankehitrining",
      tokensDesc: "Token azo tamin'ny alalan'ny lesona vita, ny hazo fandalinana, ary ny fanamby.",
      streakTitle: "Série d'Apprentissage (Hazo)",
      streakDesc: "Andro consecutive ianaranao am-paharisihana",
      unlockedBadges: "Mari-boninahitra azo",
      totalBadges: "Tontalin'ny Badges",
      unlockedState: "Tratra (Débloqué)",
      lockedState: "Mbola mihidy (Bloqué)",
      progressLabel: "Fandrosoana",
      rewardLabel: "Valisoa",
      filterAll: "Tontaly (Tous)",
      filterUnlocked: "Tratra (Débloqués)",
      filterLocked: "Am-pandrosoana (En cours)",
      devTitle: "Laboratoaran'ny Mpamorona (Sandbox Test)",
      devDesc: "Hampiasao ireto bokotra ireto mba hizahana haingana ny fomba fahazoana badges sy tokens.",
      addStreak1Day: "🔥 +1 Andro Hazo",
      addStreak3: "🔥 Hazo 3 Andro",
      addStreak7: "👑 Hazo 7 Andro",
      addStreak14: "🌋 Hazo 14 Andro",
      addStreak30: "⚡ Hazo 30 Andro",
      addEarlyBird: "🌅 Early Bird (7 AM)",
      addNightOwl: "🦉 Night Owl (11 PM)",
      addChallengeScore: "🎯 High Challenge (85%)",
      addXpBoost: "⭐ +100 XP",
      addVocab: "📖 SRS +15 Voambolana",
      completeDialogue: "🗣️ Dinika Vita +1",
      resetProgress: "🔄 Averina Zero ny Progress",
    } : {
      title: "Badges & Jetons Digitaux",
      subtitle: "Vos efforts d'apprentissage récompensés par des insignes et des jetons virtuels.",
      tokensCardTitle: "Votre solde de jetons",
      tokensDesc: "Jetons accumulés grâce à vos leçons terminées, vos séries actives et vos révisions.",
      streakTitle: "Série d'Apprentissage Quotidienne",
      streakDesc: "Jours consécutifs de pratique active",
      unlockedBadges: "Badges débloqués",
      totalBadges: "Total des badges",
      unlockedState: "Débloqué",
      lockedState: "Verrouillé",
      progressLabel: "Progression",
      rewardLabel: "Récompense",
      filterAll: "Tous",
      filterUnlocked: "Débloqués",
      filterLocked: "En cours",
      devTitle: "Developer Playground (Zone de Test)",
      devDesc: "Utilisez ces contrôles pour tester instantanément le déblocage des jalons et les gains de jetons.",
      addStreak1Day: "🔥 +1 Jour de Série",
      addStreak3: "🔥 Série 3 Jours",
      addStreak7: "👑 Série 7 Jours",
      addStreak14: "🌋 Série 14 Jours",
      addStreak30: "⚡ Série 30 Jours",
      addEarlyBird: "🌅 Early Bird (7h00)",
      addNightOwl: "🦉 Oiseau de Nuit (23h)",
      addChallengeScore: "🎯 Défi Élevé (85%)",
      addXpBoost: "⭐ +100 XP",
      addVocab: "📖 +15 Mots SRS",
      completeDialogue: "🗣️ Terminer 1 dialogue",
      resetProgress: "🔄 Réinitialiser la progression",
    };

    const unlockedCount = allBadges.filter(b => b.unlocked).length;

    const filteredBadges = allBadges.filter(b => {
      if (this.selectedFilter === "unlocked") return b.unlocked;
      if (this.selectedFilter === "locked") return !b.unlocked;
      return true;
    });

    this.innerHTML = `
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 class="text-2xl font-black text-slate-900 tracking-tight">${t.title}</h2>
            <p class="text-xs text-slate-500 mt-1">${t.subtitle}</p>
          </div>
          
          <!-- Developer Mode Toggle -->
          <button id="togglePlaygroundBtn" class="px-3 py-1.5 border border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 text-[11px] font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto">
            🔧 ${this.showDevPlayground ? "Hide Playground" : "Show Playground"}
          </button>
        </div>

        <!-- Digital Tokens & Stats Banner -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Token Wallet Card -->
          <div class="bg-gradient-to-r from-amber-500 to-amber-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden flex flex-col justify-between min-h-[140px]">
            <div class="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-15 pointer-events-none transform scale-150">
              <span class="text-9xl animate-pulse">🪙</span>
            </div>
            <div>
              <span class="bg-amber-400/30 text-amber-100 text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border border-amber-300/20">
                Digital Wallet
              </span>
              <h3 class="text-base font-extrabold mt-3 tracking-tight">${t.tokensCardTitle}</h3>
              <p class="text-[11px] text-amber-100/90 leading-relaxed mt-0.5">${t.tokensDesc}</p>
            </div>
            
            <div class="mt-4 flex items-baseline gap-2">
              <span class="text-4xl font-black font-mono tracking-tight text-white drop-shadow-sm">${tokens}</span>
              <span class="text-sm font-bold uppercase font-mono tracking-wider text-amber-200">Tokens</span>
              <span class="text-lg">🪙</span>
            </div>
          </div>

          <!-- Daily Streak Tracker Banner Card -->
          <div class="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-3xl p-6 text-white shadow-md relative overflow-hidden flex flex-col justify-between min-h-[140px]">
            <div class="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-15 pointer-events-none">
              <span class="text-8xl">🔥</span>
            </div>
            <div>
              <div class="flex items-center justify-between gap-2">
                <span class="bg-indigo-500/40 text-indigo-100 text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border border-indigo-400/30">
                  Daily Streak Engine
                </span>
                <span class="text-[10px] font-mono font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded border border-amber-300/30">
                  ${streakInfo.xpMultiplier} Bonus XP
                </span>
              </div>
              <h3 class="text-base font-extrabold mt-2.5 tracking-tight flex items-center gap-1.5">
                <span>🔥</span> ${streakInfo.currentStreak} ${isMg ? "Andro Hazo" : "Jours de Série"}
              </h3>
              <p class="text-[11px] text-indigo-100/90 leading-relaxed mt-0.5">${t.streakDesc}</p>
            </div>

            <div class="mt-4 flex items-center justify-between gap-3 pt-2 border-t border-indigo-500/40 text-xs">
              <span class="text-[11px] font-medium text-indigo-200">👑 Record: <strong class="text-white font-bold">${streakInfo.bestStreak}j</strong></span>
              <span class="text-[11px] font-medium text-emerald-300">🛡️ ${streakInfo.freezeShields} Gel Protégé</span>
            </div>
          </div>

          <!-- Quick Badges Stats -->
          <div class="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col justify-between min-h-[140px] shadow-xs">
            <div>
              <span class="text-[10px] font-mono font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                Achievements Summary
              </span>
              <h4 class="text-slate-800 text-sm font-bold mt-3">${t.unlockedBadges}</h4>
            </div>
            
            <div class="flex items-center justify-between gap-4 mt-2">
              <div>
                <span class="text-3xl font-black text-indigo-950 font-mono">${unlockedCount} / ${allBadges.length}</span>
                <span class="text-xs text-slate-400 block font-semibold">${t.totalBadges}</span>
              </div>
              
              <!-- Circular Progress Gauge -->
              <div class="relative w-14 h-14">
                <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path class="text-slate-100" stroke-width="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path class="text-indigo-600 transition-all duration-500 ease-out" stroke-dasharray="${Math.round((unlockedCount / allBadges.length) * 100)}, 100" stroke-width="3" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div class="absolute inset-0 flex items-center justify-center">
                  <span class="text-[10px] font-black font-mono text-indigo-950">${Math.round((unlockedCount / allBadges.length) * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter tabs & controls -->
        <div class="flex items-center gap-2 border-b border-slate-200 pb-3">
          <button data-filter="all" class="filterTabBtn px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            this.selectedFilter === "all" ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }">
            ${t.filterAll} (${allBadges.length})
          </button>
          <button data-filter="unlocked" class="filterTabBtn px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            this.selectedFilter === "unlocked" ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }">
            ${t.filterUnlocked} (${unlockedCount})
          </button>
          <button data-filter="locked" class="filterTabBtn px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            this.selectedFilter === "locked" ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }">
            ${t.filterLocked} (${allBadges.length - unlockedCount})
          </button>
        </div>

        <!-- Developer Test Tools Collapsible -->
        ${this.showDevPlayground ? `
          <div class="bg-indigo-50 border border-indigo-100 rounded-3xl p-5 space-y-4 animate-fade-in">
            <div class="flex items-start gap-2.5">
              <span class="text-xl">🛠️</span>
              <div>
                <h3 class="text-sm font-extrabold text-indigo-900">${t.devTitle}</h3>
                <p class="text-[11px] text-indigo-700/80 leading-relaxed">${t.devDesc}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <button id="devStreakPlus1Btn" class="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer">
                ${t.addStreak1Day}
              </button>
              <button id="devStreak3Btn" class="px-3 py-2 bg-white border border-indigo-200 hover:bg-indigo-100 active:scale-95 text-indigo-900 font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer">
                ${t.addStreak3}
              </button>
              <button id="devStreak7Btn" class="px-3 py-2 bg-white border border-indigo-200 hover:bg-indigo-100 active:scale-95 text-indigo-900 font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer">
                ${t.addStreak7}
              </button>
              <button id="devStreak14Btn" class="px-3 py-2 bg-white border border-indigo-200 hover:bg-indigo-100 active:scale-95 text-indigo-900 font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer">
                ${t.addStreak14}
              </button>
              <button id="devStreak30Btn" class="px-3 py-2 bg-white border border-indigo-200 hover:bg-indigo-100 active:scale-95 text-indigo-900 font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer">
                ${t.addStreak30}
              </button>
              <button id="devEarlyBirdBtn" class="px-3 py-2 bg-white border border-indigo-200 hover:bg-indigo-100 active:scale-95 text-indigo-900 font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer">
                ${t.addEarlyBird}
              </button>
              <button id="devNightOwlBtn" class="px-3 py-2 bg-white border border-indigo-200 hover:bg-indigo-100 active:scale-95 text-indigo-900 font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer">
                ${t.addNightOwl}
              </button>
              <button id="devChallengeBtn" class="px-3 py-2 bg-white border border-indigo-200 hover:bg-indigo-100 active:scale-95 text-indigo-900 font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer">
                ${t.addChallengeScore}
              </button>
              <button id="devXpBtn" class="px-3 py-2 bg-white border border-indigo-200 hover:bg-indigo-100 active:scale-95 text-indigo-900 font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer">
                ${t.addXpBoost}
              </button>
              <button id="devAddVocabBtn" class="px-3 py-2 bg-white border border-indigo-200 hover:bg-indigo-100 active:scale-95 text-indigo-900 font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer">
                ${t.addVocab}
              </button>
              <button id="devCompleteDlgBtn" class="px-3 py-2 bg-white border border-indigo-200 hover:bg-indigo-100 active:scale-95 text-indigo-900 font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer">
                ${t.completeDialogue}
              </button>
              <button id="devResetBtn" class="px-3 py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer">
                ${t.resetProgress}
              </button>
            </div>
          </div>
        ` : ""}

        <!-- Badges Roster List -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${filteredBadges.map(b => {
            const badgeTitle = isMg ? b.nameMg : b.nameFr;
            const badgeDesc = isMg ? b.descriptionMg : b.descriptionFr;
            const isUnlocked = b.unlocked;
            const percent = Math.min(100, Math.round((b.progressCurrent / b.progressMax) * 100));

            return `
              <div class="bg-white border ${isUnlocked ? "border-indigo-100 shadow-xs ring-4 ring-indigo-50/20" : "border-slate-200/80 opacity-80"} rounded-3xl p-5 relative flex flex-col justify-between gap-5 transition-all duration-150 group">
                
                <!-- Unlocked celebration aura or gray lock -->
                <div class="absolute right-4 top-4">
                  ${isUnlocked 
                    ? `<span class="bg-emerald-50 text-emerald-600 text-[10px] font-black font-mono border border-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">✓ ${t.unlockedState}</span>` 
                    : `<span class="bg-slate-50 text-slate-400 text-[10px] font-bold font-mono border border-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">🔒 ${t.lockedState}</span>`
                  }
                </div>

                <!-- Badge Identity details -->
                <div class="flex items-start gap-4">
                  <!-- Circular Icon backdrop -->
                  <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm border shrink-0 transition-transform group-hover:scale-110 duration-150 ${
                    isUnlocked 
                      ? "bg-indigo-50/60 border-indigo-100/50 text-indigo-700" 
                      : "bg-slate-50 border-slate-100 text-slate-300 filter grayscale"
                  }">
                    <span>${b.icon}</span>
                  </div>

                  <div class="space-y-1 pr-14">
                    <h4 class="font-extrabold text-slate-900 text-[15px] leading-tight group-hover:text-indigo-600 transition-colors">${badgeTitle}</h4>
                    <p class="text-[11px] text-slate-500 font-medium leading-normal">${badgeDesc}</p>
                  </div>
                </div>

                <!-- Reward value indicator & Progress track -->
                <div class="space-y-3.5 pt-3 border-t border-slate-100">
                  <div class="flex justify-between items-center text-xs">
                    <span class="text-slate-400 font-mono text-[10px] uppercase font-bold tracking-wider">${t.progressLabel}</span>
                    <span class="font-mono font-black ${isUnlocked ? "text-indigo-600" : "text-slate-500"}">${b.progressCurrent} / ${b.progressMax}</span>
                  </div>

                  <div class="w-full bg-slate-100 rounded-full h-2 relative overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500 ease-out ${isUnlocked ? "bg-indigo-600" : "bg-slate-400"}" style="width: ${percent}%"></div>
                  </div>

                  <div class="flex justify-between items-center pt-1.5">
                    <span class="text-[10px] font-bold uppercase text-slate-400 font-mono tracking-wider">${t.rewardLabel}</span>
                    <div class="flex items-center gap-1 bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-black font-mono px-2 py-1 rounded-lg">
                      <span>🪙</span>
                      <span>+${b.tokenReward} Tokens</span>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents() {
    // Filter tab buttons
    this.querySelectorAll(".filterTabBtn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const filter = (e.currentTarget as HTMLElement).getAttribute("data-filter") as any;
        if (filter) {
          this.selectedFilter = filter;
          this.render();
        }
      });
    });

    // Toggle dev sandbox
    const toggleBtn = this.querySelector("#togglePlaygroundBtn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        this.showDevPlayground = !this.showDevPlayground;
        this.render();
      });
    }

    // Dev sandbox action listeners
    const streakPlus1Btn = this.querySelector("#devStreakPlus1Btn");
    if (streakPlus1Btn) {
      streakPlus1Btn.addEventListener("click", () => {
        this.db.incrementStreak(1);
      });
    }

    const streak3Btn = this.querySelector("#devStreak3Btn");
    if (streak3Btn) {
      streak3Btn.addEventListener("click", () => {
        const progress = this.db.getProgress();
        progress.streak = 3;
        progress.currentStreak = 3;
        this.db.save();
        this.game.checkAndAwardBadges();
        window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
      });
    }

    const streak7Btn = this.querySelector("#devStreak7Btn");
    if (streak7Btn) {
      streak7Btn.addEventListener("click", () => {
        const progress = this.db.getProgress();
        progress.streak = 7;
        progress.currentStreak = 7;
        this.db.save();
        this.game.checkAndAwardBadges();
        window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
      });
    }

    const streak14Btn = this.querySelector("#devStreak14Btn");
    if (streak14Btn) {
      streak14Btn.addEventListener("click", () => {
        const progress = this.db.getProgress();
        progress.streak = 14;
        progress.currentStreak = 14;
        this.db.save();
        this.game.checkAndAwardBadges();
        window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
      });
    }

    const streak30Btn = this.querySelector("#devStreak30Btn");
    if (streak30Btn) {
      streak30Btn.addEventListener("click", () => {
        const progress = this.db.getProgress();
        progress.streak = 30;
        progress.currentStreak = 30;
        this.db.save();
        this.game.checkAndAwardBadges();
        window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
      });
    }

    const earlyBirdBtn = this.querySelector("#devEarlyBirdBtn");
    if (earlyBirdBtn) {
      earlyBirdBtn.addEventListener("click", () => {
        const progress = this.db.getProgress();
        const d = new Date();
        d.setHours(7, 0, 0, 0); // 7 AM
        progress.lastActiveDate = d.toISOString();
        this.db.save();
        this.game.checkAndAwardBadges();
        window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
      });
    }

    const nightOwlBtn = this.querySelector("#devNightOwlBtn");
    if (nightOwlBtn) {
      nightOwlBtn.addEventListener("click", () => {
        const progress = this.db.getProgress();
        const d = new Date();
        d.setHours(23, 0, 0, 0); // 11 PM
        progress.lastActiveDate = d.toISOString();
        this.db.save();
        this.game.checkAndAwardBadges();
        window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
      });
    }

    const challengeBtn = this.querySelector("#devChallengeBtn");
    if (challengeBtn) {
      challengeBtn.addEventListener("click", () => {
        this.db.saveChallengeScore("l1_ph1", 85);
        this.game.checkAndAwardBadges();
        window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
      });
    }

    const xpBtn = this.querySelector("#devXpBtn");
    if (xpBtn) {
      xpBtn.addEventListener("click", () => {
        this.db.addXp(100);
        this.game.checkAndAwardBadges();
        window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
      });
    }

    const vocabBtn = this.querySelector("#devAddVocabBtn");
    if (vocabBtn) {
      vocabBtn.addEventListener("click", () => {
        for (let i = 0; i < 15; i++) {
          const mockWord = `VocabWord_${Math.floor(Math.random() * 1000)}`;
          this.db.addToRevisionDeck(mockWord);
        }
        this.game.checkAndAwardBadges();
        window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
      });
    }

    const dBtn = this.querySelector("#devCompleteDlgBtn");
    if (dBtn) {
      dBtn.addEventListener("click", () => {
        const randomId = `dlg_${Math.floor(Math.random() * 1000)}`;
        this.db.completeDialogue(randomId);
        this.game.checkAndAwardBadges();
        window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
      });
    }

    const resetBtn = this.querySelector("#devResetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        const progress = this.db.getProgress();
        progress.streak = 0;
        progress.currentStreak = 0;
        progress.completedLessons = [];
        progress.completedDialogues = [];
        progress.revisionDeck = [];
        progress.unlockedBadges = [];
        progress.tokens = 0;
        progress.xp = 0;
        this.db.save();
        window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
      });
    }
  }
}

customElements.define("fz-badges", FzBadges);
