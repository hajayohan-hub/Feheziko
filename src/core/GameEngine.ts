/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseEngine } from "./DatabaseEngine";

export interface GameBadge {
  id: string;
  nameMg: string;
  nameFr: string;
  descriptionMg: string;
  descriptionFr: string;
  icon: string;
  tokenReward: number;
  unlocked: boolean;
  unlockedAt?: string;
  progressCurrent: number;
  progressMax: number;
}

export class GameEngine {
  private db: DatabaseEngine;

  constructor(db: DatabaseEngine) {
    this.db = db;
    // Perform initial verification check in case any badge was earned previously but not registered
    this.checkAndAwardBadges();
  }

  /**
   * Completes a lesson, awards XP, registers the lesson, and updates the user's daily streak.
   * If the lesson is completed within 24 hours of the last session, the streak is incremented.
   * If more than 24 hours have passed, the streak resets to 1.
   */
  public completeLesson(lessonId: string, xpReward: number): void {
    const progress = this.db.getProgress();
    const now = new Date();

    if (progress.lastActiveDate) {
      const lastActiveTime = new Date(progress.lastActiveDate).getTime();
      const diffMs = now.getTime() - lastActiveTime;
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours <= 24) {
        // Increment streak if within 24 hours of the last active session
        progress.currentStreak = (progress.currentStreak || 0) + 1;
        progress.streak = progress.currentStreak;
      } else {
        // Reset streak to 1 if the 24-hour window was missed
        progress.currentStreak = 1;
        progress.streak = 1;
      }
    } else {
      // First activity ever, streak is 1
      progress.currentStreak = 1;
      progress.streak = 1;
    }

    // Set lastActiveDate to now as an ISO string
    progress.lastActiveDate = now.toISOString();

    // Store completed lesson in progress
    if (!progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
    }

    // Award XP
    progress.xp += xpReward;

    // Award study hours
    this.db.addStudyHours(0.4);

    this.db.save();

    // Check and award badges on lesson completion
    this.checkAndAwardBadges();

    // Trigger local state synchronization
    try {
      const SYNC_QUEUE_KEY = "feheziko_sync_queue";
      const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || "[]");
      queue.push({ type: "lesson_complete", lessonId, timestamp: now.toISOString() });
      queue.push({ type: "xp_update", xp: progress.xp, timestamp: now.toISOString() });
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error("Failed to enqueue sync event in GameEngine:", e);
    }
  }

  /**
   * Retrieves the comprehensive list of badges with their localized content, rewards, and dynamic progress state.
   */
  public getBadgesList(): GameBadge[] {
    const progress = this.db.getProgress();
    const unlockedList = progress.unlockedBadges || [];

    const lastActive = progress.lastActiveDate ? new Date(progress.lastActiveDate) : null;
    const activeHour = lastActive ? lastActive.getHours() : -1;

    // Early Bird: Active between 5 AM and 9 AM
    const isEarlyHour = activeHour >= 5 && activeHour < 9;
    const isEarlyBirdUnlocked = isEarlyHour || unlockedList.includes("early_bird");

    // Night Owl: Active between 10 PM (22) and 4 AM
    const isNightHour = activeHour >= 22 || (activeHour >= 0 && activeHour < 4);
    const isNightOwlUnlocked = isNightHour || unlockedList.includes("night_owl");

    // Challenge Star: High score >= 80% on any pronunciation challenge
    const bests = Object.values(this.db.getChallengeBests() || {});
    const maxChallengeScore = bests.length > 0 ? Math.max(...bests) : 0;
    const isChallengeStarUnlocked = maxChallengeScore >= 80 || unlockedList.includes("challenge_star");

    return [
      {
        id: "first_steps",
        nameMg: "Dingana Voalohany",
        nameFr: "Premiers Pas",
        descriptionMg: "Nahavita ny lesona voalohany",
        descriptionFr: "Première leçon terminée avec succès",
        icon: "✨",
        tokenReward: 10,
        unlocked: progress.completedLessons.length >= 1,
        progressCurrent: Math.min(1, progress.completedLessons.length),
        progressMax: 1
      },
      {
        id: "early_bird",
        nameMg: "Mifoha Maraina (Early Bird)",
        nameFr: "Lève-Tôt (Early Bird)",
        descriptionMg: "Nianatra maraina be (roharoha amin'ny 5:00 - 9:00 maraina)",
        descriptionFr: "Avoir étudié tôt le matin (entre 5h et 9h)",
        icon: "🌅",
        tokenReward: 25,
        unlocked: isEarlyBirdUnlocked,
        progressCurrent: isEarlyBirdUnlocked ? 1 : 0,
        progressMax: 1
      },
      {
        id: "streak_3",
        nameMg: "Tena Mavitrika (Assidu)",
        nameFr: "Étudiant Assidu",
        descriptionMg: "Manana hazo farafahakeliny 3 andro consecutive",
        descriptionFr: "Atteindre une série d'apprentissage de 3 jours consécutifs",
        icon: "🔥",
        tokenReward: 15,
        unlocked: (progress.streak || 0) >= 3 || (progress.currentStreak || 0) >= 3,
        progressCurrent: Math.min(3, Math.max(progress.streak || 0, progress.currentStreak || 0)),
        progressMax: 3
      },
      {
        id: "streak_7",
        nameMg: "Hazo 7 Andro (7-Day Streak)",
        nameFr: "Série de 7 Jours",
        descriptionMg: "Manana hazo farafahakeliny 7 andro miantoana",
        descriptionFr: "Atteindre une série d'apprentissage de 7 jours consécutifs",
        icon: "👑",
        tokenReward: 30,
        unlocked: (progress.streak || 0) >= 7 || (progress.currentStreak || 0) >= 7,
        progressCurrent: Math.min(7, Math.max(progress.streak || 0, progress.currentStreak || 0)),
        progressMax: 7
      },
      {
        id: "streak_14",
        nameMg: "Afo Olaimpika (14-Day Streak)",
        nameFr: "Flamme Olympique (14 Jours)",
        descriptionMg: "Manana hazo 14 andro consecutive am-paharisihana",
        descriptionFr: "Atteindre une série d'apprentissage de 14 jours consécutifs",
        icon: "🌋",
        tokenReward: 50,
        unlocked: (progress.streak || 0) >= 14 || (progress.currentStreak || 0) >= 14,
        progressCurrent: Math.min(14, Math.max(progress.streak || 0, progress.currentStreak || 0)),
        progressMax: 14
      },
      {
        id: "streak_30",
        nameMg: "Angano amin'ny Hazo (30-Day Streak)",
        nameFr: "Légende de la Régularité",
        descriptionMg: "Manana hazo 30 andro miantoana - Maitrise Absolue!",
        descriptionFr: "Atteindre un mois complet (30 jours) de pratique quotidienne",
        icon: "⚡",
        tokenReward: 100,
        unlocked: (progress.streak || 0) >= 30 || (progress.currentStreak || 0) >= 30,
        progressCurrent: Math.min(30, Math.max(progress.streak || 0, progress.currentStreak || 0)),
        progressMax: 30
      },
      {
        id: "xp_master_500",
        nameMg: "Mpangona XP (500 XP)",
        nameFr: "Maître XP (500 XP)",
        descriptionMg: "Nahazo 500 XP tamin'ny alalan'ny fampiharana",
        descriptionFr: "Accumuler au moins 500 points XP au total",
        icon: "⭐",
        tokenReward: 35,
        unlocked: (progress.xp || 0) >= 500,
        progressCurrent: Math.min(500, progress.xp || 0),
        progressMax: 500
      },
      {
        id: "vocab_20",
        nameMg: "Mpianatra Voambolana",
        nameFr: "Apprenti Vocabulaire",
        descriptionMg: "Nampiditra teny 20 ao amin'ny carnet SRS",
        descriptionFr: "Enregistrer 20 mots dans le carnet de révision SRS",
        icon: "📚",
        tokenReward: 20,
        unlocked: progress.revisionDeck.length >= 20,
        progressCurrent: Math.min(20, progress.revisionDeck.length),
        progressMax: 20
      },
      {
        id: "vocab_master_100",
        nameMg: "Voambolana 100 Voafehy",
        nameFr: "100 Mots Maîtrisés",
        descriptionMg: "Nampiditra teny 100 ao amin'ny reviziona SRS",
        descriptionFr: "Enregistrer 100 mots dans le carnet de révision SRS",
        icon: "📖",
        tokenReward: 50,
        unlocked: progress.revisionDeck.length >= 100,
        progressCurrent: Math.min(100, progress.revisionDeck.length),
        progressMax: 100
      },
      {
        id: "dialogue_champion",
        nameMg: "Mpandresy Lahatra",
        nameFr: "Champion de Dialogue",
        descriptionMg: "Nahavita dinika miisa 3 mivantana",
        descriptionFr: "Terminer 3 dialogues de la vie courante",
        icon: "🗣️",
        tokenReward: 20,
        unlocked: progress.completedDialogues.length >= 3,
        progressCurrent: Math.min(3, progress.completedDialogues.length),
        progressMax: 3
      },
      {
        id: "challenge_star",
        nameMg: "Kintan'ny Fanamby (Challenge Star)",
        nameFr: "Étoile des Défis",
        descriptionMg: "Naozy mihoatra ny 80% amin'ny fanamby ara-feho",
        descriptionFr: "Obtenir un score d'au moins 80% dans un défi de prononciation",
        icon: "🎯",
        tokenReward: 25,
        unlocked: isChallengeStarUnlocked,
        progressCurrent: Math.min(80, maxChallengeScore),
        progressMax: 80
      },
      {
        id: "night_owl",
        nameMg: "Paki-Nalina (Night Owl)",
        nameFr: "Oiseau de Nuit (Night Owl)",
        descriptionMg: "Nianatra tara alina (roharoha amin'ny 10:00 alina - 4:00 maraina)",
        descriptionFr: "Avoir étudié tard dans la nuit (entre 22h et 4h)",
        icon: "🦉",
        tokenReward: 25,
        unlocked: isNightOwlUnlocked,
        progressCurrent: isNightOwlUnlocked ? 1 : 0,
        progressMax: 1
      }
    ];
  }

  /**
   * Scans all badges for milestone triggers, registers unlocks, and awards digital tokens.
   */
  public checkAndAwardBadges(): string[] {
    const progress = this.db.getProgress();
    
    // Ensure badges storage structures exist
    if (!progress.unlockedBadges) {
      progress.unlockedBadges = [];
    }
    if (progress.tokens === undefined) {
      progress.tokens = 0;
    }

    const badges = this.getBadgesList();
    const newlyUnlocked: string[] = [];

    for (const badge of badges) {
      if (badge.unlocked && !progress.unlockedBadges.includes(badge.id)) {
        progress.unlockedBadges.push(badge.id);
        progress.tokens += badge.tokenReward;
        newlyUnlocked.push(badge.id);
      }
    }

    if (newlyUnlocked.length > 0) {
      this.db.save();
      
      // Dispatch events to notify other views/modules about the unlock celebration
      window.dispatchEvent(
        new CustomEvent("feheziko_badge_unlocked", {
          detail: { badgeIds: newlyUnlocked }
        })
      );
      window.dispatchEvent(new CustomEvent("feheziko_state_changed"));
    }

    return newlyUnlocked;
  }
}
