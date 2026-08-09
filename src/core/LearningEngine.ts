/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseEngine } from "./DatabaseEngine";

export interface Challenge {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  progressMax: number;
  progressCurrent: number;
  completed: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
}

export class LearningEngine {
  private db: DatabaseEngine;

  constructor(db: DatabaseEngine) {
    this.db = db;
  }

  public getLevel(): number {
    const xp = this.db.getProgress().xp;
    // Level formula: Level = floor(sqrt(xp / 100)) + 1
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  public getXpForNextLevel(): number {
    const currentLevel = this.getLevel();
    return Math.pow(currentLevel, 2) * 100;
  }

  public getXpForCurrentLevelBase(): number {
    const currentLevel = this.getLevel();
    if (currentLevel === 1) return 0;
    return Math.pow(currentLevel - 1, 2) * 100;
  }

  public getProgressPercentage(): number {
    const xp = this.db.getProgress().xp;
    const base = this.getXpForCurrentLevelBase();
    const next = this.getXpForNextLevel();
    const range = next - base;
    const relativeXp = xp - base;
    return Math.min(100, Math.max(0, Math.floor((relativeXp / range) * 100)));
  }

  public getChallenges(): Challenge[] {
    const progress = this.db.getProgress();
    return [
      {
        id: "streak_3",
        title: "Fahazarana tsara (Bonne Habitude)",
        description: "Hazo 3 andro misesy (Atteindre une série de 3 jours)",
        xpReward: 100,
        progressMax: 3,
        progressCurrent: progress.streak,
        completed: progress.streak >= 3,
      },
      {
        id: "lessons_2",
        title: "Tia fahalalana (Amoureux du savoir)",
        description: "Mahavita lesona 2 (Terminer 2 leçons)",
        xpReward: 150,
        progressMax: 2,
        progressCurrent: progress.completedLessons.length,
        completed: progress.completedLessons.length >= 2,
      },
      {
        id: "xp_150",
        title: "Tena mahay (Surdoué)",
        description: "Mahazo 150 XP amin'ny fampiharana (Obtenir 150 XP)",
        xpReward: 200,
        progressMax: 150,
        progressCurrent: progress.xp,
        completed: progress.xp >= 150,
      }
    ];
  }

  public getBadges(): Badge[] {
    const progress = this.db.getProgress();
    return [
      {
        id: "first_steps",
        name: "Dingana Voalohany (Premiers Pas)",
        description: "Nahavita ny lesona voalohany (Première leçon terminée)",
        icon: "✨",
        unlockedAt: progress.completedLessons.length > 0 ? new Date().toLocaleDateString() : null,
      },
      {
        id: "speaker",
        name: "Mpandresy lahatra (Orateur)",
        description: "Nahavita ny fifanakalozana voalohany (Premier dialogue terminé)",
        icon: "🗣️",
        unlockedAt: progress.completedDialogues.length > 0 ? new Date().toLocaleDateString() : null,
      },
      {
        id: "constant",
        name: "Tena Mavitrika (Assidu)",
        description: "Manana hazo farafahakeliny 3 andro (Série d'au moins 3 jours)",
        icon: "🔥",
        unlockedAt: progress.streak >= 3 ? new Date().toLocaleDateString() : null,
      }
    ];
  }
}
