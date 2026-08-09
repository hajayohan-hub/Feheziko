/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseEngine } from "../core/DatabaseEngine";

export interface TourStep {
  id: string;
  targetId: string;
  tab: string;
  icon: string;
  badge: { mg: string; fr: string };
  title: { mg: string; fr: string };
  description: { mg: string; fr: string };
  tip: { mg: string; fr: string };
}

export class FzGuidedTour extends HTMLElement {
  private db!: DatabaseEngine;
  private isVisible: boolean = false;
  private currentStepIndex: number = 0;
  private language: "mg" | "fr" = "mg";
  private highlightedElement: HTMLElement | null = null;

  private steps: TourStep[] = [
    {
      id: "welcome",
      targetId: "root",
      tab: "dashboard",
      icon: "🚀",
      badge: { mg: "Fampidirana", fr: "Bienvenue" },
      title: {
        mg: "Tongasoa eto amin'ny Feheziko!",
        fr: "Bienvenue sur la plateforme Feheziko !"
      },
      description: {
        mg: "Feheziko dia sehatra feno sy maoderina hianarana sy hampianarana ny teny frantsay am-bava eto Madagasikara. Hijery haingana ireo fitaovana lehibe misy eto ve ianao?",
        fr: "Feheziko est la plateforme interactive conçue pour maîtriser le français parlé à Madagascar. Laissez-vous guider à travers les fonctionnalités clés."
      },
      tip: {
        mg: "Mandeha tsara na tsy misy Internet (Offline-First) koa ny Feheziko!",
        fr: "Feheziko fonctionne parfaitement hors-ligne grâce au mode Offline-First."
      }
    },
    {
      id: "dashboard",
      targetId: "nav-dashboard",
      tab: "dashboard",
      icon: "📊",
      badge: { mg: "Tabilao Fandraisana", fr: "Tableau de Bord" },
      title: {
        mg: "Tabilao & Fandrosoana (Dashboard)",
        fr: "Tableau de Bord & Suivi Quotidien"
      },
      description: {
        mg: "Eto amin'ny Tabilao no hahitanao ny antontan'isa momba anao: andro nifanojo (🔥 Streak), teboka XP ambaratonga, tanjona isan'andro, ary ny toe-javatra synchronisation an-drindrina.",
        fr: "Consultez vos statistiques en temps réel : jours consécutifs (🔥 Streak), niveau d'expérience XP, objectif quotidien et statut de synchronisation."
      },
      tip: {
        mg: "Araho isan'andro ny serie 🔥 mba hahazoana badge ambaratonga ambony!",
        fr: "Conservez votre série 🔥 chaque jour pour débloquer des badges exclusifs !"
      }
    },
    {
      id: "lessons",
      targetId: "nav-lessons",
      tab: "lessons",
      icon: "📚",
      badge: { mg: "Lesona Structurés", fr: "Cours & Grammaire" },
      title: {
        mg: "Lesona & Gramatika (A1 - B2)",
        fr: "Leçons Structurées & Grammaire"
      },
      description: {
        mg: "Diniho ireo lesona nalamina araka ny ambaratonga (A1 hatramin'ny B2). Misy feo vakina amin'ny teny frantsay, fitsipika mazava, ary fanazaran-tena amin'ny teny sy soratra.",
        fr: "Progressez à votre rythme grâce aux parcours certifiants A1 à B2, dotés de synthèses vocales, fiches grammaticales et quizz immersifs."
      },
      tip: {
        mg: "Azonao atao ny mihaino ny feo miverimberina mba hanatsarana ny fanononana.",
        fr: "Réécoutiez les phrases audio autant de fois que nécessaire pour perfectionner votre accent."
      }
    },
    {
      id: "dialogues",
      targetId: "nav-dialogues",
      tab: "dialogues",
      icon: "💬",
      badge: { mg: "Resaka Praktika", fr: "Dialogues Immersifs" },
      title: {
        mg: "Resaka & Mises en Situation",
        fr: "Dialogues Interactifs du Quotidien"
      },
      description: {
        mg: "Mianara miteny amin'ny alalan'ny resaka marina amin'ny fiainana andavanandro: eny amin'ny Tsena, Sekoly, Birao, na Fandraisana Taksy miaraka amin'ny fandikan-teny sy feo.",
        fr: "Incarnez des personnages dans des scènes de la vie courante (Marché, École, Bureau, Transport) avec synthèse vocale bilingue et mode d'écoute pas à pas."
      },
      tip: {
        mg: "Mampiasà bouton microphone mba hamerenana sy hitiliana ny feonao!",
        fr: "Activez le bouton micro pour tester directement votre prononciation orale."
      }
    },
    {
      id: "dictionary",
      targetId: "nav-dictionary",
      tab: "dictionary",
      icon: "📖",
      badge: { mg: "Rakibolana Telo Teny", fr: "Dictionnaire Trilingue" },
      title: {
        mg: "Rakibolana Malagasy - Français - English",
        fr: "Dictionnaire Trilingue Réactif"
      },
      description: {
        mg: "Fitadiavana teny haingana am-bava na an-tsoratra. Misy ny fanononana audio, ohatra fehezanteny, ary fahafahana mitahiry ireo teny sarotra aminao (Bookmarks).",
        fr: "Recherchez instantanément des mots en malgache, français ou anglais, écoutez l'audio native, utilisez la recherche vocale et enregistrez vos favoris."
      },
      tip: {
        mg: "Azonao ampiasaina am-bava ny fitadiavana teny na dia tsy manao saisie aza!",
        fr: "Utilisez la recherche vocale pour trouver un mot simplement en le prononçant."
      }
    },
    {
      id: "challenges",
      targetId: "nav-challenges",
      tab: "challenges",
      icon: "🏆",
      badge: { mg: "Lalao & Flashcards", fr: "Défis & Quizz" },
      title: {
        mg: "Fanamby, Flashcards & Quizz",
        fr: "Défis Chronométrés & Flashcards"
      },
      description: {
        mg: "Whizz mampiasa ny fomba SRS (Répétition espacée) hampiorina ny voambolana ao an-doha. Misy Quizz haingana sy lalao isan'andro hampitomboana XP.",
        fr: "Boostez votre mémoire sur le long terme avec nos cartes mémoire intelligent (SRS), nos quizz chronométrés et nos mini-jeux stimulants."
      },
      tip: {
        mg: "Mamorona fahazarana 15 minitra isan'andro miaraka amin'ny Flashcards!",
        fr: "Consacrez 15 minutes par jour aux Flashcards pour mémoriser 500+ mots par mois."
      }
    },
    {
      id: "delf",
      targetId: "nav-delf",
      tab: "delf",
      icon: "🎓",
      badge: { mg: "Examen Official", fr: "Préparation DELF" },
      title: {
        mg: "Fanomanana Fanadinana DELF",
        fr: "Simulateur d'Examen DELF Officiel"
      },
      description: {
        mg: "Manaova simulation d'examen feno ho an'ny DELF Prim, Junior, ary Tout Public. Misy fanisana naoty avy hatrany sy valiny amin'ny antsipiriany.",
        fr: "Mettez-vous en conditions réelles d'examen avec des sujets DELF officiels, un suivi de chrono strict, la notation automatique et des corrigés détaillés."
      },
      tip: {
        mg: "Valio feno ireo épreuves Compréhension Orale & Écrite hahafahanao mandray diplôma!",
        fr: "Complétez les épreuves de compréhension orale et écrite pour évaluer votre niveau officiel."
      }
    },
    {
      id: "admin",
      targetId: "nav-admin",
      tab: "admin",
      icon: "🛡️",
      badge: { mg: "Sekoly & Mpampianatra", fr: "Espace Admin & Écoles" },
      title: {
        mg: "Fitantanana Sekoly & Mpampianatra (Admin)",
        fr: "Administration Multi-Établissements"
      },
      description: {
        mg: "Sehatra natokana ho an'ny Sekoly, Lycée, sy Mpampianatra mba hitantanana kilasy, hanalavana ny andro Essai Gratuit (5 andro), ary hampiharana ny abonnements.",
        fr: "Espace de gestion dédié aux établissements et enseignants : inscrivez des classes, prolongez les essais gratuits (5 jours) et validez les souscriptions Mobile Money."
      },
      tip: {
        mg: "Azonao ampidirina eto koa ny kaody sekoly (School Code) hanakambanana mpianatra!",
        fr: "Générez et attribuez des codes écoles pour rattacher facilement vos élèves."
      }
    }
  ];

  constructor() {
    super();
  }

  connectedCallback() {
    this.db = (window as any).feheziko?.db;
    
    // Check saved language preference
    if (this.db) {
      const progress = this.db.getProgress();
      if (progress.accessibility?.language) {
        this.language = progress.accessibility.language;
      }
    }

    // Check if user has already completed tour
    const tourCompleted = localStorage.getItem("feheziko_tour_completed") === "true";
    if (!tourCompleted) {
      // Auto trigger tour 1.2s after loading if onboarding is already completed
      setTimeout(() => {
        if (this.db) {
          const prog = this.db.getProgress();
          if (prog.onboardingCompleted && !this.isVisible) {
            this.startTour();
          }
        }
      }, 1200);
    }

    // Listen to global trigger event to start guided tour anytime
    window.addEventListener("feheziko_start_guided_tour", () => {
      this.startTour();
    });

    // Listen to state changes to update language if switched
    window.addEventListener("feheziko_state_changed", () => {
      if (this.db) {
        const prog = this.db.getProgress();
        if (prog.accessibility?.language && prog.accessibility.language !== this.language) {
          this.language = prog.accessibility.language;
          if (this.isVisible) this.render();
        }
      }
    });

    this.render();
  }

  public startTour(stepIndex: number = 0) {
    this.isVisible = true;
    this.currentStepIndex = Math.max(0, Math.min(stepIndex, this.steps.length - 1));
    this.goToStep(this.currentStepIndex);
  }

  public endTour() {
    this.isVisible = false;
    this.removeHighlight();
    localStorage.setItem("feheziko_tour_completed", "true");
    this.render();
  }

  private goToStep(index: number) {
    if (index < 0 || index >= this.steps.length) return;
    this.currentStepIndex = index;
    const step = this.steps[this.currentStepIndex];

    // Automatically switch active tab in app so user sees section in action
    if ((window as any).feheziko?.navigate && step.tab) {
      (window as any).feheziko.navigate(step.tab);
    }

    // Update target highlight
    this.applyHighlight(step.targetId);
    this.render();
  }

  private nextStep() {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.goToStep(this.currentStepIndex + 1);
    } else {
      this.endTour();
    }
  }

  private prevStep() {
    if (this.currentStepIndex > 0) {
      this.goToStep(this.currentStepIndex - 1);
    }
  }

  private toggleLanguage() {
    this.language = this.language === "mg" ? "fr" : "mg";
    if (this.db) {
      this.db.updateAccessibility({ language: this.language });
    }
    this.render();
  }

  private applyHighlight(targetId: string) {
    this.removeHighlight();
    if (targetId === "root") return;

    // Search element in document
    const el = document.getElementById(targetId);
    if (el) {
      this.highlightedElement = el;
      el.classList.add("ring-4", "ring-amber-500", "dark:ring-amber-400", "shadow-xl", "z-50", "relative", "animate-pulse");
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }

  private removeHighlight() {
    if (this.highlightedElement) {
      this.highlightedElement.classList.remove(
        "ring-4",
        "ring-amber-500",
        "dark:ring-amber-400",
        "shadow-xl",
        "z-50",
        "relative",
        "animate-pulse"
      );
      this.highlightedElement = null;
    }
  }

  private render() {
    if (!this.isVisible) {
      this.innerHTML = "";
      return;
    }

    const step = this.steps[this.currentStepIndex];
    const isFirst = this.currentStepIndex === 0;
    const isLast = this.currentStepIndex === this.steps.length - 1;
    const progressPct = Math.round(((this.currentStepIndex + 1) / this.steps.length) * 100);

    const labels = {
      stepOf: this.language === "mg" 
        ? `Dingana ${this.currentStepIndex + 1} amin'ny ${this.steps.length}` 
        : `Étape ${this.currentStepIndex + 1} sur ${this.steps.length}`,
      skip: this.language === "mg" ? "Mandalo tour" : "Passer la visite",
      prev: this.language === "mg" ? "Miverina" : "Précédent",
      next: this.language === "mg" ? "Manaraka" : "Suivant",
      finish: this.language === "mg" ? "Vita, Ndao hianatra!" : "Terminer et Explorer",
      tryNow: this.language === "mg" ? "Andramo ankehitriny" : "Tester cette section"
    };

    this.innerHTML = `
      <!-- Tour Dark Backdrop Overlay -->
      <div class="fixed inset-0 bg-slate-900/65 dark:bg-slate-950/80 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 sm:p-6 animate-fade-in transition-all">
        
        <!-- Guided Popover Modal Container -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col relative transition-all duration-300 transform scale-100 animate-scale-up">
          
          <!-- Top Accent Color Bar -->
          <div class="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500"></div>

          <!-- Popover Header -->
          <div class="p-4 sm:p-5 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center space-x-2.5">
              <span class="text-2xl p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
                ${step.icon}
              </span>
              <div>
                <div class="flex items-center space-x-2">
                  <span class="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800">
                    ${step.badge[this.language]}
                  </span>
                  <span class="text-xs font-semibold text-slate-400 dark:text-slate-500">
                    ${labels.stepOf}
                  </span>
                </div>
                <h3 class="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5 leading-snug">
                  ${step.title[this.language]}
                </h3>
              </div>
            </div>

            <!-- Header Controls: Language Switcher & Close -->
            <div class="flex items-center space-x-1.5 shrink-0">
              <button id="tourLangBtn" class="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-700"
                      title="Changer de langue / Hanova fiteny">
                ${this.language === "mg" ? "🇲🇬 MG" : "🇫🇷 FR"}
              </button>
              <button id="tourCloseBtn" class="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950 hover:text-rose-600 dark:hover:text-rose-400 text-slate-400 transition-colors cursor-pointer"
                      title="Fermer la visite">
                ✕
              </button>
            </div>
          </div>

          <!-- Step Progress Line -->
          <div class="w-full bg-slate-100 dark:bg-slate-800 h-1">
            <div class="bg-indigo-600 dark:bg-indigo-500 h-1 transition-all duration-300" style="width: ${progressPct}%"></div>
          </div>

          <!-- Popover Body Content -->
          <div class="p-5 sm:p-6 space-y-4 text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
            <p class="font-normal text-slate-600 dark:text-slate-300">
              ${step.description[this.language]}
            </p>

            <!-- Pro-Tip Callout Box -->
            <div class="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl p-3.5 flex items-start space-x-3 text-xs sm:text-sm">
              <span class="text-lg shrink-0">💡</span>
              <div class="text-amber-900 dark:text-amber-200 font-medium">
                <span class="font-bold block uppercase text-[10px] tracking-wider text-amber-700 dark:text-amber-400 mb-0.5">
                  ${this.language === "mg" ? "Soso-kevitra kely" : "Astuce Feheziko"}
                </span>
                ${step.tip[this.language]}
              </div>
            </div>

            <!-- Interactive Quick Feature Selector Pills -->
            <div class="pt-2 flex flex-wrap gap-1.5 items-center justify-start border-t border-slate-100 dark:border-slate-800/80">
              <span class="text-xs font-bold text-slate-400 dark:text-slate-500 mr-1">
                ${this.language === "mg" ? "Misy koa:" : "Aperçu:"}
              </span>
              ${this.steps.map((s, idx) => `
                <button data-step-idx="${idx}" class="tour-dot-btn px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  idx === this.currentStepIndex
                    ? "bg-indigo-600 text-white shadow-xs scale-105"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }">
                  ${s.icon} <span class="hidden xs:inline">${s.badge[this.language]}</span>
                </button>
              `).join("")}
            </div>
          </div>

          <!-- Popover Footer Action Controls -->
          <div class="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <!-- Left: Skip Button -->
            <button id="tourSkipBtn" class="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer px-2 py-1">
              ${labels.skip}
            </button>

            <!-- Right: Prev / Next / Finish Controls -->
            <div class="flex items-center space-x-2">
              ${
                !isFirst
                  ? `<button id="tourPrevBtn" class="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-2xs active:scale-95">
                      ← ${labels.prev}
                    </button>`
                  : ""
              }

              <button id="tourNextBtn" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs sm:text-sm font-extrabold transition-all cursor-pointer shadow-md shadow-indigo-200 dark:shadow-none active:scale-95 flex items-center space-x-1">
                <span>${isLast ? labels.finish : labels.next}</span>
                <span>${isLast ? "🚀" : "→"}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    `;

    // Bindings
    this.querySelector("#tourLangBtn")?.addEventListener("click", () => this.toggleLanguage());
    this.querySelector("#tourCloseBtn")?.addEventListener("click", () => this.endTour());
    this.querySelector("#tourSkipBtn")?.addEventListener("click", () => this.endTour());
    this.querySelector("#tourPrevBtn")?.addEventListener("click", () => this.prevStep());
    this.querySelector("#tourNextBtn")?.addEventListener("click", () => this.nextStep());

    // Dot step navigation buttons
    this.querySelectorAll(".tour-dot-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        const idx = parseInt(target.getAttribute("data-step-idx") || "0", 10);
        this.goToStep(idx);
      });
    });
  }
}

customElements.define("fz-guided-tour", FzGuidedTour);
