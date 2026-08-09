/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Non-intrusive Service Worker Update Notification Banner for Feheziko PWA
 */

export class FzUpdateBanner extends HTMLElement {
  private waitingWorker: ServiceWorker | null = null;
  private isDismissed: boolean = false;

  constructor() {
    super();
  }

  connectedCallback() {
    this.setupServiceWorkerListeners();
    this.render();

    window.addEventListener("feheziko_state_changed", () => this.render());
  }

  private setupServiceWorkerListeners() {
    if (!("serviceWorker" in navigator)) return;

    // Check if there is already a waiting SW or listen for updatefound
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      if (reg.waiting) {
        this.waitingWorker = reg.waiting;
        this.render();
      }

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            this.waitingWorker = newWorker;
            this.isDismissed = false;
            this.render();
          }
        });
      });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }

  private applyUpdate() {
    if (this.waitingWorker) {
      this.waitingWorker.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  }

  private dismiss() {
    this.isDismissed = true;
    this.render();
  }

  private render() {
    if (!this.waitingWorker || this.isDismissed) {
      this.innerHTML = "";
      return;
    }

    const lang = (window as any).feheziko?.db?.getProgress()?.accessibility?.language || "fr";
    const isMg = lang === "mg";

    const title = isMg ? "Misy kinova vaovao amin'ny Feheziko!" : "Une nouvelle version de Feheziko est disponible.";
    const updateBtnText = isMg ? "Mettre à jour maintenant" : "Mettre à jour maintenant";
    const laterBtnText = isMg ? "Plus tard" : "Plus tard";
    const subtext = isMg 
      ? "Tandrovana ary tsy ho veresana mihitsy ny fivoaranao sy ny tahiring-pianaranao." 
      : "Vos données de progression, favoris et paramètres seront intégralement conservés.";

    this.className = "fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-bounce-in";

    this.innerHTML = `
      <div class="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-2xl border border-indigo-500/40 space-y-3 backdrop-blur-lg">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center justify-center text-xl shrink-0 shadow-inner">
              🚀
            </div>
            <div>
              <h4 class="font-extrabold text-sm text-white leading-snug">${title}</h4>
              <p class="text-[11px] text-indigo-200/90 leading-relaxed mt-0.5">${subtext}</p>
            </div>
          </div>
          <button id="updateDismissBtn" class="text-indigo-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors text-sm cursor-pointer shrink-0" title="Plus tard">
            ✕
          </button>
        </div>

        <div class="flex items-center justify-end gap-2 pt-1 border-t border-indigo-800/50">
          <button id="updateLaterBtn" class="px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-200 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
            ${laterBtnText}
          </button>
          <button id="updateNowBtn" class="px-4 py-2 rounded-xl text-xs font-extrabold bg-indigo-500 hover:bg-indigo-400 text-white shadow-md shadow-indigo-900/50 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95">
            <span>⚡</span>
            <span>${updateBtnText}</span>
          </button>
        </div>
      </div>
    `;

    this.querySelector("#updateNowBtn")?.addEventListener("click", () => this.applyUpdate());
    this.querySelector("#updateLaterBtn")?.addEventListener("click", () => this.dismiss());
    this.querySelector("#updateDismissBtn")?.addEventListener("click", () => this.dismiss());
  }
}

customElements.define("fz-update-banner", FzUpdateBanner);
