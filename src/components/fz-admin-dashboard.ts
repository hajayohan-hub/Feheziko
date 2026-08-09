/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseEngine, AdminEntity } from "../core/DatabaseEngine";

export class FzAdminDashboard extends HTMLElement {
  private db!: DatabaseEngine;
  private entities: AdminEntity[] = [];
  private selectedCategory: "all" | "ecole" | "enseignant" | "apprenant" = "all";
  private selectedStatus: "all" | "trial" | "active" | "expired" | "suspended" = "all";
  private searchQuery: string = "";
  
  // Modals state
  private showRegisterModal: boolean = false;
  private showActivateModal: boolean = false;
  private showEditModal: boolean = false;
  private selectedEntity: AdminEntity | null = null;
  private notificationMessage: string | null = null;

  constructor() {
    super();
  }

  connectedCallback() {
    this.db = (window as any).feheziko?.db;
    this.loadData();

    window.addEventListener("feheziko_admin_data_changed", () => {
      this.loadData();
    });

    window.addEventListener("feheziko_state_changed", () => {
      this.render();
    });
  }

  private loadData() {
    if (!this.db) return;
    this.entities = this.db.getAdminEntities();
    this.render();
  }

  private getFilteredEntities(): AdminEntity[] {
    return this.entities.filter(e => {
      const matchCategory = this.selectedCategory === "all" || e.type === this.selectedCategory;
      const matchStatus = this.selectedStatus === "all" || e.status === this.selectedStatus;
      
      const q = this.searchQuery.toLowerCase().trim();
      const matchQuery = !q || 
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.phone.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        (e.paymentRef && e.paymentRef.toLowerCase().includes(q));

      return matchCategory && matchStatus && matchQuery;
    });
  }

  private calculateDaysRemaining(expiryIso: string): number {
    const exp = new Date(expiryIso).getTime();
    const now = Date.now();
    const diffMs = exp - now;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  private showToast(msg: string) {
    this.notificationMessage = msg;
    this.render();
    setTimeout(() => {
      this.notificationMessage = null;
      this.render();
    }, 4000);
  }

  private exportToCsv() {
    if (this.entities.length === 0) return;

    const headers = ["ID", "Type", "Nom", "Email", "Téléphone", "Ville", "Statut", "Plan", "Élèves Quota", "Inscrit le", "Fin Essai", "Montant (Ar)", "Réf Paiement"];
    const rows = this.entities.map(e => [
      e.id,
      e.type,
      `"${e.name.replace(/"/g, '""')}"`,
      e.email,
      e.phone,
      `"${e.location.replace(/"/g, '""')}"`,
      e.status,
      e.plan,
      `${e.assignedStudents}/${e.maxSeats}`,
      new Date(e.registeredAt).toLocaleDateString(),
      new Date(e.trialExpiryDate).toLocaleDateString(),
      e.amountPaidMga || 0,
      e.paymentRef || "-"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `feheziko_abonnements_admin_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showToast("📄 Export CSV des utilisateurs Feheziko téléchargé avec succès !");
  }

  private render() {
    if (!this.db) return;

    const progress = this.db.getProgress();
    const isMg = progress.accessibility.language === "mg";

    // KPIs Calculations
    const totalEntities = this.entities.length;
    const ecolesCount = this.entities.filter(e => e.type === "ecole").length;
    const enseignantsCount = this.entities.filter(e => e.type === "enseignant").length;
    const apprenantsCount = this.entities.filter(e => e.type === "apprenant").length;
    
    const trialEntities = this.entities.filter(e => e.status === "trial");
    const activeEntities = this.entities.filter(e => e.status === "active");
    const expiredEntities = this.entities.filter(e => e.status === "expired");
    const suspendedEntities = this.entities.filter(e => e.status === "suspended");

    // Expiring within 48h
    const expiringSoonEntities = trialEntities.filter(e => {
      const days = this.calculateDaysRemaining(e.trialExpiryDate);
      return days >= 0 && days <= 2;
    });

    const totalRevenueMga = this.entities.reduce((acc, curr) => acc + (curr.amountPaidMga || 0), 0);
    const filtered = this.getFilteredEntities();

    this.innerHTML = `
      <div class="space-y-6 pb-12 animate-fade-in">
        <!-- Toast Notification -->
        ${
          this.notificationMessage
            ? `
            <div class="fixed top-20 right-4 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-slate-700 animate-bounce">
              <span class="text-xl">✨</span>
              <span class="text-sm font-semibold">${this.notificationMessage}</span>
            </div>
            `
            : ""
        }

        <!-- Header Banner -->
        <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
          <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div class="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div class="space-y-2">
              <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                <span>⚙️ Administration Feheziko</span>
                <span>•</span>
                <span>Gestion Abonnements & Essais 5j</span>
              </div>
              <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight">Tableau de Bord Propriétaire</h2>
              <p class="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
                Abonnez, suivez et contrôlez les inscriptions des écoles, enseignants et apprenants directs avec gestion automatisée de l'essai gratuit de 5 jours.
              </p>
            </div>

            <!-- Quick Action Header Buttons -->
            <div class="flex flex-wrap items-center gap-2 shrink-0">
              <button id="openRegisterBtn" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-2 cursor-pointer active:scale-95">
                <span class="text-base">➕</span>
                <span>Inscrire Utilisateur</span>
              </button>
              <button id="exportCsvBtn" class="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition-all border border-slate-700 flex items-center space-x-2 cursor-pointer active:scale-95">
                <span>📥</span>
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        <!-- KPI Cards Grid -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <!-- KPI 1: Inscrits Totaux -->
          <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Inscrits</span>
              <span class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">🏛️</span>
            </div>
            <div class="mt-3 flex items-baseline space-x-2">
              <span class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">${totalEntities}</span>
              <span class="text-xs font-semibold text-slate-500">comptes</span>
            </div>
            <div class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>🏫 ${ecolesCount} Écoles</span>
              <span>👩‍🏫 ${enseignantsCount} Profs</span>
              <span>👨‍🎓 ${apprenantsCount} App.</span>
            </div>
          </div>

          <!-- KPI 2: Essais 5j Actifs -->
          <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-amber-200 dark:border-amber-900/50 shadow-sm relative overflow-hidden">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Essais 5j en Cours</span>
              <span class="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">⏳</span>
            </div>
            <div class="mt-3 flex items-baseline space-x-2">
              <span class="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">${trialEntities.length}</span>
              <span class="text-xs font-bold text-amber-600 dark:text-amber-400">en test gratuit</span>
            </div>
            <div class="mt-2 pt-2 border-t border-amber-100 dark:border-amber-950/80 flex items-center justify-between text-[11px] font-medium text-amber-700 dark:text-amber-400">
              <span>⚠️ ${expiringSoonEntities.length} fin &lt; 48h</span>
              <span>❌ ${expiredEntities.length} expirés</span>
            </div>
          </div>

          <!-- KPI 3: Abonnements Payants -->
          <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-emerald-200 dark:border-emerald-900/50 shadow-sm relative overflow-hidden">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Abonnés Payants</span>
              <span class="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">👑</span>
            </div>
            <div class="mt-3 flex items-baseline space-x-2">
              <span class="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">${activeEntities.length}</span>
              <span class="text-xs font-bold text-emerald-600">comptes actifs</span>
            </div>
            <div class="mt-2 pt-2 border-t border-emerald-100 dark:border-emerald-950/80 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
              <span>Accès illimité sans coupure</span>
            </div>
          </div>

          <!-- KPI 4: Revenus MGA -->
          <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-indigo-200 dark:border-indigo-900/50 shadow-sm relative overflow-hidden">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Revenus Encaissés</span>
              <span class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">🇲🇬</span>
            </div>
            <div class="mt-3 flex items-baseline space-x-1">
              <span class="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">${totalRevenueMga.toLocaleString()}</span>
              <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400">Ar</span>
            </div>
            <div class="mt-2 pt-2 border-t border-indigo-100 dark:border-indigo-950/80 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>Mobile Money (MVola / OM)</span>
            </div>
          </div>
        </div>

        <!-- Alert Banner: Expiring Trials (< 48h or Expired) -->
        ${
          expiringSoonEntities.length > 0 || expiredEntities.length > 0
            ? `
            <div class="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div class="flex items-start space-x-3">
                <span class="text-2xl p-1 shrink-0">⏰</span>
                <div>
                  <h4 class="font-extrabold text-amber-900 dark:text-amber-200 text-sm sm:text-base">
                    Relances d'Essai 5 jours en attente (${expiringSoonEntities.length + expiredEntities.length} compte(s))
                  </h4>
                  <p class="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                    Ces comptes touchent à la fin de leur période d'essai gratuit de 5 jours. Prolongez leur essai ou validez leur règlement pour débloquer l'accès complet.
                  </p>
                </div>
              </div>
              <div class="flex items-center space-x-2 shrink-0">
                <button id="quickExtendAllBtn" class="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer">
                  ⚡ Prolonger tous les essais (+5j)
                </button>
              </div>
            </div>
            `
            : ""
        }

        <!-- Filter & Search Toolbar -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <!-- Search Input -->
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">🔍</span>
            <input id="searchInput" type="text" value="${this.searchQuery}" placeholder="Rechercher par nom d'école, enseignant, téléphone MVola/OM, ville..." class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
          </div>

          <!-- Category & Status Filters -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
            <!-- Type Tabs -->
            <div class="flex items-center space-x-1 overflow-x-auto no-scrollbar py-1">
              <button data-cat="all" class="cat-btn px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${this.selectedCategory === "all" ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"}">
                Tous (${totalEntities})
              </button>
              <button data-cat="ecole" class="cat-btn px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${this.selectedCategory === "ecole" ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"}">
                🏫 Écoles (${ecolesCount})
              </button>
              <button data-cat="enseignant" class="cat-btn px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${this.selectedCategory === "enseignant" ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"}">
                👩‍🏫 Profs (${enseignantsCount})
              </button>
              <button data-cat="apprenant" class="cat-btn px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${this.selectedCategory === "apprenant" ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"}">
                👨‍🎓 Apprenants (${apprenantsCount})
              </button>
            </div>

            <!-- Status Tabs -->
            <div class="flex items-center space-x-1 overflow-x-auto no-scrollbar py-1">
              <button data-status="all" class="status-btn px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${this.selectedStatus === "all" ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}">
                Tous Statuts
              </button>
              <button data-status="trial" class="status-btn px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${this.selectedStatus === "trial" ? "bg-amber-500 text-white" : "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"}">
                ⏳ Essai 5j (${trialEntities.length})
              </button>
              <button data-status="active" class="status-btn px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${this.selectedStatus === "active" ? "bg-emerald-600 text-white" : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"}">
                ✅ Actifs (${activeEntities.length})
              </button>
              <button data-status="expired" class="status-btn px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${this.selectedStatus === "expired" ? "bg-rose-600 text-white" : "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"}">
                ❌ Expirés (${expiredEntities.length})
              </button>
            </div>
          </div>
        </div>

        <!-- Registered Entities List / Table -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 class="font-extrabold text-slate-900 dark:text-white text-base">
              Liste des Souscriptions (${filtered.length})
            </h3>
            <span class="text-xs font-semibold text-slate-500">
              Essai max. : <strong class="text-indigo-600 dark:text-indigo-400">5 Jours Gratuits</strong>
            </span>
          </div>

          ${
            filtered.length === 0
              ? `
              <div class="p-12 text-center space-y-3">
                <span class="text-4xl block">🔍</span>
                <p class="text-slate-500 dark:text-slate-400 font-semibold text-sm">
                  Aucun établissement ou apprenant ne correspond aux critères filtrés.
                </p>
                <button id="resetFiltersBtn" class="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer">
                  Réinitialiser la recherche
                </button>
              </div>
              `
              : `
              <!-- Desktop Table Layout -->
              <div class="hidden lg:block overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th class="py-3.5 px-6">Utilisateur / Organisme</th>
                      <th class="py-3.5 px-4">Coordonnées</th>
                      <th class="py-3.5 px-4">Localisation</th>
                      <th class="py-3.5 px-4">Statut Essai / Abonnement</th>
                      <th class="py-3.5 px-4">Quota Élèves</th>
                      <th class="py-3.5 px-4 text-right">Actions Admin</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-medium">
                    ${filtered.map(entity => this.renderTableRow(entity)).join("")}
                  </tbody>
                </table>
              </div>

              <!-- Mobile & Tablet Cards Layout -->
              <div class="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
                ${filtered.map(entity => this.renderMobileCard(entity)).join("")}
              </div>
              `
          }
        </div>

        <!-- Modals -->
        ${this.showRegisterModal ? this.renderRegisterModal() : ""}
        ${this.showActivateModal && this.selectedEntity ? this.renderActivateModal(this.selectedEntity) : ""}
        ${this.showEditModal && this.selectedEntity ? this.renderEditModal(this.selectedEntity) : ""}
      </div>
    `;

    this.attachEventListeners();
  }

  private renderTableRow(entity: AdminEntity): string {
    const daysLeft = this.calculateDaysRemaining(entity.trialExpiryDate);
    const typeBadge =
      entity.type === "ecole"
        ? `<span class="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[10px]">🏫 École</span>`
        : entity.type === "enseignant"
        ? `<span class="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[10px]">👩‍🏫 Prof</span>`
        : `<span class="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">👨‍🎓 Apprenant</span>`;

    let statusBadge = "";
    if (entity.status === "active") {
      statusBadge = `<span class="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] inline-flex items-center space-x-1"><span>✅</span><span>Actif Payant</span></span>`;
    } else if (entity.status === "trial") {
      const color = daysLeft <= 1 ? "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300" : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300";
      statusBadge = `<span class="px-2.5 py-1 rounded-full ${color} font-bold text-[11px] inline-flex items-center space-x-1"><span>⏳</span><span>Essai 5j (${daysLeft}j rest.)</span></span>`;
    } else if (entity.status === "expired") {
      statusBadge = `<span class="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold text-[11px] inline-flex items-center space-x-1"><span>❌</span><span>Essai Expiré</span></span>`;
    } else {
      statusBadge = `<span class="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">🚫 Suspendu</span>`;
    }

    return `
      <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
        <td class="py-4 px-6">
          <div class="space-y-1">
            <div class="flex items-center space-x-2">
              <span class="font-extrabold text-slate-900 dark:text-white text-sm">${entity.name}</span>
              ${typeBadge}
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              Inscrit le : ${new Date(entity.registeredAt).toLocaleDateString()}
            </p>
          </div>
        </td>

        <td class="py-4 px-4">
          <div class="space-y-0.5 text-[11px]">
            <p class="font-semibold text-slate-800 dark:text-slate-200">${entity.email}</p>
            <p class="font-mono text-indigo-600 dark:text-indigo-400 font-bold">${entity.phone}</p>
          </div>
        </td>

        <td class="py-4 px-4 text-slate-600 dark:text-slate-300">
          📍 ${entity.location}
        </td>

        <td class="py-4 px-4">
          <div class="space-y-1">
            ${statusBadge}
            <p class="text-[10px] text-slate-500">
              ${entity.status === "active" ? `Plan: ${entity.plan}` : `Fin essai: ${new Date(entity.trialExpiryDate).toLocaleDateString()}`}
            </p>
          </div>
        </td>

        <td class="py-4 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
          👥 ${entity.assignedStudents} / ${entity.maxSeats}
        </td>

        <td class="py-4 px-6 text-right">
          <div class="flex items-center justify-end space-x-1.5">
            ${
              entity.status !== "active"
                ? `
                <button data-action="activate" data-id="${entity.id}" class="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs active:scale-95">
                  👑 Activer Payant
                </button>
                `
                : ""
            }
            <button data-action="extend" data-id="${entity.id}" class="bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold px-2 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs active:scale-95" title="Prolonger l'essai gratuit de 5 jours">
              ⏱️ +5j
            </button>
            <button data-action="edit" data-id="${entity.id}" class="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold px-2 py-1.5 rounded-lg transition-all cursor-pointer">
              ✏️
            </button>
            <button data-action="delete" data-id="${entity.id}" class="bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-[11px] font-bold px-2 py-1.5 rounded-lg transition-all cursor-pointer" title="Supprimer">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  private renderMobileCard(entity: AdminEntity): string {
    const daysLeft = this.calculateDaysRemaining(entity.trialExpiryDate);
    return `
      <div class="p-4 space-y-3">
        <div class="flex items-start justify-between gap-2">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">${entity.type}</span>
            <h4 class="font-extrabold text-slate-900 dark:text-white text-base">${entity.name}</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400">📍 ${entity.location}</p>
          </div>
          <div>
            ${
              entity.status === "active"
                ? `<span class="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">✅ Actif</span>`
                : `<span class="px-2 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">⏳ Essai (${daysLeft}j)</span>`
            }
          </div>
        </div>

        <div class="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 text-xs space-y-1">
          <p><strong class="text-slate-500">Email:</strong> ${entity.email}</p>
          <p><strong class="text-slate-500">Contact / MVola:</strong> <span class="font-mono text-indigo-600 font-bold">${entity.phone}</span></p>
          <p><strong class="text-slate-500">Quota Élèves:</strong> ${entity.assignedStudents} / ${entity.maxSeats}</p>
          <p><strong class="text-slate-500">Fin Essai:</strong> ${new Date(entity.trialExpiryDate).toLocaleDateString()}</p>
        </div>

        <div class="flex items-center justify-end space-x-2 pt-1">
          ${
            entity.status !== "active"
              ? `
              <button data-action="activate" data-id="${entity.id}" class="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer">
                👑 Activer
              </button>
              `
              : ""
          }
          <button data-action="extend" data-id="${entity.id}" class="bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer">
            ⏱️ +5j Essai
          </button>
          <button data-action="delete" data-id="${entity.id}" class="bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-1.5 rounded-lg cursor-pointer">
            🗑️
          </button>
        </div>
      </div>
    `;
  }

  private renderRegisterModal(): string {
    const now = new Date();
    const trialExp = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString();

    return `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
        <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 class="text-xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>➕ Inscrire un Nouvel Utilisateur</span>
            </h3>
            <button id="closeModalBtn" class="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer">✕</button>
          </div>

          <form id="registerEntityForm" class="space-y-4 text-xs sm:text-sm">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Type de Compte</label>
              <select id="regType" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-white">
                <option value="ecole">🏫 École / Établissement (Pack 50 élèves)</option>
                <option value="enseignant">👩‍🏫 Enseignant / Professeur (Pack 30 élèves)</option>
                <option value="apprenant">👨‍🎓 Apprenant Direct (Individuel)</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nom Complet / Raison Sociale</label>
              <input id="regName" type="text" required placeholder="ex: Lycée Rabearivelo ou Prof. Jean" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold text-slate-900 dark:text-white" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Adresse Email</label>
                <input id="regEmail" type="email" required placeholder="contact@ecole.mg" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold text-slate-900 dark:text-white" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Téléphone MVola / OM</label>
                <input id="regPhone" type="text" required placeholder="+261 34 00 000 00" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold text-slate-900 dark:text-white" />
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Ville / Localisation</label>
              <input id="regLocation" type="text" placeholder="ex: Antananarivo, Majunga, Fianarantsoa..." class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold text-slate-900 dark:text-white" />
            </div>

            <div class="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl border border-indigo-100 dark:border-indigo-900 space-y-1 text-xs">
              <p class="font-bold text-indigo-900 dark:text-indigo-300">⏳ Période d'Essai Automatique</p>
              <p class="text-indigo-700 dark:text-indigo-400">
                L'inscription attribue un essai gratuit de <strong>5 jours maximum</strong>. Expiration prévue le <strong>${trialExp}</strong>.
              </p>
            </div>

            <div class="flex items-center justify-end space-x-3 pt-3">
              <button type="button" id="cancelRegisterBtn" class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">
                Annuler
              </button>
              <button type="submit" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md cursor-pointer">
                Valider Inscription
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  private renderActivateModal(entity: AdminEntity): string {
    return `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
        <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 class="text-xl font-extrabold text-slate-900 dark:text-white">👑 Activer Abonnement Payant</h3>
              <p class="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">${entity.name}</p>
            </div>
            <button id="closeModalBtn" class="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer">✕</button>
          </div>

          <form id="activateSubscriptionForm" class="space-y-4 text-xs sm:text-sm">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Choisir la Formule d'Abonnement</label>
              <select id="actPlan" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-white">
                <option value="school_pack_50">🏫 Pack École 50 élèves (350 000 Ar / an)</option>
                <option value="school_pack_100">🏫 Pack École 100 élèves (600 000 Ar / an)</option>
                <option value="teacher_pack_30">👩‍🏫 Pack Enseignant 30 élèves (150 000 Ar / an)</option>
                <option value="premium_monthly">👨‍🎓 Premium Individuel Mensuel (10 000 Ar / mois)</option>
                <option value="premium_annual">👨‍🎓 Premium Individuel Annuel (100 000 Ar / an)</option>
              </select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Montant Perçu (MGA / Ar)</label>
                <input id="actAmount" type="number" required value="350000" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-white" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Réf. Trans. Mobile Money</label>
                <input id="actRef" type="text" required placeholder="ex: MVOLA-99481 ou OM-3321" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold text-slate-900 dark:text-white" />
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Remarques & Notes de Paiement</label>
              <textarea id="actNotes" rows="2" placeholder="Note interne de validation..." class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold text-slate-900 dark:text-white"></textarea>
            </div>

            <div class="flex items-center justify-end space-x-3 pt-3">
              <button type="button" id="cancelActivateBtn" class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">
                Annuler
              </button>
              <button type="submit" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md cursor-pointer">
                Confirmer Activation
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  private renderEditModal(entity: AdminEntity): string {
    return `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
        <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 class="text-xl font-extrabold text-slate-900 dark:text-white">✏️ Éditer le Compte</h3>
            <button id="closeModalBtn" class="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer">✕</button>
          </div>

          <form id="editEntityForm" class="space-y-4 text-xs sm:text-sm">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nom / Raison Sociale</label>
              <input id="editName" type="text" value="${entity.name}" required class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold text-slate-900 dark:text-white" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Quota Élèves Max</label>
                <input id="editSeats" type="number" value="${entity.maxSeats}" required class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold text-slate-900 dark:text-white" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Téléphone Contact</label>
                <input id="editPhone" type="text" value="${entity.phone}" required class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold text-slate-900 dark:text-white" />
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Notes Administrateur</label>
              <textarea id="editNotes" rows="3" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold text-slate-900 dark:text-white">${entity.notes || ""}</textarea>
            </div>

            <div class="flex items-center justify-end space-x-3 pt-3">
              <button type="button" id="cancelEditBtn" class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">
                Annuler
              </button>
              <button type="submit" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md cursor-pointer">
                Sauvegarder
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  private attachEventListeners() {
    // Search input
    const searchInput = this.querySelector("#searchInput") as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = (e.target as HTMLInputElement).value;
        this.render();
      });
    }

    // Category Tabs
    this.querySelectorAll(".cat-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        this.selectedCategory = (e.currentTarget as HTMLElement).getAttribute("data-cat") as any;
        this.render();
      });
    });

    // Status Tabs
    this.querySelectorAll(".status-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        this.selectedStatus = (e.currentTarget as HTMLElement).getAttribute("data-status") as any;
        this.render();
      });
    });

    // Reset filters
    this.querySelector("#resetFiltersBtn")?.addEventListener("click", () => {
      this.selectedCategory = "all";
      this.selectedStatus = "all";
      this.searchQuery = "";
      this.render();
    });

    // Open Register Modal
    this.querySelector("#openRegisterBtn")?.addEventListener("click", () => {
      this.showRegisterModal = true;
      this.render();
    });

    // Export CSV
    this.querySelector("#exportCsvBtn")?.addEventListener("click", () => {
      this.exportToCsv();
    });

    // Quick extend all trials
    this.querySelector("#quickExtendAllBtn")?.addEventListener("click", () => {
      const trials = this.entities.filter(e => e.status === "trial" || e.status === "expired");
      trials.forEach(t => {
        this.db.extendAdminEntityTrial(t.id, 5);
      });
      this.showToast(`⚡ ${trials.length} essai(s) prolongé(s) de 5 jours avec succès !`);
      this.loadData();
    });

    // Table / Cards action buttons
    this.querySelectorAll("button[data-action]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        const action = target.getAttribute("data-action");
        const id = target.getAttribute("data-id");

        if (!id) return;
        const entity = this.entities.find(item => item.id === id);

        if (action === "extend") {
          this.db.extendAdminEntityTrial(id, 5);
          this.showToast(`⏱️ Essai de "${entity?.name}" prolongé de 5 jours !`);
          this.loadData();
        } else if (action === "activate" && entity) {
          this.selectedEntity = entity;
          this.showActivateModal = true;
          this.render();
        } else if (action === "edit" && entity) {
          this.selectedEntity = entity;
          this.showEditModal = true;
          this.render();
        } else if (action === "delete") {
          if (confirm(`Voulez-vous vraiment supprimer le compte "${entity?.name}" ?`)) {
            this.db.deleteAdminEntity(id);
            this.showToast(`🗑️ Compte "${entity?.name}" supprimé.`);
            this.loadData();
          }
        }
      });
    });

    // Modal Close
    this.querySelectorAll("#closeModalBtn, #cancelRegisterBtn, #cancelActivateBtn, #cancelEditBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.showRegisterModal = false;
        this.showActivateModal = false;
        this.showEditModal = false;
        this.selectedEntity = null;
        this.render();
      });
    });

    // Handle Register Form Submission
    const regForm = this.querySelector("#registerEntityForm") as HTMLFormElement;
    if (regForm) {
      regForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const type = (this.querySelector("#regType") as HTMLSelectElement).value as any;
        const name = (this.querySelector("#regName") as HTMLInputElement).value;
        const email = (this.querySelector("#regEmail") as HTMLInputElement).value;
        const phone = (this.querySelector("#regPhone") as HTMLInputElement).value;
        const location = (this.querySelector("#regLocation") as HTMLInputElement).value;

        const newEnt = this.db.addAdminEntity({ name, type, email, phone, location });
        this.showRegisterModal = false;
        this.showToast(`✅ "${newEnt.name}" inscrit avec succès (Essai 5j activé).`);
        this.loadData();
      });
    }

    // Handle Activate Form Submission
    const actForm = this.querySelector("#activateSubscriptionForm") as HTMLFormElement;
    if (actForm && this.selectedEntity) {
      actForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const plan = (this.querySelector("#actPlan") as HTMLSelectElement).value as any;
        const amount = Number((this.querySelector("#actAmount") as HTMLInputElement).value);
        const ref = (this.querySelector("#actRef") as HTMLInputElement).value;

        this.db.activateAdminEntitySubscription(this.selectedEntity!.id, plan, amount, ref);
        this.showActivateModal = false;
        const entName = this.selectedEntity!.name;
        this.selectedEntity = null;
        this.showToast(`👑 Abonnement activé pour "${entName}" !`);
        this.loadData();
      });
    }

    // Handle Edit Form Submission
    const editForm = this.querySelector("#editEntityForm") as HTMLFormElement;
    if (editForm && this.selectedEntity) {
      editForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = (this.querySelector("#editName") as HTMLInputElement).value;
        const maxSeats = Number((this.querySelector("#editSeats") as HTMLInputElement).value);
        const phone = (this.querySelector("#editPhone") as HTMLInputElement).value;
        const notes = (this.querySelector("#editNotes") as HTMLTextAreaElement).value;

        this.db.updateAdminEntity(this.selectedEntity!.id, { name, maxSeats, phone, notes });
        this.showEditModal = false;
        this.selectedEntity = null;
        this.showToast(`✏️ Compte mis à jour avec succès.`);
        this.loadData();
      });
    }
  }
}

customElements.define("fz-admin-dashboard", FzAdminDashboard);
