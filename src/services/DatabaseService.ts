import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../config/supabase';

export interface CloudScoreRecord {
  id?: string;
  pilot_name: string;
  score: number;
  stage: number;
  ship_id: string;
  created_at?: string;
}

export type ScoreUpdateListener = (newScore: CloudScoreRecord) => void;

export class DatabaseService {
  private client: SupabaseClient | null = null;
  private isLive: boolean = false;
  private listeners: Set<ScoreUpdateListener> = new Set();

  constructor() {
    this.init();
  }

  private init(): void {
    if (!SUPABASE_CONFIG.isConfigured()) {
      console.info(
        '[DatabaseService] Supabase credentials not detected or placeholder. Game operating in offline-first mode with local arcade records.'
      );
      return;
    }

    try {
      this.client = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });

      this.isLive = true;
      this.setupRealtimeSubscription();
      console.info('[DatabaseService] Connected to Supabase Realtime.');
    } catch (err) {
      console.warn('[DatabaseService] Failed to initialize Supabase client:', err);
      this.isLive = false;
    }
  }

  private setupRealtimeSubscription(): void {
    if (!this.client) return;

    try {
      this.client
        .channel('space_impact_realtime_channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: SUPABASE_CONFIG.tableName,
          },
          (payload) => {
            const newRecord = payload.new as CloudScoreRecord;
            if (newRecord && typeof newRecord.score === 'number') {
              this.notifyListeners(newRecord);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.info('[DatabaseService] Realtime subscription established.');
          }
        });
    } catch (err) {
      console.warn('[DatabaseService] Realtime subscription failed:', err);
    }
  }

  public onNewScore(listener: ScoreUpdateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(score: CloudScoreRecord): void {
    this.listeners.forEach((listener) => {
      try {
        listener(score);
      } catch (e) {
        console.error('[DatabaseService] Listener error:', e);
      }
    });
  }

  /**
   * Fetches the top high scores from Supabase cloud database
   */
  public async fetchTopScores(limit: number = 10): Promise<CloudScoreRecord[] | null> {
    if (!this.client || !this.isLive) return null;

    try {
      const { data, error } = await this.client
        .from(SUPABASE_CONFIG.tableName)
        .select('*')
        .order('score', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('[DatabaseService] fetchTopScores error:', error.message);
        return null;
      }

      return data as CloudScoreRecord[];
    } catch (err) {
      console.warn('[DatabaseService] fetchTopScores network failure:', err);
      return null;
    }
  }

  /**
   * Submits a new run score to the cloud database
   */
  public async submitScore(
    pilotName: string,
    score: number,
    stage: number,
    shipId: string
  ): Promise<boolean> {
    if (!this.client || !this.isLive) return false;

    try {
      const cleanPilot = pilotName.trim().toUpperCase().slice(0, 12) || 'PILOT_1';
      const { error } = await this.client.from(SUPABASE_CONFIG.tableName).insert([
        {
          pilot_name: cleanPilot,
          score: Math.max(0, Math.floor(score)),
          stage: Math.max(1, stage),
          ship_id: shipId,
        },
      ]);

      if (error) {
        console.warn('[DatabaseService] submitScore error:', error.message);
        return false;
      }

      return true;
    } catch (err) {
      console.warn('[DatabaseService] submitScore network failure:', err);
      return false;
    }
  }

  public isConnected(): boolean {
    return this.isLive;
  }
}

export const databaseService = new DatabaseService();
