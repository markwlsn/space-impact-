import { HighScoreRecord } from '../types';
import { databaseService, CloudScoreRecord } from '../services/DatabaseService';
import { shopManager } from './ShopManager';

const STORAGE_KEY = 'space_impact_highscores_v2';
const PILOT_STORAGE_KEY = 'space_impact_pilot_callsign_v1';

export class HighScoreManager {
  private highScores: HighScoreRecord[] = [];
  public currentPilot: string = 'PILOT_1';

  constructor() {
    this.loadPilotName();
    this.loadScores();
    this.initRealtimeSync();
  }

  public getHighScores(): HighScoreRecord[] {
    return [...this.highScores];
  }

  public setPilotName(name: string): void {
    const formatted = name.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 10);
    this.currentPilot = formatted || 'PILOT_1';
    try {
      localStorage.setItem(PILOT_STORAGE_KEY, this.currentPilot);
    } catch {
      // Ignore
    }
  }

  public getPilotName(): string {
    return this.currentPilot;
  }

  /**
   * Evaluates the player's live ranking against the leaderboard in real time
   */
  public getLiveRank(currentScore: number): {
    rank: number;
    nextTargetScore: number;
    nextTargetName: string;
    diffToNext: number;
  } {
    let rank = this.highScores.length + 1;
    let nextTargetScore = 0;
    let nextTargetName = 'CHAMPION';

    for (let i = 0; i < this.highScores.length; i++) {
      if (currentScore > this.highScores[i].score) {
        rank = i + 1;
        break;
      }
    }

    if (rank > 1 && rank - 2 >= 0 && rank - 2 < this.highScores.length) {
      const target = this.highScores[rank - 2];
      nextTargetScore = target.score;
      nextTargetName = target.initials;
    } else if (this.highScores.length > 0) {
      nextTargetScore = this.highScores[0].score;
      nextTargetName = this.highScores[0].initials;
    }

    const diffToNext = Math.max(0, nextTargetScore - currentScore);

    return {
      rank,
      nextTargetScore,
      nextTargetName,
      diffToNext,
    };
  }

  /**
   * Returns leaderboard placements starting from Rank #1 down to the player's current live score
   * Satisfies arcade feel of displaying from rank 1 to current placement
   */
  public getPlacementToCurrentScore(
    currentScore: number,
    pilotName: string
  ): {
    rank: number;
    initials: string;
    score: number;
    isCurrentPlayer: boolean;
  }[] {
    const all = this.getAllPlacements(currentScore, pilotName);
    const playerIdx = all.findIndex((item) => item.isCurrentPlayer);
    return all.slice(0, Math.max(playerIdx + 1, 1));
  }

  /**
   * Returns full placement table with player inserted at their live rank
   */
  public getAllPlacements(
    currentScore: number,
    pilotName: string
  ): {
    rank: number;
    initials: string;
    score: number;
    isCurrentPlayer: boolean;
  }[] {
    const list: { rank: number; initials: string; score: number; isCurrentPlayer: boolean }[] = [];
    const cleanPilot = (pilotName.trim().toUpperCase() || this.currentPilot).slice(0, 10);

    let playerInserted = false;
    let rankCounter = 1;

    for (let i = 0; i < this.highScores.length; i++) {
      const rec = this.highScores[i];
      if (!playerInserted && currentScore >= rec.score) {
        list.push({
          rank: rankCounter++,
          initials: cleanPilot,
          score: currentScore,
          isCurrentPlayer: true,
        });
        playerInserted = true;
      }
      list.push({
        rank: rankCounter++,
        initials: rec.initials,
        score: rec.score,
        isCurrentPlayer: false,
      });
    }

    if (!playerInserted) {
      list.push({
        rank: rankCounter,
        initials: cleanPilot,
        score: currentScore,
        isCurrentPlayer: true,
      });
    }

    return list;
  }

  public isHighScore(score: number): boolean {
    if (score <= 0) return false;
    if (this.highScores.length < 8) return true;
    return score > this.highScores[this.highScores.length - 1].score;
  }

  public addScore(initials: string, score: number, stage: number): void {
    const cleanInitials = (initials.trim().toUpperCase() || this.currentPilot).slice(0, 10);
    const newRecord: HighScoreRecord = {
      initials: cleanInitials,
      score,
      stage,
      date: new Date().toISOString().split('T')[0],
    };

    this.mergeScore(newRecord);

    // Broadcast to Supabase Realtime cloud database in background
    const equippedShip = shopManager.getEquippedShip();
    databaseService
      .submitScore(cleanInitials, score, stage, equippedShip.id)
      .catch((err) => console.warn('[HighScoreManager] Failed to submit score to cloud:', err));
  }

  private mergeScore(record: HighScoreRecord): void {
    // Avoid exact duplicate inserts
    const exists = this.highScores.some(
      (h) => h.initials === record.initials && h.score === record.score && h.stage === record.stage
    );
    if (!exists) {
      this.highScores.push(record);
      this.highScores.sort((a, b) => b.score - a.score);
      this.highScores = this.highScores.slice(0, 8); // Keep top 8 arcade placement
      this.saveScores();
    }
  }

  private async initRealtimeSync(): Promise<void> {
    // 1. Fetch initial top scores from cloud
    try {
      const cloudScores = await databaseService.fetchTopScores(8);
      if (cloudScores && cloudScores.length > 0) {
        cloudScores.forEach((cs: CloudScoreRecord) => {
          this.mergeScore({
            initials: cs.pilot_name,
            score: cs.score,
            stage: cs.stage,
            date: cs.created_at ? cs.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          });
        });
      }
    } catch (e) {
      console.warn('[HighScoreManager] Initial cloud sync failed:', e);
    }

    // 2. Listen to real-time incoming scores from other players
    databaseService.onNewScore((cs: CloudScoreRecord) => {
      this.mergeScore({
        initials: cs.pilot_name,
        score: cs.score,
        stage: cs.stage,
        date: cs.created_at ? cs.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      });
    });
  }

  private loadPilotName(): void {
    try {
      const saved = localStorage.getItem(PILOT_STORAGE_KEY);
      if (saved) {
        this.currentPilot = saved.slice(0, 10);
      }
    } catch {
      this.currentPilot = 'PILOT_1';
    }
  }

  private loadScores(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        this.highScores = JSON.parse(data);
        if (this.highScores.length > 0) return;
      }
    } catch (e) {
      console.warn('Could not read high scores from localStorage:', e);
    }

    // Legendary Arcade Hall of Fame (Developer Markwlsn at #1)
    this.highScores = [
      { initials: 'MARKWLSN', score: 99990, stage: 5, date: '2026-09-15' },
      { initials: 'NOKIA-3310', score: 55000, stage: 3, date: '2000-11-09' },
      { initials: 'NEO-PILOT', score: 38000, stage: 2, date: '2026-02-14' },
      { initials: 'CYBER-ACE', score: 26000, stage: 2, date: '2026-05-18' },
      { initials: 'STAR-LORD', score: 18500, stage: 1, date: '2026-07-22' },
      { initials: 'RETRO-WORM', score: 12000, stage: 1, date: '2026-08-05' },
      { initials: 'VIPER', score: 7500, stage: 1, date: '2026-09-01' },
    ];
    this.saveScores();
  }

  private saveScores(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.highScores));
    } catch (e) {
      console.warn('Could not save high scores to localStorage:', e);
    }
  }
}

export const highScoreManager = new HighScoreManager();
