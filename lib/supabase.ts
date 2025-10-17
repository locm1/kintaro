import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          code: string
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_companies: {
        Row: {
          id: string
          user_id: string
          company_id: string
          is_admin: boolean
          line_user_id?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_id: string
          is_admin?: boolean
          line_user_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_id?: string
          is_admin?: boolean
          line_user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      attendance_records: {
        Row: {
          id: string
          user_id: string
          company_id: string
          date: string
          clock_in: string | null
          clock_out: string | null
          break_start: string | null
          break_end: string | null
          status: 'present' | 'absent' | 'partial'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_id: string
          date: string
          clock_in?: string | null
          clock_out?: string | null
          break_start?: string | null
          break_end?: string | null
          status?: 'present' | 'absent' | 'partial'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_id?: string
          date?: string
          clock_in?: string | null
          clock_out?: string | null
          break_start?: string | null
          break_end?: string | null
          status?: 'present' | 'absent' | 'partial'
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}