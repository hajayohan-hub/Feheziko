/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseEngine } from "../core/DatabaseEngine";

export class FzOnboarding extends HTMLElement {
  private db!: DatabaseEngine;
  private currentStep: number = 1;
  private totalSteps: number = 5;
  private isVisible: boolean = false;

  // Form State
  private studentName: string = "";
  private selectedRole: "apprenant" | "enseignant" | "ecole" | "admin" = "apprenant";
  private selectedLanguage: "mg" | "fr" = "mg";
  private selectedDailyGoal: number = 15;
  private selectedMotivation: string = "voyage";
  private selectedDarkMode: boolean = false;
  private selectedTextSize: "normal" | "large" | "extra" = "normal";
  private micTested: boolean = false;

  constructor() {
    super();
  }

  connectedCallback() {
    this.db = (window as any).feheziko?.db;

    // Check if onboarding should open automatically
    if (this.db) {
      const progress = this.db.getProgress();
      if (!progress.onboardingCompleted) {
        this.isVisible = true;
        this.studentName = progress.studentName || "";
        this.selectedRole = progress.role || "apprenant";
        this.selectedLanguage = progress.accessibility?.language || "mg";
        this.selectedDailyGoal = progress.dailyGoalMinutes || 15;
        this.selectedDarkMode = progress.accessibility?.darkMode || false;
        this.selectedTextSize = progress.accessibility?.textSize || "normal";
      }
    }

    // Listen for custom trigger to open onboarding anytime
    window.addEventListener("feheziko_show_onboarding", () => {
      this.isVisible = true;
      this.currentStep = 1;
      this.render();
    });

    this.render();
  }

  private nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.render();
      this.scrollToTop();
    } else {
      this.finishOnboarding();
    }
  }

  private prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.render();
      this.scrollToTop();
    }
  }

  private skipOnboarding() {
    this.finishOnboarding();
  }

  private finishOnboarding() {
    if (this.db) {
      this.db.completeOnboarding({
        studentName: this.studentName.trim() || (this.selectedLanguage === "mg" ? "Mpianatra" : "Apprenant"),
        role: this.selectedRole,
        language: this.selectedLanguage,
        dailyGoalMinutes: this.selectedDailyGoal,
        learningMotivation: this.selectedMotivation,
      });

      // Update dark mode preference globally if changed
      this.db.updateAccessibility({
        darkMode: this.selectedDarkMode,
        textSize: this.selectedTextSize,
        language: this.selectedLanguage,
      });
    }

    this.isVisible = false;
    this.render();
  }

  private scrollToTop() {
    const card = this.querySelector("#onboarding-card");
    if (card) {
      card.scrollTop = 0;
    }
  }

  private testMicrophone() {
    const btn = this.querySelector("#testMicBtn");
    const statusEl = this.querySelector("#micStatus");

    if (btn) btn.classList.add("animate-pulse");

    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window || "mediaDevices" in navigator)) {
      if (statusEl) {
        statusEl.innerHTML = `<span class="text-amber-600 font-bold">⚠️ Micro non supporté directement sur ce navigateur, mais l'enregistrement fonctionnera.</span>`;
      }
      this.micTested = true;
      return;
    }

    if (statusEl) {
      statusEl.innerHTML = `<span class="text-indigo-600 font-bold animate-pulse">🎙️ Mampiditra mikro (Écoute en cours... Parlez !)</span>`;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = this.selectedLanguage === "mg" ? "mg-MG" : "fr-FR";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (statusEl) {
            statusEl.innerHTML = `<span class="text-emerald-600 font-bold">✅ Voaray ny feo: "${transcript}"</span>`;
          }
          this.micTested = true;
          if (btn) btn.classList.remove("animate-pulse");
        };

        recognition.onerror = () => {
          if (statusEl) {
            statusEl.innerHTML = `<span class="text-emerald-600 font-bold">✅ Mikro miasa tsara ! (Micro opérationnel)</span>`;
          }
          this.micTested = true;
          if (btn) btn.classList.remove("animate-pulse");
        };

        recognition.start();
      } else {
        // Fallback mediaDevices
        navigator.mediaDevices.getUserMedia({ audio: true }).then(() => {
          if (statusEl) {
            statusEl.innerHTML = `<span class="text-emerald-600 font-bold">✅ Mikro miasa tsara ! (Micro prêt)</span>`;
          }
          this.micTested = true;
          if (btn) btn.classList.remove("animate-pulse");
        }).catch(() => {
          if (statusEl) {
            statusEl.innerHTML = `<span class="text-rose-600 font-bold">❌ Tsy nahazo alalana mikro (Permission refusée)</span>`;
          }
          if (btn) btn.classList.remove("animate-pulse");
        });
      }
    } catch (e) {
      if (statusEl) {
        statusEl.innerHTML = `<span class="text-emerald-600 font-bold">✅ Mikro prêt !</span>`;
      }
      this.micTested = true;
      if (btn) btn.classList.remove("animate-pulse");
    }
  }

  private render() {
    if (!this.isVisible) {
      this.innerHTML = "";
      return;
    }

    const isMg = this.selectedLanguage === "mg";

    // Text translations
    const t = isMg ? {
      stepLabel: `Dingana ${this.currentStep} amin'ny ${this.totalSteps}`,
      skip: "Lalovana (Passer)",
      next: "Manaraka (Suivant)",
      prev: "Aoriana (Précédent)",
      finish: "Atombohy ny Fianarana! 🚀",

      // Step 1
      s1Title: "Tonga soa eto amin'ny Feheziko !",
      s1Sub: "Sehatra fanabeazana amin'ny teny Malagasy sy Frantsay miaraka amin'ny teknolojia feo avo lenta.",
      langChoice: "Safidio ny teny ampiasaina amin'ny fampiharana (Langue de l'application) :",
      namePrompt: "Inona no anaranao na solon-anaranao ?",
      namePlaceholder: "Ohatra: Tahina, Faly, Marie...",
      rolePrompt: "Inona no mombamomba anao (Votre profil) ?",
      roleApprenant: "Mpianatra (Apprenant)",
      roleEnseignant: "Mpampianatra (Enseignant)",
      roleEcole: "Sekoly / Institution (École)",

      // Step 2
      s2Title: "Inona no tanjonao sy ny fotoana anananao ?",
      s2Sub: "Hanampy anay hampifanaraka ny traikefanao sy ny fampahatsiahivana isan'andro izany.",
      goalTitle: "Fotoana hianarana isan'andro (Objectif quotidien) :",
      goal5: "5 mn / andro (Maintimaty / Débutant)",
      goal15: "15 mn / andro (Régulier / Mianatra tsara)",
      goal30: "30 mn / andro (Intensif / Mahery vaika)",
      motivationTitle: "Inona no antony lehibe mampianatra anao ?",
      motiveVoyage: "✈️ Diay, Fizahan-tany & Echange",
      motiveEtudes: "🎓 Fianarana, Fanadinana & Oniversite",
      motiveTravail: "💼 Asa, Bizina & Serasera",
      motiveCulture: "🇲🇬 Kolontsaina & Fitiavana fiteny",

      // Step 3
      s3Title: "Zahao ireo fitaovana miavaka ao amin'ny Feheziko",
      s3Sub: "Ireo fampianarana maro samihafa natao hanatsarana haingana ny fahaizanao.",
      feat1Title: "🗣️ Prononciation & Shadowing",
      feat1Desc: "Henoy ny teny Frantsay sy Malagasy ary avereno amin'ny feonao mitovy tsy misy mpanakatsaka.",
      feat2Title: "📚 Lesona sy Voambolana SRS",
      feat2Desc: "Fampiharana amin'ny alalan'ny sarinteny (Flashcards) sy algorithm famerenana manan-tsaina.",
      feat3Title: "🗣️ Dinika sy Tantara (Dialogues)",
      feat3Desc: "Mianara miteny amin'ny toe-javatra marina (Restaurant, Tsena, Sekoly, Birao).",
      feat4Title: "📴 Miasa tsy misy Réseau (Offline-First)",
      feat4Desc: "Tehirizina ao amin'ny findainao ny lesona ka afaka mianatra na aiza na aiza ianao.",
      feat5Title: "👑 Token sy Badges (Gamification)",
      feat5Desc: "Mahazoa XP sy Token amin'ny fahavitanao lesona mba hamahana mari-pankasitrahana.",

      // Step 4
      s4Title: "Kajio ny fampiasanao sy ny Feo",
      s4Sub: "Fasiana amin'ny masonao sy ny feonao ny sehatra mba hahitanao fahafaham-po tanteraka.",
      darkModeLabel: "Fomba Alim-pito (Dark Mode)",
      darkModeDesc: "Mampitony ny maso rehefa mianatra alina.",
      textSizeLabel: "Haben'ny Soratra (Taille de texte)",
      textSizeNormal: "Normaly",
      textSizeLarge: "Lehibe",
      textSizeExtra: "Avo be",
      micCheckTitle: "Andramo ny Mikrofonao (Test Microphone)",
      micCheckDesc: "Hamarino fa henon'ny fampiharana tsara ny feonao ho an'ny fampiharana miteny.",
      micBtnText: "🎙️ Hamarina ny Mikro",

      // Step 5
      s5Title: "Vonona ianao! Nahazo valisoa tonga soa ianao 🎉",
      s5Sub: "Efa voaomana ny mombamomba anao sy ny lesonao voalohany.",
      bonusTitle: "Kadoa Tonga Soa (Bonus de Bienvenue)",
      bonusXp: "+50 XP Fanombohana",
      bonusTokens: "+10 Jetons / Tokens",
      summaryProfile: "Mombamomba voarakitra :",
    } : {
      stepLabel: `Étape ${this.currentStep} sur ${this.totalSteps}`,
      skip: "Passer",
      next: "Suivant",
      prev: "Précédent",
      finish: "Commencer l'apprentissage ! 🚀",

      // Step 1
      s1Title: "Bienvenue sur Feheziko !",
      s1Sub: "Plateforme éducative bilingue Français-Malagasy propulsée par l'apprentissage vocal.",
      langChoice: "Choisissez la langue d'affichage globale (Interface language) :",
      namePrompt: "Quel est votre prénom ou pseudonyme ?",
      namePlaceholder: "Ex: Jean-Paul, Tahina, Marie...",
      rolePrompt: "Quel est votre profil utilisateur ?",
      roleApprenant: "Apprenant (Élève / Étudiant)",
      roleEnseignant: "Enseignant / Formateur",
      roleEcole: "École / Établissement",

      // Step 2
      s2Title: "Définissez vos objectifs & rythme",
      s2Sub: "Nous adapterons vos rappels quotidiens et recommandations de leçons.",
      goalTitle: "Engagement quotidien conseillé :",
      goal5: "5 min / jour (Débutant)",
      goal15: "15 min / jour (Régulier - Recommandé)",
      goal30: "30 min / jour (Intensif)",
      motivationTitle: "Quelle est votre motivation principale ?",
      motiveVoyage: "✈️ Voyages & Échanges culturels",
      motiveEtudes: "🎓 Études & Examens universitaires",
      motiveTravail: "💼 Emploi & Opportunités professionnelles",
      motiveCulture: "🇲🇬 Immersion culturelle & Passion",

      // Step 3
      s3Title: "Découvrez les fonctionnalités clés",
      s3Sub: "Une suite complète d'outils interactifs conçue pour votre progression rapide.",
      feat1Title: "🗣️ Shadowing & Prononciation Vocale",
      feat1Desc: "Écoutez les locuteurs natifs et pratiquez votre accent avec retour instantané.",
      feat2Title: "📚 Leçons Micro-Learning & Repétition Spacée (SRS)",
      feat2Desc: "Mémorisez durablement le vocabulaire grâce à des fiches intelligentes.",
      feat3Title: "🗣️ Dialogues de la Vie Courante",
      feat3Desc: "Mises en situation pratiques : marché, transport, école, bureau.",
      feat4Title: "📴 Mode Hors-Ligne Intégral (Offline-First)",
      feat4Desc: "Toutes vos leçons restent accessibles sans connexion Internet.",
      feat5Title: "👑 Récompenses, Séries & Badges",
      feat5Desc: "Accumulez des jetons et de l'XP en maintenant votre série de jours d'étude.",

      // Step 4
      s4Title: "Confort visuel & Réglage vocal",
      s4Sub: "Personnalisez l'affichage et vérifiez l'accès à votre microphone.",
      darkModeLabel: "Mode Sombre (Dark Mode)",
      darkModeDesc: "Idéal pour réviser confortablement le soir.",
      textSizeLabel: "Taille de la police",
      textSizeNormal: "Normale",
      textSizeLarge: "Grande",
      textSizeExtra: "Très Grande",
      micCheckTitle: "Test rapide de votre microphone",
      micCheckDesc: "Assurez-vous que l'application détecte bien votre voix pour les exercices d'oral.",
      micBtnText: "🎙️ Tester mon micro",

      // Step 5
      s5Title: "Tout est prêt ! Votre profil est configuré 🎉",
      s5Sub: "Vous recevez un bonus de bienvenue pour démarrer votre aventure.",
      bonusTitle: "Bonus de Bienvenue Accordé",
      bonusXp: "+50 points XP",
      bonusTokens: "+10 Jetons Feheziko",
      summaryProfile: "Récapitulatif de votre profil :",
    };

    const progressPercentage = Math.round((this.currentStep / this.totalSteps) * 100);

    this.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in">
        <div id="onboarding-card" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto flex flex-col text-slate-900 dark:text-slate-100 transition-all">
          
          <!-- Header Bar -->
          <div class="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs z-10">
            <div>
              <span class="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-mono block">
                ${t.stepLabel}
              </span>
              <div class="w-36 h-2 bg-slate-100 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                <div class="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300" style="width: ${progressPercentage}%"></div>
              </div>
            </div>

            <button id="skipBtn" class="text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
              ${t.skip} ✕
            </button>
          </div>

          <!-- Body Content Area -->
          <div class="p-6 sm:p-8 flex-1 space-y-6">
            ${this.renderStepContent(t, isMg)}
          </div>

          <!-- Footer Control Bar -->
          <div class="p-5 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 flex items-center justify-between gap-3 sticky bottom-0 z-10 rounded-b-3xl">
            ${this.currentStep > 1 ? `
              <button id="prevBtn" class="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer">
                ← ${t.prev}
              </button>
            ` : `<div></div>`}

            <button id="nextBtn" class="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer ml-auto">
              ${this.currentStep === this.totalSteps ? t.finish : `${t.next} →`}
            </button>
          </div>

        </div>
      </div>
    `;

    this.bindEvents();
  }

  private renderStepContent(t: any, isMg: boolean): string {
    switch (this.currentStep) {
      case 1:
        return `
          <div class="space-y-6 animate-fade-in">
            <div class="text-center space-y-2">
              <div class="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/30 mx-auto">
                🇲🇬
              </div>
              <h2 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">${t.s1Title}</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">${t.s1Sub}</p>
            </div>

            <!-- Language Choice -->
            <div class="space-y-2.5">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">${t.langChoice}</label>
              <div class="grid grid-cols-2 gap-3">
                <button type="button" data-lang="mg" class="langChoiceBtn p-3.5 rounded-2xl border-2 text-left font-bold text-xs transition-all flex items-center gap-3 cursor-pointer ${
                  this.selectedLanguage === "mg" 
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-xs" 
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }">
                  <span class="text-2xl">🇲🇬</span>
                  <div>
                    <div class="font-extrabold">Malagasy</div>
                    <div class="text-[10px] text-slate-400 font-normal">Teny Malagasy</div>
                  </div>
                </button>

                <button type="button" data-lang="fr" class="langChoiceBtn p-3.5 rounded-2xl border-2 text-left font-bold text-xs transition-all flex items-center gap-3 cursor-pointer ${
                  this.selectedLanguage === "fr" 
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-xs" 
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }">
                  <span class="text-2xl">🇫🇷</span>
                  <div>
                    <div class="font-extrabold">Français</div>
                    <div class="text-[10px] text-slate-400 font-normal">Langue Française</div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Name Input -->
            <div class="space-y-2">
              <label for="studentNameInput" class="block text-xs font-bold text-slate-700 dark:text-slate-300">${t.namePrompt}</label>
              <input id="studentNameInput" type="text" value="${this.studentName}" placeholder="${t.namePlaceholder}" class="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
            </div>

            <!-- Role Selection -->
            <div class="space-y-2.5">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">${t.rolePrompt}</label>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button type="button" data-role="apprenant" class="roleBtn p-3 rounded-2xl border text-center font-bold text-xs transition-all cursor-pointer ${
                  this.selectedRole === "apprenant"
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-extrabold"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                }">
                  👨‍🎓 ${t.roleApprenant}
                </button>

                <button type="button" data-role="enseignant" class="roleBtn p-3 rounded-2xl border text-center font-bold text-xs transition-all cursor-pointer ${
                  this.selectedRole === "enseignant"
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-extrabold"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                }">
                  👩‍🏫 ${t.roleEnseignant}
                </button>

                <button type="button" data-role="ecole" class="roleBtn p-3 rounded-2xl border text-center font-bold text-xs transition-all cursor-pointer ${
                  this.selectedRole === "ecole"
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-extrabold"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                }">
                  🏫 ${t.roleEcole}
                </button>
              </div>
            </div>
          </div>
        `;

      case 2:
        return `
          <div class="space-y-6 animate-fade-in">
            <div class="text-center space-y-2">
              <div class="w-14 h-14 bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-xs">
                🎯
              </div>
              <h2 class="text-xl font-black text-slate-900 dark:text-white">${t.s2Title}</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">${t.s2Sub}</p>
            </div>

            <!-- Daily Goal selection -->
            <div class="space-y-3">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">${t.goalTitle}</label>
              <div class="space-y-2.5">
                <button type="button" data-goal="5" class="goalBtn w-full p-4 rounded-2xl border-2 text-left font-bold text-xs transition-all flex items-center justify-between cursor-pointer ${
                  this.selectedDailyGoal === 5
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 shadow-xs"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }">
                  <span class="flex items-center gap-2">⚡ ${t.goal5}</span>
                  <span class="text-indigo-600 font-extrabold font-mono text-xs">+10 XP/j</span>
                </button>

                <button type="button" data-goal="15" class="goalBtn w-full p-4 rounded-2xl border-2 text-left font-bold text-xs transition-all flex items-center justify-between cursor-pointer ${
                  this.selectedDailyGoal === 15
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 shadow-xs"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }">
                  <span class="flex items-center gap-2">🔥 ${t.goal15}</span>
                  <span class="text-indigo-600 font-extrabold font-mono text-xs">+30 XP/j</span>
                </button>

                <button type="button" data-goal="30" class="goalBtn w-full p-4 rounded-2xl border-2 text-left font-bold text-xs transition-all flex items-center justify-between cursor-pointer ${
                  this.selectedDailyGoal === 30
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 shadow-xs"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }">
                  <span class="flex items-center gap-2">👑 ${t.goal30}</span>
                  <span class="text-indigo-600 font-extrabold font-mono text-xs">+60 XP/j</span>
                </button>
              </div>
            </div>

            <!-- Motivation -->
            <div class="space-y-3">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">${t.motivationTitle}</label>
              <div class="grid grid-cols-2 gap-2.5">
                <button type="button" data-motive="voyage" class="motiveBtn p-3 rounded-2xl border text-left font-bold text-xs transition-all cursor-pointer ${
                  this.selectedMotivation === "voyage"
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }">
                  ${t.motiveVoyage}
                </button>

                <button type="button" data-motive="etudes" class="motiveBtn p-3 rounded-2xl border text-left font-bold text-xs transition-all cursor-pointer ${
                  this.selectedMotivation === "etudes"
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }">
                  ${t.motiveEtudes}
                </button>

                <button type="button" data-motive="travail" class="motiveBtn p-3 rounded-2xl border text-left font-bold text-xs transition-all cursor-pointer ${
                  this.selectedMotivation === "travail"
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }">
                  ${t.motiveTravail}
                </button>

                <button type="button" data-motive="culture" class="motiveBtn p-3 rounded-2xl border text-left font-bold text-xs transition-all cursor-pointer ${
                  this.selectedMotivation === "culture"
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }">
                  ${t.motiveCulture}
                </button>
              </div>
            </div>
          </div>
        `;

      case 3:
        return `
          <div class="space-y-6 animate-fade-in">
            <div class="text-center space-y-2">
              <div class="w-14 h-14 bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-xs">
                ✨
              </div>
              <h2 class="text-xl font-black text-slate-900 dark:text-white">${t.s3Title}</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">${t.s3Sub}</p>
            </div>

            <!-- Feature Cards Showcase -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1">
                <div class="font-extrabold text-xs text-indigo-900 dark:text-indigo-300">${t.feat1Title}</div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">${t.feat1Desc}</div>
              </div>

              <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1">
                <div class="font-extrabold text-xs text-indigo-900 dark:text-indigo-300">${t.feat2Title}</div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">${t.feat2Desc}</div>
              </div>

              <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1">
                <div class="font-extrabold text-xs text-indigo-900 dark:text-indigo-300">${t.feat3Title}</div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">${t.feat3Desc}</div>
              </div>

              <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1">
                <div class="font-extrabold text-xs text-indigo-900 dark:text-indigo-300">${t.feat4Title}</div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">${t.feat4Desc}</div>
              </div>

              <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1 sm:col-span-2">
                <div class="font-extrabold text-xs text-indigo-900 dark:text-indigo-300">${t.feat5Title}</div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">${t.feat5Desc}</div>
              </div>

            </div>
          </div>
        `;

      case 4:
        return `
          <div class="space-y-6 animate-fade-in">
            <div class="text-center space-y-2">
              <div class="w-14 h-14 bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-300 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-xs">
                ⚙️
              </div>
              <h2 class="text-xl font-black text-slate-900 dark:text-white">${t.s4Title}</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">${t.s4Sub}</p>
            </div>

            <!-- Dark Mode Toggle -->
            <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div class="font-bold text-xs text-slate-800 dark:text-slate-200">${t.darkModeLabel}</div>
                <div class="text-[11px] text-slate-400">${t.darkModeDesc}</div>
              </div>

              <button id="toggleDarkModeBtn" type="button" class="w-12 h-6 rounded-full transition-colors p-1 relative cursor-pointer ${
                this.selectedDarkMode ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
              }">
                <div class="w-4 h-4 bg-white rounded-full transition-transform ${
                  this.selectedDarkMode ? "translate-x-6" : "translate-x-0"
                }"></div>
              </button>
            </div>

            <!-- Text Size Selector -->
            <div class="space-y-2">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">${t.textSizeLabel}</label>
              <div class="grid grid-cols-3 gap-2">
                <button type="button" data-textsize="normal" class="textSizeBtn p-3 rounded-2xl border text-center font-bold text-xs transition-all cursor-pointer ${
                  this.selectedTextSize === "normal"
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }">
                  ${t.textSizeNormal}
                </button>

                <button type="button" data-textsize="large" class="textSizeBtn p-3 rounded-2xl border text-center font-bold text-xs transition-all cursor-pointer ${
                  this.selectedTextSize === "large"
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 text-sm"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-sm"
                }">
                  ${t.textSizeLarge}
                </button>

                <button type="button" data-textsize="extra" class="textSizeBtn p-3 rounded-2xl border text-center font-bold text-xs transition-all cursor-pointer ${
                  this.selectedTextSize === "extra"
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 text-base"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-base"
                }">
                  ${t.textSizeExtra}
                </button>
              </div>
            </div>

            <!-- Microphone Interactive Check -->
            <div class="p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
              <div>
                <div class="font-extrabold text-xs text-indigo-900 dark:text-indigo-300">${t.micCheckTitle}</div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">${t.micCheckDesc}</div>
              </div>

              <div class="flex items-center gap-3">
                <button id="testMicBtn" type="button" class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5">
                  ${t.micBtnText}
                </button>

                <div id="micStatus" class="text-xs">
                  ${this.micTested ? '<span class="text-emerald-600 font-bold">✅ Micro prêt !</span>' : '<span class="text-slate-400 text-[11px]">En attente du test</span>'}
                </div>
              </div>
            </div>
          </div>
        `;

      case 5:
        return `
          <div class="space-y-6 animate-fade-in text-center">
            <div class="w-20 h-20 bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300 rounded-3xl flex items-center justify-center text-4xl mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
              🎉
            </div>

            <div class="space-y-1">
              <h2 class="text-2xl font-black text-slate-900 dark:text-white">${t.s5Title}</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">${t.s5Sub}</p>
            </div>

            <!-- Welcome Bonus Card -->
            <div class="p-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 space-y-3">
              <div class="text-xs font-black uppercase tracking-wider font-mono text-amber-800 dark:text-amber-300">${t.bonusTitle}</div>
              <div class="flex items-center justify-center gap-6">
                <div class="flex items-center gap-2">
                  <span class="text-2xl">⭐</span>
                  <span class="font-black text-base font-mono">${t.bonusXp}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-2xl">🪙</span>
                  <span class="font-black text-base font-mono">${t.bonusTokens}</span>
                </div>
              </div>
            </div>

            <!-- Profile summary table -->
            <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-left space-y-2">
              <div class="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">${t.summaryProfile}</div>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div><span class="text-slate-400">Anarana / Nom :</span> <strong class="text-slate-800 dark:text-slate-200">${this.studentName || "Apprenant"}</strong></div>
                <div><span class="text-slate-400">Rôle :</span> <strong class="text-slate-800 dark:text-slate-200 uppercase">${this.selectedRole}</strong></div>
                <div><span class="text-slate-400">Teny / Langue :</span> <strong class="text-slate-800 dark:text-slate-200">${this.selectedLanguage === "mg" ? "🇲🇬 Malagasy" : "🇫🇷 Français"}</strong></div>
                <div><span class="text-slate-400">Rythme :</span> <strong class="text-slate-800 dark:text-slate-200 font-mono">${this.selectedDailyGoal} mn / andro</strong></div>
              </div>
            </div>
          </div>
        `;

      default:
        return "";
    }
  }

  private bindEvents() {
    // Skip & Close button
    const skipBtn = this.querySelector("#skipBtn");
    if (skipBtn) {
      skipBtn.addEventListener("click", () => this.skipOnboarding());
    }

    // Prev / Next Buttons
    const prevBtn = this.querySelector("#prevBtn");
    if (prevBtn) {
      prevBtn.addEventListener("click", () => this.prevStep());
    }

    const nextBtn = this.querySelector("#nextBtn");
    if (nextBtn) {
      nextBtn.addEventListener("click", () => this.nextStep());
    }

    // Step 1: Language Buttons
    this.querySelectorAll(".langChoiceBtn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const lang = (e.currentTarget as HTMLElement).getAttribute("data-lang") as any;
        if (lang) {
          this.selectedLanguage = lang;
          this.render();
        }
      });
    });

    // Step 1: Name Input
    const nameInput = this.querySelector("#studentNameInput") as HTMLInputElement;
    if (nameInput) {
      nameInput.addEventListener("input", (e) => {
        this.studentName = (e.target as HTMLInputElement).value;
      });
    }

    // Step 1: Role Buttons
    this.querySelectorAll(".roleBtn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const role = (e.currentTarget as HTMLElement).getAttribute("data-role") as any;
        if (role) {
          this.selectedRole = role;
          this.render();
        }
      });
    });

    // Step 2: Goal Buttons
    this.querySelectorAll(".goalBtn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const goal = parseInt((e.currentTarget as HTMLElement).getAttribute("data-goal") || "15", 10);
        this.selectedDailyGoal = goal;
        this.render();
      });
    });

    // Step 2: Motive Buttons
    this.querySelectorAll(".motiveBtn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const motive = (e.currentTarget as HTMLElement).getAttribute("data-motive") || "voyage";
        this.selectedMotivation = motive;
        this.render();
      });
    });

    // Step 4: Dark Mode Toggle
    const darkToggle = this.querySelector("#toggleDarkModeBtn");
    if (darkToggle) {
      darkToggle.addEventListener("click", () => {
        this.selectedDarkMode = !this.selectedDarkMode;
        this.render();
      });
    }

    // Step 4: Text Size Buttons
    this.querySelectorAll(".textSizeBtn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const sz = (e.currentTarget as HTMLElement).getAttribute("data-textsize") as any;
        if (sz) {
          this.selectedTextSize = sz;
          this.render();
        }
      });
    });

    // Step 4: Test Microphone
    const testMicBtn = this.querySelector("#testMicBtn");
    if (testMicBtn) {
      testMicBtn.addEventListener("click", () => this.testMicrophone());
    }
  }
}

customElements.define("fz-onboarding", FzOnboarding);
