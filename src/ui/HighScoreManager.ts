import { HighScoreRecord } from '../types';

const STORAGE_KEY = 'space_impact_highscores_v2';
const PILOT_STORAGE_KEY = 'space_impact_pilot_callsign_v1';

export class HighScoreManager {
  private highScores: HighScoreRecord[] = [];
  public currentPilot: string = 'PILOT_1';

  constructor() {
    this.loadPilotName();
    this.loadScores();
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

    this.highScores.push(newRecord);
    this.highScores.sort((a, b) => b.score - a.score);
    this.highScores = this.highScores.slice(0, 8); // Keep top 8 arcade placement

    this.saveScores();
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
