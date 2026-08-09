/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AI Architecture Abstraction Layer for Feheziko
 * Prepared for future AI model integration (LLM / Whisper / STT / TTS)
 * without adding heavy dependencies or memory overhead in Phase 1.
 */

export interface AITutorResponse {
  text: string;
  explanationMg?: string;
  explanationFr?: string;
  suggestedAction?: string;
  source: "local_rules" | "cloud_api" | "offline_llm";
}

export interface AIGrammarAnalysis {
  correction?: string;
  ruleExplainedMg: string;
  ruleExplainedFr: string;
  confidenceScore: number;
}

export class AIService {
  private isOnline: boolean = navigator.onLine;

  constructor() {
    window.addEventListener("online", () => { this.isOnline = true; });
    window.addEventListener("offline", () => { this.isOnline = false; });
  }

  /**
   * Lightweight local fallback response for instant offline explanation
   */
  public async getQuickGrammarHelp(ruleTitle: string, query: string, isMg: boolean): Promise<AITutorResponse> {
    // Phase 1: Fast local rule matching without heavy model inference
    await new Promise((resolve) => setTimeout(resolve, 80));

    if (isMg) {
      return {
        text: `Momban'ny ${ruleTitle}: ${query}. Ampiasao ny ohatra sy fampiharana ao amin'ny fampianarana ho fanamafisana.`,
        explanationMg: `Ampahany manan-danja amin'ny fitsipika mifehy ny fehezanteny izany.`,
        source: "local_rules"
      };
    }

    return {
      text: `À propos de ${ruleTitle} : ${query}. Utilisez les exemples pratiques ci-dessus pour vous exercer.`,
      explanationFr: `Règle clé pour la construction des phrases usuelles.`,
      source: "local_rules"
    };
  }

  /**
   * Placeholder for future cloud or WebLLM grammar correction
   */
  public async analyzeUserPhrase(phrase: string): Promise<AIGrammarAnalysis> {
    // Fast stub for Phase 1
    return {
      ruleExplainedMg: "Fiteny tsara sy mazava.",
      ruleExplainedFr: "Expression correcte et naturelle.",
      confidenceScore: 0.95
    };
  }
}
