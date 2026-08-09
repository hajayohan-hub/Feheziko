/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseEngine } from "./DatabaseEngine";

export class NotificationManager {
  private db: DatabaseEngine;

  constructor(db: DatabaseEngine) {
    this.db = db;
  }

  /**
   * Initializes notification checking and permission requesting.
   */
  public async init() {
    if (!("Notification" in window)) {
      console.log("[Notification Manager] This browser does not support notifications.");
      return;
    }

    // Gentle automatic request if not yet granted/denied
    if (Notification.permission === "default") {
      this.requestPermission();
    } else if (Notification.permission === "granted") {
      this.checkAndNotifyInactive();
      this.scheduleFutureReminder();
    }
  }

  /**
   * Request push notification permissions.
   */
  public async requestPermission(): Promise<boolean> {
    if (!("Notification" in window)) return false;
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        console.log("[Notification Manager] Notification permission granted!");
        this.checkAndNotifyInactive();
        this.scheduleFutureReminder();
        return true;
      }
    } catch (e) {
      console.error("[Notification Manager] Error requesting notification permission:", e);
    }
    return false;
  }

  /**
   * Checks if the user hasn't studied for over 24 hours.
   * If so, triggers an immediate push notification alert.
   */
  private checkAndNotifyInactive() {
    const progress = this.db.getProgress();
    if (!progress.lastActiveDate) return;

    const lastActive = new Date(progress.lastActiveDate).getTime();
    const now = Date.now();
    const diffMs = now - lastActive;
    const diffHours = diffMs / (1000 * 60 * 60);

    console.log(`[Notification Manager] Hours since last study session: ${diffHours.toFixed(1)}h`);

    if (diffHours >= 24) {
      const isMg = progress.accessibility.language === "mg";
      const title = isMg ? "Reminder to Practice 🌟" : "Rappel de pratique 🌟";
      const body = isMg 
        ? "Mandalo 24 ora izay no tsy nianaranao teny frantsay! Andao hizatra kely mivantana mialoha ny hatoriana."
        : "Cela fait plus de 24h que vous n'avez pas pratiqué votre français ! Prenons 5 minutes pour réviser.";

      this.showLocalNotification(title, body);
    }
  }

  /**
   * Schedules a reminder 24 hours in the future if they don't return.
   */
  public scheduleFutureReminder() {
    if (Notification.permission !== "granted") return;

    console.log("[Notification Manager] Scheduling gentle '24h inactivity' reminder in background...");

    // Send a message to our Service Worker if registered to schedule an offline background alarm
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "schedule_reminder",
        delayMs: 24 * 60 * 60 * 1000, // 24 hours
        title: "Reminder to Practice 🌟",
        body: "Mandalo 24 ora izay no tsy nianaranao teny frantsay! Andao hanohy ny lalan'ny fahombiazana."
      });
    } else {
      // Fallback: Use standard setTimeout in current session
      setTimeout(() => {
        const progress = this.db.getProgress();
        if (progress.lastActiveDate) {
          const lastActive = new Date(progress.lastActiveDate).getTime();
          const elapsed = Date.now() - lastActive;
          if (elapsed >= 24 * 60 * 60 * 1000) {
            this.showLocalNotification(
              "Reminder to Practice 🌟",
              "Mandalo 24 ora izay no tsy nianaranao teny frantsay! Andao hizatra kely indray."
            );
          }
        }
      }, 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Triggers a local browser notification.
   */
  private showLocalNotification(title: string, body: string) {
    if (Notification.permission !== "granted") return;

    // Use Service Worker if available for reliable background execution, or fallback to standard Notification
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body,
          icon: "/icon.jpg",
          badge: "/icon.jpg",
          tag: "feheziko-practice-reminder",
          requireInteraction: true,
          silent: false,
        });
      }).catch(() => {
        new Notification(title, { body, icon: "/icon.jpg" });
      });
    } else {
      new Notification(title, { body, icon: "/icon.jpg" });
    }
  }
}
