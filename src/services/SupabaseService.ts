import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface Score {
  name: string
  score: number
  created_at?: string
}

class SupabaseServiceClass {
  private client: SupabaseClient | null = null

  constructor() {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY

    if (url && key) {
      this.client = createClient(url, key)
    }
  }

  async saveScore(name: string, score: number): Promise<void> {
    if (!this.client) return
    try {
      await this.client.from('leaderboard').insert({ name, score })
    } catch {
      // fail silently
    }
  }

  async getTopScores(): Promise<Score[]> {
    if (!this.client) return []
    try {
      const { data, error } = await this.client
        .from('leaderboard')
        .select('name, score, created_at')
        .order('score', { ascending: false })
        .limit(10)

      if (error) return []
      return (data as Score[]) ?? []
    } catch {
      return []
    }
  }
}

export const SupabaseService = new SupabaseServiceClass()
