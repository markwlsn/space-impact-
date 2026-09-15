import { HighScoreRecord } from '../types';

const STORAGE_KEY = 'space_impact_highscores_v1';

export class HighScoreManager {
  private highScores: HighScoreRecord[] = [];

  constructor() {
    this.loadScores();
  }

  public getHighScores(): HighScoreRecord[] {
    return [...this.highScores];
  }

  public isHighScore(score: number): boolean {
    if (score <= 0) return false;
    if (this.highScores.length < 5) return true;
    return score > this.highScores[this.highScores.length - 1].score;
  }

  public addScore(initials: string, score: number, stage: number): void {
    const formattedInitials = (initials.trim().toUpperCase() || 'AAA').slice(0, 3).padEnd(3, '_');
    const newRecord: HighScoreRecord = {
      initials: formattedInitials,
      score,
      stage,
      date: new Date().toISOString().split('T')[0],
    };

    this.highScores.push(newRecord);
    this.highScores.sort((a, b) => b.score - a.score);
    this.highScores = this.highScores.slice(0, 5); // Keep top 5

    this.saveScores();
  }

  private loadScores(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        this.highScores = JSON.parse(data);
        return;
      }
    } catch (e) {
      console.warn('Could not read high scores from localStorage:', e);
    }

    // Default retro Nokia tribute high scores
    this.highScores = [
      { initials: 'NOK', score: 35000, stage: 2, date: '2000-11-09' },
      { initials: 'NEO', score: 25000, stage: 2, date: '2026-01-15' },
      { initials: 'CYB', score: 18000, stage: 1, date: '2026-03-22' },
      { initials: 'ACE', score: 12000, stage: 1, date: '2026-05-04' },
      { initials: 'PIL', score: 8000, stage: 1, date: '2026-08-11' },
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
