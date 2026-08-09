/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseEngine } from "../core/DatabaseEngine";

export class FzPayment extends HTMLElement {
  private db!: DatabaseEngine;
  private selectedProvider: "mvola" | "airtel" | "orange" | "card" = "mvola";
  private selectedPlan: "monthly" | "yearly" = "monthly";
  private payLoading: boolean = false;
  private loadLog: string = "";

  constructor() {
    super();
  }

  connectedCallback() {
    this.db = (window as any).feheziko?.db;
    this.render();

    window.addEventListener("feheziko_state_changed", () => {
      this.render();
    });
  }

  private render() {
    if (!this.db) return;

    const progress = this.db.getProgress();
    const isMg = progress.accessibility.language === "mg";
    const t = isMg ? {
      title: "Hidirana ao amin'ny Feheziko Premium",
      subtitle: "Sokafy ny fahaiza-manao rehetra tsy misy fetra, na dia tsy misy internet aza.",
      perksTitle: "Ireo tombontsoa manokana (Avantages Premium) :",
      perk1: "Sivana feno offline: Fampiasana ny lesona rehetra na aiza na aiza.",
      perk2: "Mpanampy feo AI: Fampitahana fitenena tsara kokoa miaraka amin'ny naoty marina.",
      perk3: "Diploma & Certification: Taratasy fanamarinana fivoarana A1, A2 ho an'ny sekoly na orinasa.",
      perk4: "Tsy misy dokam-barotra: Fianarana milamina tsara.",
      choosePlan: "Fidio ny tolotra mifanaraka aminao :",
      monthly: "Tolotra isam-bolana (Mensuel)",
      yearly: "Tolotra herintaona (Annuel)",
      yearlySave: "Mitsitsy 20%",
      phoneLabel: "Laharana finday (Mobile Money) na Karatra",
      payBtn: "Handoa vola (Payer)",
      successTitle: "Miarahaba anao! Efa Premium ianao izao.",
      successDesc: "Sokafy ny lesona rehetra ary mankafiza fampiofanana am-bava feno.",
      isAlreadyPremium: "Efa manana kaonty Premium feno ianao hatramin'ny:",
      promoPlaceholder: "Rakitra promo...",
      applyPromo: "Ampiharo"
    } : {
      title: "Passer à Feheziko Premium",
      subtitle: "Débloquez tout le potentiel sans aucune limite, même hors-ligne.",
      perksTitle: "Avantages exclusifs Premium :",
      perk1: "Accès 100% hors-ligne de toutes les leçons.",
      perk2: "Moteur d'évaluation phonétique avancé assisté par IA.",
      perk3: "Certificat de réussite A1/A2 formel pour écoles et entreprises.",
      perk4: "Zéro publicité pour une concentration absolue.",
      choosePlan: "Choisissez votre forfait :",
      monthly: "Abonnement Mensuel",
      yearly: "Abonnement Annuel",
      yearlySave: "Économisez 20%",
      phoneLabel: "Numéro mobile ou carte bancaire",
      payBtn: "Payer maintenant",
      successTitle: "Félicitations ! Vous êtes Premium.",
      successDesc: "Toutes les fonctionnalités et leçons avancées sont débloquées.",
      isAlreadyPremium: "Vous possédez déjà une licence Premium active jusqu'au :",
      promoPlaceholder: "Code promo...",
      applyPromo: "Appliquer"
    };

    // Plans rates in Ariary (typical Madagascar currency)
    const priceMonthly = "15,000 Ar";
    const priceYearly = "144,000 Ar";

    const isPremium = progress.subscription.status === "premium";

    this.className = "block max-w-3xl mx-auto space-y-6";

    if (isPremium) {
      this.innerHTML = `
        <div class="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-6 shadow-xs">
          <span class="text-6xl animate-pulse inline-block">👑</span>
          <h2 class="text-3xl font-extrabold text-slate-900 tracking-tight">${t.successTitle}</h2>
          <p class="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">${t.successDesc}</p>

          <div class="bg-amber-50 border border-amber-100 p-4 rounded-2xl inline-block max-w-sm">
            <span class="text-xs font-mono font-bold text-amber-800">${t.isAlreadyPremium} <strong>30 Jona 2027</strong></span>
          </div>

          <div class="pt-6 border-t border-slate-100">
            <button onclick="window.feheziko.navigate('dashboard')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 px-6 rounded-xl transition-all shadow-md">
              📊 Hiverina amin'ny Dashboard
            </button>
          </div>
        </div>
      `;
      return;
    }

    this.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Benefits Left -->
        <div class="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white p-6 md:p-8 rounded-3xl flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div class="absolute right-0 top-0 opacity-5 pointer-events-none transform translate-x-12 -translate-y-6">
            <span class="text-9xl">👑</span>
          </div>
          <div>
            <span class="bg-indigo-500/30 text-indigo-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-indigo-400/20">Abonnement Pro</span>
            <h2 class="text-2xl font-extrabold mt-3 tracking-tight">${t.title}</h2>
            <p class="text-xs text-indigo-300 mt-1 leading-relaxed">${t.subtitle}</p>

            <div class="space-y-4.5 mt-8">
              <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-400">${t.perksTitle}</h4>
              <div class="flex items-start space-x-3 text-xs">
                <span class="text-indigo-400 mt-0.5">✓</span>
                <p class="leading-relaxed text-indigo-100">${t.perk1}</p>
              </div>
              <div class="flex items-start space-x-3 text-xs">
                <span class="text-indigo-400 mt-0.5">✓</span>
                <p class="leading-relaxed text-indigo-100">${t.perk2}</p>
              </div>
              <div class="flex items-start space-x-3 text-xs">
                <span class="text-indigo-400 mt-0.5">✓</span>
                <p class="leading-relaxed text-indigo-100">${t.perk3}</p>
              </div>
              <div class="flex items-start space-x-3 text-xs">
                <span class="text-indigo-400 mt-0.5">✓</span>
                <p class="leading-relaxed text-indigo-100">${t.perk4}</p>
              </div>
            </div>
          </div>

          <div class="pt-6 border-t border-indigo-800/60 mt-8 text-[10px] text-indigo-400 font-mono flex justify-between items-center">
            <span>Powered by secure Mobile API</span>
            <span>Mvola • Airtel • Orange</span>
          </div>
        </div>

        <!-- Checkout Form Right -->
        <div class="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between shadow-xs">
          <div class="space-y-5">
            <h3 class="font-bold text-slate-800 text-lg">${t.choosePlan}</h3>

            <!-- Plans Switcher -->
            <div class="grid grid-cols-2 gap-3">
              <button id="planMonthlyBtn" class="border p-4 rounded-2xl text-left transition-all relative ${
                this.selectedPlan === "monthly"
                  ? "border-indigo-600 bg-indigo-50/20 text-indigo-950 font-semibold"
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              }">
                <span class="text-[10px] font-bold uppercase text-slate-400 tracking-wider">${t.monthly}</span>
                <p class="text-lg font-black text-slate-800 mt-1">${priceMonthly}</p>
              </button>

              <button id="planYearlyBtn" class="border p-4 rounded-2xl text-left transition-all relative ${
                this.selectedPlan === "yearly"
                  ? "border-indigo-600 bg-indigo-50/20 text-indigo-950 font-semibold"
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              }">
                <span class="absolute -top-2.5 right-3 bg-emerald-500 text-white font-mono text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">${t.yearlySave}</span>
                <span class="text-[10px] font-bold uppercase text-slate-400 tracking-wider">${t.yearly}</span>
                <p class="text-lg font-black text-slate-800 mt-1">${priceYearly}</p>
              </button>
            </div>

            <!-- Provider Selection -->
            <div class="space-y-2">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fomba fandoavam-bola (Moyen de paiement)</span>
              <div class="grid grid-cols-4 gap-2">
                <button id="provMvola" class="p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                  this.selectedProvider === "mvola" ? "border-indigo-600 bg-indigo-50/20" : "border-slate-100 bg-slate-50 hover:bg-slate-100"
                }">
                  <span class="text-xs font-black text-amber-500 font-mono tracking-tight">Mvola</span>
                </button>
                <button id="provAirtel" class="p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                  this.selectedProvider === "airtel" ? "border-indigo-600 bg-indigo-50/20" : "border-slate-100 bg-slate-50 hover:bg-slate-100"
                }">
                  <span class="text-xs font-black text-rose-600 font-mono tracking-tight">airtel</span>
                </button>
                <button id="provOrange" class="p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                  this.selectedProvider === "orange" ? "border-indigo-600 bg-indigo-50/20" : "border-slate-100 bg-slate-50 hover:bg-slate-100"
                }">
                  <span class="text-xs font-black text-orange-500 font-mono tracking-tight">Orange</span>
                </button>
                <button id="provCard" class="p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                  this.selectedProvider === "card" ? "border-indigo-600 bg-indigo-50/20" : "border-slate-100 bg-slate-50 hover:bg-slate-100"
                }">
                  <span class="text-lg">💳</span>
                </button>
              </div>
            </div>

            <!-- Phone/Card Input -->
            <div class="space-y-1">
              <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">${t.phoneLabel}</label>
              <input id="paymentInput" type="text" placeholder="${this.selectedProvider === "card" ? "4000 1234 5678 9010" : "034 00 000 00"}" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>

            <!-- Promo Codes option -->
            <div class="flex space-x-2">
              <input id="promoInput" type="text" placeholder="${t.promoPlaceholder}" class="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              <button id="promoBtn" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 rounded-xl transition-colors border border-slate-200">${t.applyPromo}</button>
            </div>
          </div>

          <!-- Checkout logs loader simulation -->
          ${
            this.payLoading
              ? `
            <div class="mt-6 p-4 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 space-y-2">
              <div class="flex items-center space-x-2">
                <span class="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping"></span>
                <span class="text-xs font-mono font-bold text-indigo-400">Transaction en cours...</span>
              </div>
              <pre class="text-[10px] font-mono leading-normal text-slate-400 max-h-16 overflow-y-auto whitespace-pre-wrap">${this.loadLog}</pre>
            </div>
            `
              : `
            <button id="checkoutBtn" class="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 rounded-2xl transition-all shadow-md shadow-indigo-100">
              👑 ${t.payBtn}
            </button>
            `
          }
        </div>
      </div>
    `;

    // ADD BINDINGS & CLICK TRIGGERS
    const planMonthlyBtn = this.querySelector("#planMonthlyBtn");
    const planYearlyBtn = this.querySelector("#planYearlyBtn");

    planMonthlyBtn?.addEventListener("click", () => {
      this.selectedPlan = "monthly";
      this.render();
    });

    planYearlyBtn?.addEventListener("click", () => {
      this.selectedPlan = "yearly";
      this.render();
    });

    // Providers
    const provs = ["mvola", "airtel", "orange", "card"];
    provs.forEach(p => {
      this.querySelector(`#prov${p.charAt(0).toUpperCase() + p.slice(1)}`)?.addEventListener("click", () => {
        this.selectedProvider = p as any;
        this.render();
      });
    });

    // Promo code handler
    this.querySelector("#promoBtn")?.addEventListener("click", () => {
      const pin = this.querySelector("#promoInput") as HTMLInputElement;
      if (pin && pin.value.trim().toLowerCase() === "feheziko2026") {
        alert("Kaody mahomby! Nahazo fihenam-bidy 100% ianao ho fanandramana.");
        const payIn = this.querySelector("#paymentInput") as HTMLInputElement;
        if (payIn) payIn.value = "PROMO_CODE_VALID";
      } else {
        alert("Miala tsiny, diso io kaody io.");
      }
    });

    // Checkout simulate
    this.querySelector("#checkoutBtn")?.addEventListener("click", () => {
      this.handlePaymentSimulation();
    });
  }

  private handlePaymentSimulation() {
    const payIn = this.querySelector("#paymentInput") as HTMLInputElement;
    if (!payIn || !payIn.value.trim()) {
      alert("Fenoy ny laharana finday na karatra handoavana vola azafady.");
      return;
    }

    this.payLoading = true;
    this.loadLog = "Mampifandray amin'ny vavahadin-tserasera (Connecting...)\n";
    this.render();

    // Start a realistic log simulation
    setTimeout(() => {
      this.loadLog += "Fanamarinana ny laharana sy ny kaody tolotra...\n";
      this.render();

      setTimeout(() => {
        this.loadLog += "Miandry fankatoavana amin'ny alalan'ny USSD amin'ny finday...\n";
        this.render();

        setTimeout(() => {
          this.loadLog += "Fankatoavana voaray! Nahomby ny fandoavam-bola.\n";
          this.render();

          setTimeout(() => {
            // Update db subscription to premium!
            this.db.setSubscription("premium", "30 Jona 2027");
            this.db.addXp(100); // Premium onboarding bonus xp
            this.payLoading = false;
            
            // Re-render
            this.render();
            window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
          }, 800);
        }, 1200);
      }, 1000);
    }, 800);
  }
}

customElements.define("fz-payment", FzPayment);
