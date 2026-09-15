/**
 * Supabase Realtime Cloud Database Configuration
 * 
 * To connect to your Supabase project:
 * 1. Create a free project at https://supabase.com
 * 2. Run the SQL in supabase/schema.sql in the Supabase SQL Editor
 * 3. Set your project URL and anon public key below or in a .env file:
 *    VITE_SUPABASE_URL=https://xyzcompany.supabase.co
 *    VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
 */

export const SUPABASE_CONFIG = {
  url: (import.meta.env.VITE_SUPABASE_URL as string) || '',
  anonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '',
  tableName: 'space_impact_leaderboard',
  isConfigured(): boolean {
    return (
      Boolean(this.url) &&
      Boolean(this.anonKey) &&
      !this.url.includes('your-project') &&
      !this.anonKey.includes('your-anon-key') &&
      this.url.startsWith('https://')
    );
  },
};
