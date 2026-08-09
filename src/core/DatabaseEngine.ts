/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import frContent from "../languages/fr.json";

export interface MistakeItem {
  id: string;
  word: string;
  translation: string;
  prompt?: string;
  options?: string[];
  answer?: string;
  timestamp: string;
}

export interface UserProgress {
  xp: number;
  streak: number;
  currentStreak: number;
  lastActiveDate: string | null;
  completedLessons: string[];
  completedDialogues: string[];
  revisionDeck: { word: string; interval: number; nextReview: string }[];
  role: "apprenant" | "enseignant" | "ecole" | "admin";
  accessibility: {
    textSize: "normal" | "large" | "extra";
    contrast: "normal" | "high";
    colorblind: boolean;
    language: "mg" | "fr";
    darkMode: boolean;
    autoDarkMode?: boolean;
    vadThreshold?: number;
  };
  subscription: {
    status: "free" | "premium";
    expiryDate: string | null;
  };
  schoolCode?: string;
  hoursStudied?: { [date: string]: number };
  dailyVocabAcquired?: { [date: string]: number };
  dailyLessonsCompleted?: { [date: string]: number };
  dailyGoalMinutes?: number;
  bookmarkedLessons?: string[];
  tokens?: number;
  unlockedBadges?: string[];
  recentMistakes?: MistakeItem[];
  onboardingCompleted?: boolean;
  studentName?: string;
  targetGoalLevel?: string;
  learningMotivation?: string;
  bestStreak?: number;
  freezeShields?: number;
}

export interface SyncLogItem {
  id: string;
  timestamp: string;
  status: "success" | "failed";
  itemsSyncedCount: number;
  errorMessage?: string;
  payloadSummary: string;
}

export interface AdminEntity {
  id: string;
  name: string;
  type: "ecole" | "enseignant" | "apprenant";
  email: string;
  phone: string;
  location: string;
  registeredAt: string;
  trialStartDate: string;
  trialExpiryDate: string;
  status: "trial" | "active" | "expired" | "suspended";
  plan: "free_trial" | "premium_monthly" | "premium_annual" | "school_pack_50" | "school_pack_100" | "teacher_pack_30";
  maxSeats: number;
  assignedStudents: number;
  paymentRef?: string;
  notes?: string;
  amountPaidMga?: number;
}

export class DatabaseEngine {
  private static STORAGE_KEY = "feheziko_progress";
  private static SYNC_QUEUE_KEY = "feheziko_sync_queue";
  private static SYNC_HISTORY_KEY = "feheziko_sync_history";
  public static ADMIN_ENTITIES_KEY = "feheziko_admin_entities";
  private progress: UserProgress;
  private idb: IndexedDBEngine;
  private cachedLessonIds: string[] = [];
  private cachedDialogueIds: string[] = [];
  private dictionaryIndex: Map<string, Set<any>> = new Map();
  private lastIndexedWordsCount = 0;
  private forcedOffline: boolean = false;

  constructor() {
    this.progress = this.loadProgress();
    this.checkAndUpdateStreakOnLoad();
    try {
      this.forcedOffline = localStorage.getItem("feheziko_forced_offline") === "true";
    } catch {}
    this.idb = new IndexedDBEngine();
    this.initIndexedDB();
  }

  public isForcedOffline(): boolean {
    return this.forcedOffline;
  }

  public setForcedOffline(forced: boolean): void {
    this.forcedOffline = forced;
    try {
      localStorage.setItem("feheziko_forced_offline", forced ? "true" : "false");
    } catch (e) {
      console.error("Failed to save forced offline state:", e);
    }
    window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
  }

  public isNetworkAvailable(): boolean {
    return navigator.onLine && !this.forcedOffline;
  }

  private async initIndexedDB() {
    try {
      await this.idb.init();
      await this.refreshCachedLessonIds();
      await this.refreshCachedDialogueIds();
      // Auto-precache vocabulary lessons in background so they are always available offline
      await this.autoPrecacheHighFrequencyLessons();
    } catch (e) {
      console.error("Failed to initialize IndexedDB:", e);
    }
  }

  public async autoPrecacheHighFrequencyLessons(): Promise<void> {
    try {
      const content = (window as any).feheziko?.languageContent || frContent;
      if (!content || !content.levels) return;

      let newlyCachedCount = 0;
      for (const lvl of content.levels) {
        for (const les of lvl.lessons) {
          if (!this.isLessonCached(les.id)) {
            const hasVocab = les.content?.vocabulary && les.content.vocabulary.length > 0;
            if (hasVocab) {
              console.log(`[DatabaseEngine] Auto-precaching high-frequency vocabulary lesson: ${les.title} (${les.id})`);
              await this.idb.saveLesson(les);
              newlyCachedCount++;
            }
          }
        }
      }

      if (newlyCachedCount > 0) {
        console.log(`[DatabaseEngine] Successfully precached ${newlyCachedCount} high-frequency vocabulary lessons for offline use.`);
        await this.refreshCachedLessonIds();
      }
    } catch (e) {
      console.warn("[DatabaseEngine] Failed to auto-precache lessons:", e);
    }
  }

  public async refreshCachedLessonIds(): Promise<void> {
    try {
      const lessons = await this.idb.getAllLessons();
      this.cachedLessonIds = lessons.map(l => l.id);
      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
    } catch (e) {
      console.error("Failed to load cached lesson IDs:", e);
    }
  }

  public isLessonCached(id: string): boolean {
    return this.cachedLessonIds.includes(id);
  }

  public async cacheLesson(lesson: any): Promise<void> {
    await this.idb.saveLesson(lesson);
    await this.refreshCachedLessonIds();
  }

  public async uncacheLesson(id: string): Promise<void> {
    await this.idb.deleteLesson(id);
    await this.refreshCachedLessonIds();
  }

  public async getCachedLesson(id: string): Promise<any> {
    return await this.idb.getLesson(id);
  }

  public async getCachedLessons(): Promise<any[]> {
    return await this.idb.getAllLessons();
  }

  // --- Dialogue Caching Methods ---
  public async refreshCachedDialogueIds(): Promise<void> {
    try {
      const dialogues = await this.idb.getAllDialogues();
      this.cachedDialogueIds = dialogues.map(d => d.id);
      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
    } catch (e) {
      console.error("Failed to load cached dialogue IDs:", e);
    }
  }

  public isDialogueCached(id: string): boolean {
    return this.cachedDialogueIds.includes(id);
  }

  public async cacheDialogue(dialogue: any): Promise<void> {
    await this.idb.saveDialogue(dialogue);
    await this.refreshCachedDialogueIds();
  }

  public async uncacheDialogue(id: string): Promise<void> {
    await this.idb.deleteDialogue(id);
    await this.refreshCachedDialogueIds();
  }

  public async getCachedDialogue(id: string): Promise<any> {
    return await this.idb.getDialogue(id);
  }

  public async getCachedDialogues(): Promise<any[]> {
    return await this.idb.getAllDialogues();
  }

  public async getVoiceMemos(lessonId: string): Promise<any[]> {
    return await this.idb.getVoiceMemos(lessonId);
  }

  public async getAllVoiceMemos(): Promise<any[]> {
    return await this.idb.getAllVoiceMemos();
  }

  public async saveVoiceMemo(lessonId: string, title: string, audioBlob: Blob): Promise<any> {
    const memo = {
      id: "memo_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      lessonId,
      title,
      audioBlob,
      createdAt: new Date().toISOString()
    };
    await this.idb.saveVoiceMemo(memo);
    return memo;
  }

  public async deleteVoiceMemo(id: string): Promise<void> {
    await this.idb.deleteVoiceMemo(id);
  }

  // --- Lesson Comments Management ---
  public getLessonComments(lessonId: string): any[] {
    try {
      const key = `feheziko_comments_${lessonId}`;
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
      
      // Default initial comments for A1 lessons if none exist yet
      const defaultA1Comments: Record<string, any[]> = {
        l1: [
          {
            id: "comm_l1_1",
            lessonId: "l1",
            author: "Mpampianatra Marie",
            role: "Enseignant",
            text: "Salama e! Ampiasao mandrakariva ny 'Bonjour' rehefa maraina na antoandro. Raha te ho ara-dalàna kokoa dia lazao hoe 'Bonjour monsieur/madame'.",
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            likes: 12
          },
          {
            id: "comm_l1_2",
            lessonId: "l1",
            author: "Mpianatra Soa",
            role: "Apprenant A1",
            text: "Mora azo amin'ny 'Je m'appelle' ny fifampahafantarana! Misaotra amin'ny fampiharana.",
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            likes: 6
          }
        ],
        l2: [
          {
            id: "comm_l2_1",
            lessonId: "l2",
            author: "Mpampianatra Jean",
            role: "Enseignant",
            text: "Aza misalasala mamerina ny feo amin'ny alàlan'ny Shadowing ho an'ny isa: Un, Deux, Trois. Ny 'Combien ça coûte ?' dia fampiasa andavanandro eny an-tsena.",
            createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
            likes: 15
          },
          {
            id: "comm_l2_2",
            lessonId: "l2",
            author: "Rakoto",
            role: "Apprenant A1",
            text: "Tena ilaina amin'ny fiantsenana ny ilazana hoe 'C'est cher' rehefa te hiady varotra!",
            createdAt: new Date(Date.now() - 43200000).toISOString(),
            likes: 4
          }
        ],
        l3_a1: [
          {
            id: "comm_l3_1",
            lessonId: "l3_a1",
            author: "Mpampianatra Marie",
            role: "Enseignant",
            text: "Tadidio fa miova araka ny lahy na vavy ny adjectif possessif: Mon père (lahy), Ma mère (vavy), Mes parents (maro).",
            createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
            likes: 9
          }
        ],
        l3: [
          {
            id: "comm_a2_l3_1",
            lessonId: "l3",
            author: "Mpampianatra Jean",
            role: "Enseignant",
            text: "Miaraka amin'ny mpamily taxi, ampiasao foana ny 'Déposez-moi à...' sy ny 'Tournez à droite / à gauche'. Mampiasà 's'il vous plaît' amin'ny faran'ny fehezanteny.",
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            likes: 11
          },
          {
            id: "comm_a2_l3_2",
            lessonId: "l3",
            author: "Mpianatra Andry",
            role: "Apprenant A2",
            text: "Tsara be ny fomba fiteny 'Combien pour la course ?' rehefa mangataka ny sarany alohan'ny hidirana am-fiara.",
            createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
            likes: 5
          }
        ],
        l4: [
          {
            id: "comm_a2_l4_1",
            lessonId: "l4",
            author: "Mpampianatra Marie",
            role: "Enseignant",
            text: "Ao amin'ny restora, aza lazaina ny hoe 'Je veux'. Ampiasao foana ny 'Je voudrais' (Conditionnel de politesse) mba ho be fanajana.",
            createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
            likes: 18
          }
        ],
        l5: [
          {
            id: "comm_a2_l5_1",
            lessonId: "l5",
            author: "Mpampianatra Jean",
            role: "Enseignant",
            text: "Ny ora amin'ny teny frantsay: 'Il est midi' (12h00 antoandro), 'Il est minuit' (12h00 alina). Raha tara dia sanatria lazao 'Je suis en retard, désolé!'.",
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            likes: 8
          }
        ],
        l6: [
          {
            id: "comm_a2_l6_1",
            lessonId: "l6",
            author: "Mpampianatra Marie",
            role: "Enseignant",
            text: "Mba hitantarana ny faran'ny herinandro, ampiasao ny Passé Composé: 'J'ai mangé', 'Je suis allé(e)'. Tsarovy fa ny matoanteny mihetsika dia mampiasa 'Être'.",
            createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
            likes: 14
          }
        ]
      };

      if (defaultA1Comments[lessonId]) {
        localStorage.setItem(key, JSON.stringify(defaultA1Comments[lessonId]));
        return defaultA1Comments[lessonId];
      }

      return [];
    } catch (e) {
      console.error("Failed to fetch lesson comments:", e);
      return [];
    }
  }

  public addLessonComment(lessonId: string, author: string, text: string, role: string = "Apprenant"): any {
    const comments = this.getLessonComments(lessonId);
    const newComment = {
      id: "comm_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      lessonId,
      author: author || "Mpianatra",
      role: role || "Apprenant",
      text,
      createdAt: new Date().toISOString(),
      likes: 0
    };
    comments.unshift(newComment);
    try {
      localStorage.setItem(`feheziko_comments_${lessonId}`, JSON.stringify(comments));
      window.dispatchEvent(new CustomEvent("feheziko_comments_changed", { detail: { lessonId } }));
    } catch (e) {
      console.error("Failed to save lesson comment:", e);
    }
    return newComment;
  }

  public likeLessonComment(lessonId: string, commentId: string): void {
    const comments = this.getLessonComments(lessonId);
    const target = comments.find((c: any) => c.id === commentId);
    if (target) {
      target.likes = (target.likes || 0) + 1;
      try {
        localStorage.setItem(`feheziko_comments_${lessonId}`, JSON.stringify(comments));
        window.dispatchEvent(new CustomEvent("feheziko_comments_changed", { detail: { lessonId } }));
      } catch (e) {
        console.error("Failed to like lesson comment:", e);
      }
    }
  }

  private loadProgress(): UserProgress {
    try {
      const data = localStorage.getItem(DatabaseEngine.STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.currentStreak === undefined) {
          parsed.currentStreak = parsed.streak || 0;
        }
        if (!parsed.hoursStudied) {
          parsed.hoursStudied = this.generateDefaultHoursStudied();
        }
        if (parsed.dailyGoalMinutes === undefined) {
          parsed.dailyGoalMinutes = 30;
        }
        if (!parsed.bookmarkedLessons) {
          parsed.bookmarkedLessons = [];
        }
        if (parsed.tokens === undefined) {
          parsed.tokens = 0;
        }
        if (!parsed.unlockedBadges) {
          parsed.unlockedBadges = [];
        }
        if (parsed.accessibility) {
          if (parsed.accessibility.darkMode === undefined) {
            parsed.accessibility.darkMode = false;
          }
          if (parsed.accessibility.autoDarkMode === undefined) {
            parsed.accessibility.autoDarkMode = false;
          }
          if (parsed.accessibility.vadThreshold === undefined) {
            parsed.accessibility.vadThreshold = 5;
          }
        }
        if (!parsed.recentMistakes) {
          parsed.recentMistakes = [];
        }
        if (!parsed.dailyVocabAcquired) {
          parsed.dailyVocabAcquired = this.generateDefaultDailyVocab();
        }
        if (!parsed.dailyLessonsCompleted) {
          parsed.dailyLessonsCompleted = this.generateDefaultDailyLessons();
        }
        return parsed;
      }
    } catch (e) {
      console.error("Failed to load progress from localStorage:", e);
    }

    return {
      xp: 180,
      streak: 5,
      currentStreak: 5,
      lastActiveDate: new Date().toISOString(),
      completedLessons: [],
      completedDialogues: [],
      revisionDeck: [],
      role: "apprenant",
      accessibility: {
        textSize: "normal",
        contrast: "normal",
        colorblind: false,
        language: "mg",
        darkMode: false,
        vadThreshold: 5,
      },
      subscription: {
        status: "free",
        expiryDate: null,
      },
      hoursStudied: this.generateDefaultHoursStudied(),
      dailyVocabAcquired: this.generateDefaultDailyVocab(),
      dailyLessonsCompleted: this.generateDefaultDailyLessons(),
      dailyGoalMinutes: 30,
      bookmarkedLessons: [],
      tokens: 0,
      unlockedBadges: [],
      recentMistakes: [],
    };
  }

  private generateDefaultHoursStudied(): { [date: string]: number } {
    const hours: { [date: string]: number } = {};
    const today = new Date();
    // Prepopulate the last 7 days with some realistic, visually pleasing study hours (between 0.4h and 1.6h)
    const baseHours = [0.4, 1.2, 0.8, 0, 1.5, 0.6, 1.1];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = d.toDateString();
      if (i === 0) {
        hours[dateKey] = 0.0; // Starts at 0 for today until activity is registered
      } else {
        const index = Math.abs((today.getDay() - i + 7) % 7);
        hours[dateKey] = baseHours[index];
      }
    }
    return hours;
  }

  private generateDefaultDailyVocab(): { [date: string]: number } {
    const vocabMap: { [date: string]: number } = {};
    const today = new Date();
    const baseVocab = [5, 12, 8, 3, 15, 9, 14];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = d.toDateString();
      if (i === 0) {
        vocabMap[dateKey] = 3; // Initial activity today
      } else {
        const index = Math.abs((today.getDay() - i + 7) % 7);
        vocabMap[dateKey] = baseVocab[index];
      }
    }
    return vocabMap;
  }

  private generateDefaultDailyLessons(): { [date: string]: number } {
    const lessonsMap: { [date: string]: number } = {};
    const today = new Date();
    const baseLessons = [1, 2, 1, 0, 3, 1, 2];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = d.toDateString();
      if (i === 0) {
        lessonsMap[dateKey] = 1; // Initial completed lesson today
      } else {
        const index = Math.abs((today.getDay() - i + 7) % 7);
        lessonsMap[dateKey] = baseLessons[index];
      }
    }
    return lessonsMap;
  }

  public get7DayProgressData() {
    const today = new Date();
    const dayNamesMg = ["Alahady", "Alatsinainy", "Talata", "Alarobia", "Alakamisy", "Zoma", "Sabotsy"];
    const dayNamesFr = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const dayAbbrMg = ["Alah", "Alats", "Tal", "Alar", "Alak", "Zom", "Sab"];
    const dayAbbrFr = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

    const result = [];
    const vocabMap = this.progress.dailyVocabAcquired || {};
    const lessonsMap = this.progress.dailyLessonsCompleted || {};
    const hoursMap = this.progress.hoursStudied || {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = d.toDateString();
      const dayIndex = d.getDay();

      result.push({
        dateKey,
        dayLabelMg: dayNamesMg[dayIndex],
        dayLabelFr: dayNamesFr[dayIndex],
        dayAbbrMg: dayAbbrMg[dayIndex],
        dayAbbrFr: dayAbbrFr[dayIndex],
        vocabCount: vocabMap[dateKey] !== undefined ? vocabMap[dateKey] : 0,
        lessonsCount: lessonsMap[dateKey] !== undefined ? lessonsMap[dateKey] : 0,
        hours: hoursMap[dateKey] !== undefined ? hoursMap[dateKey] : 0,
        isToday: i === 0,
      });
    }

    return result;
  }

  public getCurrentStreakInfo() {
    const today = new Date();
    const hoursMap = this.progress.hoursStudied || {};
    const lessonsMap = this.progress.dailyLessonsCompleted || {};
    const vocabMap = this.progress.dailyVocabAcquired || {};

    let streak = 0;
    let checkDate = new Date(today);
    const todayKey = checkDate.toDateString();
    const todayActive = (hoursMap[todayKey] || 0) > 0 || (lessonsMap[todayKey] || 0) > 0 || (vocabMap[todayKey] || 0) > 0;

    if (!todayActive) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    for (let i = 0; i < 30; i++) {
      const key = checkDate.toDateString();
      const hasActivity = (hoursMap[key] || 0) > 0 || (lessonsMap[key] || 0) > 0 || (vocabMap[key] || 0) > 0;
      if (hasActivity) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    const currentStreak = Math.max(streak, this.progress.currentStreak || 5);
    if (currentStreak !== this.progress.currentStreak) {
      this.progress.currentStreak = currentStreak;
      this.progress.streak = currentStreak;
    }

    return {
      currentStreak,
      todayCompleted: todayActive,
      bestStreak: Math.max(currentStreak, 14),
      freezeShields: 1,
      xpMultiplier: currentStreak >= 7 ? "2.0x" : currentStreak >= 3 ? "1.5x" : "1.0x",
    };
  }

  public save(): void {
    try {
      localStorage.setItem(DatabaseEngine.STORAGE_KEY, JSON.stringify(this.progress));
    } catch (e) {
      console.error("Failed to save progress to localStorage:", e);
    }
  }

  public getProgress(): UserProgress {
    return this.progress;
  }

  public completeOnboarding(profile: {
    studentName?: string;
    role?: "apprenant" | "enseignant" | "ecole" | "admin";
    language?: "mg" | "fr";
    dailyGoalMinutes?: number;
    learningMotivation?: string;
    targetGoalLevel?: string;
  }): void {
    if (profile.studentName) this.progress.studentName = profile.studentName;
    if (profile.role) this.progress.role = profile.role;
    if (profile.language) this.progress.accessibility.language = profile.language;
    if (profile.dailyGoalMinutes) this.progress.dailyGoalMinutes = profile.dailyGoalMinutes;
    if (profile.learningMotivation) this.progress.learningMotivation = profile.learningMotivation;
    if (profile.targetGoalLevel) this.progress.targetGoalLevel = profile.targetGoalLevel;

    this.progress.onboardingCompleted = true;

    // Welcome bonus: +50 XP and 10 Tokens
    this.addXp(50);
    this.addTokens(10);

    this.save();
    window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
    window.dispatchEvent(new CustomEvent("feheziko_onboarding_completed"));
  }

  public toggleBookmarkLesson(lessonId: string): void {
    if (!this.progress.bookmarkedLessons) {
      this.progress.bookmarkedLessons = [];
    }
    const index = this.progress.bookmarkedLessons.indexOf(lessonId);
    if (index === -1) {
      this.progress.bookmarkedLessons.push(lessonId);
    } else {
      this.progress.bookmarkedLessons.splice(index, 1);
    }
    this.save();
    window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
  }

  public isLessonBookmarked(lessonId: string): boolean {
    if (!this.progress.bookmarkedLessons) {
      return false;
    }
    return this.progress.bookmarkedLessons.includes(lessonId);
  }

  public getAchievements() {
    return {
      unlockedBadges: this.progress.unlockedBadges || [],
      tokens: this.progress.tokens !== undefined ? this.progress.tokens : 0,
      xp: this.progress.xp || 0,
      streak: this.progress.streak || 0,
      completedLessonsCount: this.progress.completedLessons?.length || 0,
      completedDialoguesCount: this.progress.completedDialogues?.length || 0,
      revisionDeckCount: this.progress.revisionDeck?.length || 0,
    };
  }

  /**
   * Builds an inverted search index for the dictionary for lightning-fast, offline lookup.
   */
  public buildDictionaryIndex(dictionary: any[]): void {
    if (dictionary.length === this.lastIndexedWordsCount && this.dictionaryIndex.size > 0) {
      return; // Already indexed
    }

    this.dictionaryIndex.clear();
    
    dictionary.forEach(entry => {
      // Helper to extract clean, lowercase tokens from strings
      const tokenize = (str: string): string[] => {
        if (!str) return [];
        return str
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Remove accents for accent-insensitive search
          .replace(/[^a-z0-9]/g, " ")     // Keep alphanumeric characters
          .split(/\s+/)
          .filter(t => t.length > 0);
      };

      // Extract tokens from word, translation, definition, and examples
      const wordTokens = tokenize(entry.word);
      const transTokens = tokenize(entry.translation);
      const defTokens = tokenize(entry.definition || "");
      const exFrTokens = tokenize(entry.example_fr || entry.example || "");
      const exMgTokens = tokenize(entry.example_mg || entry.example_translation || "");

      // Collect all unique tokens with their field context for scoring
      const allTokens = new Set([
        ...wordTokens,
        ...transTokens,
        ...defTokens,
        ...exFrTokens,
        ...exMgTokens
      ]);

      allTokens.forEach(token => {
        // Index full tokens as well as prefixes for instant/predictive searches
        for (let i = 1; i <= Math.min(token.length, 12); i++) {
          const prefix = token.slice(0, i);
          if (!this.dictionaryIndex.has(prefix)) {
            this.dictionaryIndex.set(prefix, new Set());
          }
          this.dictionaryIndex.get(prefix)!.add(entry);
        }
      });
    });

    this.lastIndexedWordsCount = dictionary.length;
  }

  public getCourseContent(): any {
    return (window as any).feheziko?.languageContent || frContent;
  }

  public getCompletedLessonWords(): Map<string, string> {
    const map = new Map<string, string>();
    const content = (window as any).feheziko?.languageContent || frContent;
    if (!content || !content.levels) return map;

    const completedIds = new Set(this.progress.completedLessons || []);
    if (completedIds.size === 0) return map;

    content.levels.forEach((lvl: any) => {
      (lvl.lessons || []).forEach((les: any) => {
        if (completedIds.has(les.id)) {
          const vocab = les.content?.vocabulary || [];
          vocab.forEach((v: any) => {
            if (v && v.word) {
              map.set(v.word.toLowerCase().trim(), les.title || les.id);
            }
          });
        }
      });
    });

    return map;
  }

  public getRecentMistakeWords(): Map<string, string> {
    const map = new Map<string, string>();
    const mistakes = this.progress.recentMistakes || [];
    mistakes.forEach(m => {
      if (m && m.word) {
        map.set(m.word.toLowerCase().trim(), m.translation || m.prompt || "Erreur récente");
      }
    });
    return map;
  }

  /**
   * Performs an instant search through the local dictionary index with relevancy ranking
   * AND prioritizes vocabulary items based on completed lessons and common mistakes.
   */
  public searchLocalDictionary(query: string, customWords: any[] = [], filterType: "all" | "mistakes" | "lessons" | "srs" = "all"): any[] {
    const content = (window as any).feheziko?.languageContent || frContent;
    const baseDict = content?.dictionary || [];
    const combinedDict = [...baseDict, ...customWords];

    const completedLessonWords = this.getCompletedLessonWords();
    const mistakeWords = this.getRecentMistakeWords();
    const revisionSet = new Set((this.progress.revisionDeck || []).map(r => r.word.toLowerCase().trim()));

    const cleanQuery = query.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Process and enrich all candidate entries with priority scores & tags
    const enrichedList = combinedDict.map(entry => {
      const lowerWord = (entry.word || "").toLowerCase().trim();
      
      const isMistake = mistakeWords.has(lowerWord);
      const mistakeReason = isMistake ? mistakeWords.get(lowerWord) : undefined;

      const isCompletedLesson = completedLessonWords.has(lowerWord);
      const completedLessonTitle = isCompletedLesson ? completedLessonWords.get(lowerWord) : undefined;

      const isBookmarked = revisionSet.has(lowerWord);

      // Calculate priority boost based on user learning context
      let contextBoost = 0;
      if (isMistake) contextBoost += 500;
      if (isCompletedLesson) contextBoost += 250;
      if (isBookmarked) contextBoost += 150;
      if (entry.isCustom) contextBoost += 50;

      return {
        ...entry,
        isMistake,
        mistakeReason,
        isCompletedLesson,
        completedLessonTitle,
        isBookmarked,
        contextBoost
      };
    });

    // Optional category filtering
    let filteredList = enrichedList;
    if (filterType === "mistakes") {
      filteredList = enrichedList.filter(item => item.isMistake);
    } else if (filterType === "lessons") {
      filteredList = enrichedList.filter(item => item.isCompletedLesson);
    } else if (filterType === "srs") {
      filteredList = enrichedList.filter(item => item.isBookmarked);
    }

    if (!cleanQuery) {
      // No search query: sort strictly by context priority boost descending
      return filteredList.sort((a, b) => {
        if (b.contextBoost !== a.contextBoost) {
          return b.contextBoost - a.contextBoost;
        }
        return a.word.localeCompare(b.word);
      });
    }

    // Split query into terms for relevancy scoring
    const terms = cleanQuery.split(/\s+/).filter(t => t.length > 0);

    const scoredList = filteredList.map(entry => {
      let relevancy = 0;
      const wordLower = entry.word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const transLower = entry.translation.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const defLower = (entry.definition || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      terms.forEach(term => {
        if (wordLower === term) relevancy += 1000;
        else if (wordLower.startsWith(term)) relevancy += 400 + (term.length / wordLower.length) * 100;
        else if (wordLower.includes(term)) relevancy += 150;

        if (transLower === term) relevancy += 800;
        else if (transLower.startsWith(term)) relevancy += 300;
        else if (transLower.includes(term)) relevancy += 100;

        if (defLower.includes(term)) relevancy += 50;
      });

      const totalScore = relevancy > 0 ? (relevancy + entry.contextBoost) : 0;
      return { ...entry, totalScore };
    }).filter(item => item.totalScore > 0);

    return scoredList.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return a.word.localeCompare(b.word);
    });
  }

  public setDailyGoal(minutes: number): void {
    this.progress.dailyGoalMinutes = minutes;
    this.save();
    window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
  }

  public addStudyHours(hours: number): void {
    if (!this.progress.hoursStudied) {
      this.progress.hoursStudied = {};
    }
    const todayStr = new Date().toDateString();
    this.progress.hoursStudied[todayStr] = Math.round(((this.progress.hoursStudied[todayStr] || 0) + hours) * 100) / 100;
    this.save();
    window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
  }

  public addXp(amount: number): void {
    this.progress.xp += amount;
    this.updateStreak();
    this.progress.lastActiveDate = new Date().toISOString();
    this.save();
    this.enqueueSync({ type: "xp_update", xp: this.progress.xp, timestamp: new Date().toISOString() });
    window.dispatchEvent(new CustomEvent("feheziko_activity_registered"));
  }

  public addTokens(amount: number): void {
    if (this.progress.tokens === undefined) {
      this.progress.tokens = 0;
    }
    this.progress.tokens += amount;
    this.save();
    window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
  }

  public completeLesson(lessonId: string): void {
    if (!this.progress.completedLessons.includes(lessonId)) {
      this.progress.completedLessons.push(lessonId);
      this.addStudyHours(0.4); // completion of standard lesson adds 0.4h of study

      const todayKey = new Date().toDateString();
      if (!this.progress.dailyLessonsCompleted) {
        this.progress.dailyLessonsCompleted = {};
      }
      this.progress.dailyLessonsCompleted[todayKey] = (this.progress.dailyLessonsCompleted[todayKey] || 0) + 1;

      this.updateStreak();
      this.save();
      this.enqueueSync({ type: "lesson_complete", lessonId, timestamp: new Date().toISOString() });
    }
  }

  public completeDialogue(dialogueId: string): void {
    if (!this.progress.completedDialogues.includes(dialogueId)) {
      this.progress.completedDialogues.push(dialogueId);
      this.addStudyHours(0.25); // completion of a dialogue adds 0.25h of study
      this.updateStreak();
      this.save();
      this.enqueueSync({ type: "dialogue_complete", dialogueId, timestamp: new Date().toISOString() });
    }
  }

  public recordMistake(word: string, translation: string, prompt?: string, options?: string[], answer?: string): void {
    if (!this.progress.recentMistakes) {
      this.progress.recentMistakes = [];
    }
    // Avoid exact duplicate within the last 15 items to keep list diverse
    const exists = this.progress.recentMistakes.some(m => m.word.toLowerCase() === word.toLowerCase() && (!prompt || m.prompt === prompt));
    if (!exists) {
      this.progress.recentMistakes.unshift({
        id: "mistake_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        word,
        translation,
        prompt,
        options,
        answer,
        timestamp: new Date().toISOString()
      });
      // Cap at 25 recent mistakes so we don't grow indefinitely, but enough to build a solid review quiz
      if (this.progress.recentMistakes.length > 25) {
        this.progress.recentMistakes.pop();
      }
      this.save();
      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
    }
  }

  public getRecentMistakes(): MistakeItem[] {
    return this.progress.recentMistakes || [];
  }

  public removeMistake(id: string): void {
    if (this.progress.recentMistakes) {
      this.progress.recentMistakes = this.progress.recentMistakes.filter(m => m.id !== id);
      this.save();
      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
    }
  }

  public clearRecentMistakes(): void {
    this.progress.recentMistakes = [];
    this.save();
    window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
  }

  public addToRevisionDeck(word: string): void {
    const exists = this.progress.revisionDeck.some(item => item.word === word);
    if (!exists) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      this.progress.revisionDeck.push({
        word,
        interval: 1,
        nextReview: tomorrow.toISOString(),
      });

      const todayKey = new Date().toDateString();
      if (!this.progress.dailyVocabAcquired) {
        this.progress.dailyVocabAcquired = {};
      }
      this.progress.dailyVocabAcquired[todayKey] = (this.progress.dailyVocabAcquired[todayKey] || 0) + 1;

      this.save();
    }
  }

  public reviewWord(word: string, wasCorrect: boolean): void {
    const item = this.progress.revisionDeck.find(i => i.word === word);
    if (item) {
      if (wasCorrect) {
        item.interval *= 2; // Spaced repetition spacing
      } else {
        item.interval = 1; // Reset
      }
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + item.interval);
      item.nextReview = nextDate.toISOString();
      this.save();
    }
  }

  public setRole(role: "apprenant" | "enseignant" | "ecole" | "admin"): void {
    this.progress.role = role;
    this.save();
  }

  public updateAccessibility(updates: Partial<UserProgress["accessibility"]>): void {
    this.progress.accessibility = { ...this.progress.accessibility, ...updates };
    if (updates.darkMode !== undefined) {
      try {
        localStorage.setItem("feheziko_dark_mode", updates.darkMode ? "true" : "false");
      } catch (e) {
        console.error("Failed to save feheziko_dark_mode to localStorage:", e);
      }
    }
    this.save();
  }

  public setSubscription(status: "free" | "premium", expiryDate: string | null): void {
    this.progress.subscription = { status, expiryDate };
    this.save();
  }

  public setSchoolCode(code: string): void {
    this.progress.schoolCode = code;
    this.save();
  }

  private getDaysDifference(dateStr1: string, dateStr2: string): number {
    try {
      const d1 = new Date(dateStr1);
      const d2 = new Date(dateStr2);
      d1.setHours(12, 0, 0, 0);
      d2.setHours(12, 0, 0, 0);
      const diffTime = d1.getTime() - d2.getTime();
      return Math.round(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }

  private checkAndUpdateStreakOnLoad(): void {
    if (!this.progress.lastActiveDate) {
      this.progress.streak = 0;
      this.progress.currentStreak = 0;
      return;
    }
    const todayStr = new Date().toDateString();
    const diffDays = this.getDaysDifference(todayStr, this.progress.lastActiveDate);
    if (diffDays > 1) {
      // User missed at least one whole calendar day, reset streak to 0
      this.progress.streak = 0;
      this.progress.currentStreak = 0;
      this.save();
    }
  }

  public updateStreak(): void {
    const todayStr = new Date().toDateString();
    const nowIso = new Date().toISOString();
    
    if (this.progress.lastActiveDate) {
      const diffDays = this.getDaysDifference(todayStr, this.progress.lastActiveDate);
      if (diffDays === 1) {
        // Active yesterday, so increase the streak today
        this.progress.streak = (this.progress.streak || 0) + 1;
        this.progress.currentStreak = this.progress.streak;
        this.progress.lastActiveDate = nowIso;
      } else if (diffDays > 1) {
        // Missed days - check freeze shield protection
        if (this.progress.freezeShields && this.progress.freezeShields > 0) {
          this.progress.freezeShields -= 1;
          this.progress.lastActiveDate = nowIso;
        } else {
          // Reset streak to 1 for today's active practice
          this.progress.streak = 1;
          this.progress.currentStreak = 1;
          this.progress.lastActiveDate = nowIso;
        }
      } else if (diffDays === 0) {
        // Already active today
        if (!this.progress.streak) {
          this.progress.streak = 1;
          this.progress.currentStreak = 1;
        }
        this.progress.lastActiveDate = nowIso;
      }
    } else {
      // First activity ever, streak is 1
      this.progress.streak = 1;
      this.progress.currentStreak = 1;
      this.progress.lastActiveDate = nowIso;
    }

    if ((this.progress.bestStreak || 0) < this.progress.streak) {
      this.progress.bestStreak = this.progress.streak;
    }

    this.save();

    // Automatically check and reward badges for daily streak milestone achievements
    if (typeof window !== "undefined" && (window as any).feheziko?.game) {
      (window as any).feheziko.game.checkAndAwardBadges();
    }
  }

  public incrementStreak(days: number = 1): void {
    this.progress.streak = (this.progress.streak || 0) + days;
    this.progress.currentStreak = this.progress.streak;
    if ((this.progress.bestStreak || 0) < this.progress.streak) {
      this.progress.bestStreak = this.progress.streak;
    }
    this.progress.lastActiveDate = new Date().toISOString();
    this.save();

    if (typeof window !== "undefined" && (window as any).feheziko?.game) {
      (window as any).feheziko.game.checkAndAwardBadges();
    }
    window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
  }

  private enqueueSync(event: any): void {
    try {
      const queue = JSON.parse(localStorage.getItem(DatabaseEngine.SYNC_QUEUE_KEY) || "[]");
      queue.push(event);
      localStorage.setItem(DatabaseEngine.SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error("Failed to enqueue sync event:", e);
    }
  }

  public getSyncQueueLength(): number {
    try {
      const queue = JSON.parse(localStorage.getItem(DatabaseEngine.SYNC_QUEUE_KEY) || "[]");
      return queue.length;
    } catch {
      return 0;
    }
  }

  public clearSyncQueue(): void {
    localStorage.setItem(DatabaseEngine.SYNC_QUEUE_KEY, JSON.stringify([]));
  }

  public getLastSyncedAt(): string | null {
    const history = this.getSyncHistory();
    const lastSuccess = history.find(item => item.status === "success");
    return lastSuccess ? lastSuccess.timestamp : null;
  }

  public getLastSyncLog(): SyncLogItem | null {
    const history = this.getSyncHistory();
    return history.length > 0 ? history[0] : null;
  }

  public getSyncHistory(): SyncLogItem[] {
    try {
      const data = localStorage.getItem(DatabaseEngine.SYNC_HISTORY_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error("Failed to load sync history:", e);
    }
    // Return default/pre-populated list for realistic feedback
    const defaultHistory: SyncLogItem[] = [
      {
        id: "sync_1",
        timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        status: "success",
        itemsSyncedCount: 2,
        payloadSummary: "xp_update, lesson_complete (Lesson #4)"
      },
      {
        id: "sync_2",
        timestamp: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
        status: "success",
        itemsSyncedCount: 1,
        payloadSummary: "dialogue_complete (Dialogue #1)"
      },
      {
        id: "sync_3",
        timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        status: "failed",
        itemsSyncedCount: 3,
        errorMessage: "Network Timeout: Server did not respond in 5000ms",
        payloadSummary: "xp_update, lesson_complete, dialogue_complete"
      },
      {
        id: "sync_4",
        timestamp: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
        status: "success",
        itemsSyncedCount: 2,
        payloadSummary: "xp_update, school_link"
      }
    ];
    try {
      localStorage.setItem(DatabaseEngine.SYNC_HISTORY_KEY, JSON.stringify(defaultHistory));
    } catch {}
    return defaultHistory;
  }

  public addSyncLog(status: "success" | "failed", count: number, payloadSummary: string, errorMessage?: string): void {
    try {
      const history = this.getSyncHistory();
      const newLog: SyncLogItem = {
        id: "sync_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        timestamp: new Date().toISOString(),
        status,
        itemsSyncedCount: count,
        payloadSummary,
        errorMessage
      };
      history.unshift(newLog);
      localStorage.setItem(DatabaseEngine.SYNC_HISTORY_KEY, JSON.stringify(history));
      window.dispatchEvent(new CustomEvent("feheziko_sync_history_updated"));
    } catch (e) {
      console.error("Failed to add sync log:", e);
    }
  }

  public clearSyncHistory(): void {
    localStorage.setItem(DatabaseEngine.SYNC_HISTORY_KEY, JSON.stringify([]));
    window.dispatchEvent(new CustomEvent("feheziko_sync_history_updated"));
  }

  public async triggerSync(): Promise<boolean> {
    const queueLength = this.getSyncQueueLength();
    let queue: any[] = [];
    try {
      queue = JSON.parse(localStorage.getItem(DatabaseEngine.SYNC_QUEUE_KEY) || "[]");
    } catch {}

    const payloadSummary = queue.length > 0
      ? queue.map((q: any) => q.type).join(", ")
      : "No new activity";

    const isAvailable = this.isNetworkAvailable();

    if (!isAvailable) {
      const errMsg = this.isForcedOffline()
        ? "Network request blocked: Manual Force Offline Mode is enabled."
        : "Connection error: Device is offline. Offline progress remains in queue.";
      this.addSyncLog("failed", queueLength, payloadSummary, errMsg);
      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
      return false;
    }

    try {
      // Simulate network request delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      this.clearSyncQueue();
      this.addSyncLog("success", queueLength, queueLength > 0 ? payloadSummary : "Heartbeat / Health check");
      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
      return true;
    } catch (err: any) {
      this.addSyncLog("failed", queueLength, payloadSummary, err.message || "Unknown synchronization error");
      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
      return false;
    }
  }

  // --- COMMUNITY CHALLENGES DATA METHODS ---

  private static CHALLENGE_BESTS_KEY = "feheziko_challenge_bests";
  private static COMMUNITY_SCORES_KEY = "feheziko_community_scores";

  public getChallengeBests(): { [phraseId: string]: number } {
    try {
      const data = localStorage.getItem(DatabaseEngine.CHALLENGE_BESTS_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error("Failed to load challenge bests:", e);
      return {};
    }
  }

  public saveChallengeScore(phraseId: string, score: number): void {
    try {
      const bests = this.getChallengeBests();
      if (!bests[phraseId] || score > bests[phraseId]) {
        bests[phraseId] = score;
        localStorage.setItem(DatabaseEngine.CHALLENGE_BESTS_KEY, JSON.stringify(bests));
        
        // Push to sync queue
        const queue = JSON.parse(localStorage.getItem("feheziko_sync_queue") || "[]");
        queue.push({
          type: "challenge_score",
          phraseId,
          score,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem("feheziko_sync_queue", JSON.stringify(queue));
        
        window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
      }
    } catch (e) {
      console.error("Failed to save challenge score:", e);
    }
  }

  public getCommunityScores(phraseId: string): any[] {
    const defaultScores: { [key: string]: any[] } = {
      "l1_ph1": [
        { name: "Rabe_Mavitrika", score: 94, timestamp: "2026-07-11T12:00:00.000Z" },
        { name: "Soa_Polyglot", score: 89, timestamp: "2026-07-11T15:30:00.000Z" },
        { name: "Anonyme_74", score: 82, timestamp: "2026-07-12T01:10:00.000Z" },
        { name: "Gasy_A1", score: 75, timestamp: "2026-07-10T09:45:00.000Z" }
      ],
      "l1_ph2": [
        { name: "Orateur_88", score: 96, timestamp: "2026-07-11T14:20:00.000Z" },
        { name: "Mpianatra_Gasy", score: 91, timestamp: "2026-07-11T18:05:00.000Z" },
        { name: "Anonyme_12", score: 85, timestamp: "2026-07-12T02:00:00.000Z" },
        { name: "Kolo_Teny", score: 78, timestamp: "2026-07-09T16:50:00.000Z" }
      ],
      "l1_ph3": [
        { name: "Polyglot_Soa", score: 95, timestamp: "2026-07-11T10:15:00.000Z" },
        { name: "Malagasy_Learner", score: 88, timestamp: "2026-07-11T21:40:00.000Z" },
        { name: "Anonyme_99", score: 81, timestamp: "2026-07-12T00:30:00.000Z" },
        { name: "Fiderana_33", score: 76, timestamp: "2026-07-10T11:25:00.000Z" }
      ],
      "l2_ph1": [
        { name: "Mpivarotra_Andravoahangy", score: 97, timestamp: "2026-07-11T08:12:00.000Z" },
        { name: "Anonyme_05", score: 90, timestamp: "2026-07-11T23:50:00.000Z" },
        { name: "Shopping_Queen", score: 84, timestamp: "2026-07-12T01:55:00.000Z" },
        { name: "Gasy_Voyageur", score: 79, timestamp: "2026-07-10T14:10:00.000Z" }
      ],
      "l2_ph2": [
        { name: "Tena_Cher", score: 93, timestamp: "2026-07-11T07:45:00.000Z" },
        { name: "Rabe_Ariary", score: 87, timestamp: "2026-07-11T19:33:00.000Z" },
        { name: "Anonyme_41", score: 82, timestamp: "2026-07-11T22:15:00.000Z" },
        { name: "Negotiator_Pro", score: 74, timestamp: "2026-07-10T13:00:00.000Z" }
      ],
      "l2_ph3": [
        { name: "Akondro_Telo", score: 95, timestamp: "2026-07-11T09:00:00.000Z" },
        { name: "Saka_Mavitrika", score: 89, timestamp: "2026-07-11T13:45:00.000Z" },
        { name: "Anonyme_15", score: 83, timestamp: "2026-07-12T01:22:00.000Z" },
        { name: "Voka_Gasy", score: 76, timestamp: "2026-07-10T17:11:00.000Z" }
      ]
    };

    try {
      const stored = localStorage.getItem(DatabaseEngine.COMMUNITY_SCORES_KEY);
      const communityScores = stored ? JSON.parse(stored) : {};
      
      const list = communityScores[phraseId] || defaultScores[phraseId] || [];
      // Sort descending by score
      return list.sort((a: any, b: any) => b.score - a.score);
    } catch (e) {
      console.error("Failed to load community scores:", e);
      return defaultScores[phraseId] || [];
    }
  }

  public submitCommunityScore(phraseId: string, name: string, score: number): void {
    try {
      const stored = localStorage.getItem(DatabaseEngine.COMMUNITY_SCORES_KEY);
      const communityScores = stored ? JSON.parse(stored) : {};
      
      if (!communityScores[phraseId]) {
        // Retrieve initial default scores to seed it
        communityScores[phraseId] = this.getCommunityScores(phraseId);
      }
      
      const newEntry = {
        name: name.trim() || "Anonyme",
        score,
        timestamp: new Date().toISOString()
      };

      communityScores[phraseId].push(newEntry);
      // Keep only top 50 scores
      communityScores[phraseId].sort((a: any, b: any) => b.score - a.score);
      communityScores[phraseId] = communityScores[phraseId].slice(0, 50);

      localStorage.setItem(DatabaseEngine.COMMUNITY_SCORES_KEY, JSON.stringify(communityScores));
      
      // Also register XP for submitting community challenge score
      this.addXp(10);
      
      // Post to sync queue
      const queue = JSON.parse(localStorage.getItem("feheziko_sync_queue") || "[]");
      queue.push({
        type: "community_submission",
        phraseId,
        name: newEntry.name,
        score,
        timestamp: newEntry.timestamp
      });
      localStorage.setItem("feheziko_sync_queue", JSON.stringify(queue));

      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
      window.dispatchEvent(new CustomEvent("feheziko_challenges_updated"));
    } catch (e) {
      console.error("Failed to submit community score:", e);
    }
  }

  // --- GLOBAL XP LEADERBOARD METHODS ---

  private static GLOBAL_XP_LEADERBOARD_KEY = "feheziko_global_xp_leaderboard";

  public getGlobalXpLeaderboard(): Array<{
    id: string;
    name: string;
    avatar: string;
    flag: string;
    xp: number;
    streak: number;
    completedLessons: number;
    league: string;
    isUser?: boolean;
    role?: string;
  }> {
    const defaultLeaderboard = [
      { id: "p1", name: "Andry_Polyglot", avatar: "🦁", flag: "🇲🇬", xp: 1450, streak: 14, completedLessons: 18, league: "Diamant", role: "Apprenant" },
      { id: "p2", name: "Fitia_Tana", avatar: "🌺", flag: "🇲🇬", xp: 1220, streak: 9, completedLessons: 15, league: "Diamant", role: "Apprenant" },
      { id: "p3", name: "Jean_Marc_Fr", avatar: "🗼", flag: "🇫🇷", xp: 980, streak: 12, completedLessons: 12, league: "Or", role: "Apprenant" },
      { id: "p4", name: "Tahina_Mavitrika", avatar: "⚡", flag: "🇲🇬", xp: 850, streak: 7, completedLessons: 10, league: "Or", role: "Apprenant" },
      { id: "p5", name: "Mialy_Antsirabe", avatar: "🚲", flag: "🇲🇬", xp: 720, streak: 5, completedLessons: 8, league: "Or", role: "Apprenant" },
      { id: "p6", name: "Clara_Bordeaux", avatar: "🎨", flag: "🇫🇷", xp: 640, streak: 6, completedLessons: 7, league: "Argent", role: "Apprenant" },
      { id: "p7", name: "Solo_Toamasina", avatar: "🌊", flag: "🇲🇬", xp: 510, streak: 4, completedLessons: 6, league: "Argent", role: "Apprenant" },
      { id: "p8", name: "Hery_Majunga", avatar: "🌴", flag: "🇲🇬", xp: 430, streak: 3, completedLessons: 5, league: "Argent", role: "Apprenant" },
      { id: "p9", name: "Nirina_Fianar", avatar: "🍇", flag: "🇲🇬", xp: 350, streak: 2, completedLessons: 4, league: "Bronze", role: "Apprenant" },
      { id: "p10", name: "Luc_Lyon", avatar: "🦁", flag: "🇫🇷", xp: 280, streak: 2, completedLessons: 3, league: "Bronze", role: "Apprenant" }
    ];

    try {
      const stored = localStorage.getItem(DatabaseEngine.GLOBAL_XP_LEADERBOARD_KEY);
      let list = stored ? JSON.parse(stored) : defaultLeaderboard;

      // Current User
      const userXp = this.progress.xp || 0;
      const userStreak = this.progress.currentStreak || this.progress.streak || 0;
      const userCompletedCount = this.progress.completedLessons?.length || 0;
      const userName = (this.progress as any).studentName || localStorage.getItem("feheziko_user_nickname") || "Mpianatra (Vous)";
      const userAvatar = localStorage.getItem("feheziko_user_avatar") || "🎓";
      const userFlag = localStorage.getItem("feheziko_user_flag") || "🇲🇬";

      // Determine league based on XP
      let userLeague = "Bronze";
      if (userXp >= 1000) userLeague = "Diamant";
      else if (userXp >= 700) userLeague = "Or";
      else if (userXp >= 400) userLeague = "Argent";

      // Check if user entry already in list
      const userIndex = list.findIndex((item: any) => item.isUser || item.id === "current_user");
      const userEntry = {
        id: "current_user",
        name: userName,
        avatar: userAvatar,
        flag: userFlag,
        xp: userXp,
        streak: userStreak,
        completedLessons: userCompletedCount,
        league: userLeague,
        isUser: true,
        role: this.progress.role === "enseignant" ? "Enseignant" : "Apprenant"
      };

      if (userIndex !== -1) {
        list[userIndex] = userEntry;
      } else {
        list.push(userEntry);
      }

      // Sort descending by XP
      list.sort((a: any, b: any) => b.xp - a.xp);

      return list;
    } catch (e) {
      console.error("Failed to load global XP leaderboard:", e);
      return defaultLeaderboard;
    }
  }

  public updateUserXpLeaderboardName(newName: string, avatar?: string, flag?: string): void {
    if (newName && newName.trim()) {
      (this.progress as any).studentName = newName.trim();
      localStorage.setItem("feheziko_user_nickname", newName.trim());
      if (avatar) localStorage.setItem("feheziko_user_avatar", avatar);
      if (flag) localStorage.setItem("feheziko_user_flag", flag);
      this.save();
      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
    }
  }

  // --- Admin Entity Management for Feheziko Platform ---
  public getAdminEntities(): AdminEntity[] {
    try {
      const stored = localStorage.getItem(DatabaseEngine.ADMIN_ENTITIES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const now = new Date().getTime();
          return parsed.map((e: AdminEntity) => {
            const expTime = new Date(e.trialExpiryDate).getTime();
            if (e.status === "trial" && now > expTime) {
              return { ...e, status: "expired" as const };
            }
            return e;
          });
        }
      }
    } catch (err) {
      console.error("Failed to load admin entities:", err);
    }

    // Default Seed Data with realistic Malagasy registrations
    const now = new Date();
    const isoDaysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();
    const isoDaysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000).toISOString();

    const seed: AdminEntity[] = [
      {
        id: "sch_01",
        name: "Lycée J.J. Rabearivelo",
        type: "ecole",
        email: "direction@rabearivelo.edu.mg",
        phone: "+261 34 11 223 34",
        location: "Antananarivo (Analakely)",
        registeredAt: isoDaysAgo(2),
        trialStartDate: isoDaysAgo(2),
        trialExpiryDate: isoDaysFromNow(3), // 5 days total trial
        status: "trial",
        plan: "free_trial",
        maxSeats: 50,
        assignedStudents: 42,
        notes: "Essai gratuit 5 jours en cours pour la classe de 2nde.",
        amountPaidMga: 0
      },
      {
        id: "sch_02",
        name: "Collège Saint-Michel",
        type: "ecole",
        email: "contact@saintmichel.mg",
        phone: "+261 32 05 889 00",
        location: "Antananarivo (Amparibe)",
        registeredAt: isoDaysAgo(12),
        trialStartDate: isoDaysAgo(12),
        trialExpiryDate: isoDaysAgo(7),
        status: "active",
        plan: "school_pack_100",
        maxSeats: 100,
        assignedStudents: 88,
        paymentRef: "MVOLA-884920",
        notes: "Abonnement annuel pack 100 élèves validé via MVola.",
        amountPaidMga: 600000
      },
      {
        id: "sch_03",
        name: "Lycée Jacques Rabemananjara",
        type: "ecole",
        email: "lycee.rabemananjara@gmail.com",
        phone: "+261 33 14 556 78",
        location: "Toamasina (Tamatave)",
        registeredAt: isoDaysAgo(6),
        trialStartDate: isoDaysAgo(6),
        trialExpiryDate: isoDaysAgo(1), // Expired yesterday
        status: "expired",
        plan: "free_trial",
        maxSeats: 50,
        assignedStudents: 29,
        notes: "Essai de 5 jours terminé. Relance pour paiement Orange Money.",
        amountPaidMga: 0
      },
      {
        id: "tch_01",
        name: "Prof. Jean-Claude Rakoto",
        type: "enseignant",
        email: "jc.rakoto@gmail.com",
        phone: "+261 34 99 112 33",
        location: "Fianarantsoa",
        registeredAt: isoDaysAgo(1),
        trialStartDate: isoDaysAgo(1),
        trialExpiryDate: isoDaysFromNow(4),
        status: "trial",
        plan: "free_trial",
        maxSeats: 30,
        assignedStudents: 18,
        notes: "Professeur de Français collège. Essai 5 jours actif.",
        amountPaidMga: 0
      },
      {
        id: "tch_02",
        name: "Mme Marie-Claire Rasoa",
        type: "enseignant",
        email: "mc.rasoa@yahoo.fr",
        phone: "+261 32 44 556 11",
        location: "Mahajanga (Majunga)",
        registeredAt: isoDaysAgo(14),
        trialStartDate: isoDaysAgo(14),
        trialExpiryDate: isoDaysAgo(9),
        status: "active",
        plan: "teacher_pack_30",
        maxSeats: 30,
        assignedStudents: 28,
        paymentRef: "OM-993021",
        notes: "Pack Enseignant 30 élèves réglé via Orange Money.",
        amountPaidMga: 150000
      },
      {
        id: "lrn_01",
        name: "Soa Harilala Randria",
        type: "apprenant",
        email: "soa.randria@gmail.com",
        phone: "+261 34 77 889 90",
        location: "Antsirabe",
        registeredAt: isoDaysAgo(3),
        trialStartDate: isoDaysAgo(3),
        trialExpiryDate: isoDaysFromNow(2),
        status: "trial",
        plan: "free_trial",
        maxSeats: 1,
        assignedStudents: 1,
        notes: "Préparation examen DELF A2. Essai 5j en cours.",
        amountPaidMga: 0
      },
      {
        id: "lrn_02",
        name: "Andry Nirina Ravelo",
        type: "apprenant",
        email: "andry.nirina@gmail.com",
        phone: "+261 33 22 334 45",
        location: "Antsiranana (Diego)",
        registeredAt: isoDaysAgo(20),
        trialStartDate: isoDaysAgo(20),
        trialExpiryDate: isoDaysAgo(15),
        status: "active",
        plan: "premium_monthly",
        maxSeats: 1,
        assignedStudents: 1,
        paymentRef: "TELMA-33921",
        notes: "Apprenant direct souscrit au plan mensuel 10 000 Ar.",
        amountPaidMga: 10000
      },
      {
        id: "lrn_03",
        name: "Faly Rasoanaivo",
        type: "apprenant",
        email: "faly.rasoanaivo@outlook.com",
        phone: "+261 34 55 667 88",
        location: "Toliara (Tuléar)",
        registeredAt: isoDaysAgo(8),
        trialStartDate: isoDaysAgo(8),
        trialExpiryDate: isoDaysAgo(3),
        status: "expired",
        plan: "free_trial",
        maxSeats: 1,
        assignedStudents: 1,
        notes: "Essai 5 jours expiré il y a 3 jours.",
        amountPaidMga: 0
      }
    ];

    this.saveAdminEntities(seed);
    return seed;
  }

  public saveAdminEntities(entities: AdminEntity[]): void {
    try {
      localStorage.setItem(DatabaseEngine.ADMIN_ENTITIES_KEY, JSON.stringify(entities));
    } catch (err) {
      console.error("Failed to save admin entities:", err);
    }
    window.dispatchEvent(new CustomEvent("feheziko_admin_data_changed"));
  }

  public addAdminEntity(
    data: {
      name: string;
      type: "ecole" | "enseignant" | "apprenant";
      email: string;
      phone: string;
      location: string;
      plan?: AdminEntity["plan"];
      maxSeats?: number;
      notes?: string;
    }
  ): AdminEntity {
    const entities = this.getAdminEntities();
    const now = new Date();
    const trialExpiry = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days trial

    const newEntity: AdminEntity = {
      id: `${data.type.slice(0, 3)}_${Date.now()}`,
      name: data.name.trim(),
      type: data.type,
      email: data.email.trim(),
      phone: data.phone.trim(),
      location: data.location.trim() || "Antananarivo",
      registeredAt: now.toISOString(),
      trialStartDate: now.toISOString(),
      trialExpiryDate: trialExpiry.toISOString(),
      status: "trial",
      plan: data.plan || "free_trial",
      maxSeats: data.maxSeats || (data.type === "ecole" ? 50 : data.type === "enseignant" ? 30 : 1),
      assignedStudents: 0,
      notes: data.notes || "Inscription initiale avec essai gratuit 5 jours.",
      amountPaidMga: 0
    };

    entities.unshift(newEntity);
    this.saveAdminEntities(entities);
    return newEntity;
  }

  public updateAdminEntity(id: string, updates: Partial<AdminEntity>): void {
    const entities = this.getAdminEntities();
    const idx = entities.findIndex(e => e.id === id);
    if (idx !== -1) {
      entities[idx] = { ...entities[idx], ...updates };
      this.saveAdminEntities(entities);
    }
  }

  public extendAdminEntityTrial(id: string, extraDays: number = 5): void {
    const entities = this.getAdminEntities();
    const idx = entities.findIndex(e => e.id === id);
    if (idx !== -1) {
      const currentExpiry = new Date(entities[idx].trialExpiryDate).getTime();
      const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now();
      const newExpiry = new Date(baseTime + extraDays * 24 * 60 * 60 * 1000).toISOString();
      
      entities[idx] = {
        ...entities[idx],
        trialExpiryDate: newExpiry,
        status: "trial",
        notes: (entities[idx].notes || "") + `\n[${new Date().toLocaleDateString()}] Essai prolongé de ${extraDays} jours par l'administrateur.`
      };
      this.saveAdminEntities(entities);
    }
  }

  public activateAdminEntitySubscription(
    id: string,
    plan: AdminEntity["plan"],
    amountPaidMga: number,
    paymentRef: string
  ): void {
    const entities = this.getAdminEntities();
    const idx = entities.findIndex(e => e.id === id);
    if (idx !== -1) {
      entities[idx] = {
        ...entities[idx],
        status: "active",
        plan: plan,
        amountPaidMga: amountPaidMga,
        paymentRef: paymentRef,
        notes: (entities[idx].notes || "") + `\n[${new Date().toLocaleDateString()}] Abonnement ${plan} activé par l'admin (Réf: ${paymentRef}, Montant: ${amountPaidMga.toLocaleString()} Ar).`
      };
      this.saveAdminEntities(entities);
    }
  }

  public deleteAdminEntity(id: string): void {
    const entities = this.getAdminEntities();
    const filtered = entities.filter(e => e.id !== id);
    this.saveAdminEntities(filtered);
  }
}

export class IndexedDBEngine {
  private dbName = "FehezikoDB";
  private dbVersion = 3;
  private db: IDBDatabase | null = null;

  public init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("lessons")) {
          db.createObjectStore("lessons", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("dialogues")) {
          db.createObjectStore("dialogues", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("voice_memos")) {
          const memoStore = db.createObjectStore("voice_memos", { keyPath: "id" });
          memoStore.createIndex("lessonId", "lessonId", { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  public getLesson(id: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }
      try {
        const transaction = this.db.transaction("lessons", "readonly");
        const store = transaction.objectStore("lessons");
        const request = store.get(id);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  public getAllLessons(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }
      try {
        const transaction = this.db.transaction("lessons", "readonly");
        const store = transaction.objectStore("lessons");
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result || []);
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  public saveLesson(lesson: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }
      try {
        const transaction = this.db.transaction("lessons", "readwrite");
        const store = transaction.objectStore("lessons");
        const request = store.put(lesson);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  public deleteLesson(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }
      try {
        const transaction = this.db.transaction("lessons", "readwrite");
        const store = transaction.objectStore("lessons");
        const request = store.delete(id);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  // --- Dialogue Store Methods ---
  public getDialogue(id: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }
      try {
        const transaction = this.db.transaction("dialogues", "readonly");
        const store = transaction.objectStore("dialogues");
        const request = store.get(id);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  public getAllDialogues(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }
      try {
        const transaction = this.db.transaction("dialogues", "readonly");
        const store = transaction.objectStore("dialogues");
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result || []);
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  public saveDialogue(dialogue: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }
      try {
        const transaction = this.db.transaction("dialogues", "readwrite");
        const store = transaction.objectStore("dialogues");
        const request = store.put(dialogue);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  public deleteDialogue(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }
      try {
        const transaction = this.db.transaction("dialogues", "readwrite");
        const store = transaction.objectStore("dialogues");
        const request = store.delete(id);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  public saveVoiceMemo(memo: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }
      try {
        const transaction = this.db.transaction("voice_memos", "readwrite");
        const store = transaction.objectStore("voice_memos");
        const request = store.put(memo);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  public getVoiceMemos(lessonId: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }
      try {
        const transaction = this.db.transaction("voice_memos", "readonly");
        const store = transaction.objectStore("voice_memos");
        const index = store.index("lessonId");
        const request = index.getAll(lessonId);

        request.onsuccess = () => {
          const results = request.result || [];
          results.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          resolve(results);
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  public getAllVoiceMemos(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }
      try {
        const transaction = this.db.transaction("voice_memos", "readonly");
        const store = transaction.objectStore("voice_memos");
        const request = store.getAll();

        request.onsuccess = () => {
          const results = request.result || [];
          results.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          resolve(results);
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  public deleteVoiceMemo(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }
      try {
        const transaction = this.db.transaction("voice_memos", "readwrite");
        const store = transaction.objectStore("voice_memos");
        const request = store.delete(id);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (e) {
        reject(e);
      }
    });
  }
}
