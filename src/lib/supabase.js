import { createClient } from '@supabase/supabase-js'

const supabaseUrl        = import.meta.env.VITE_SUPABASE_URL         || 'https://btqwkaorpbcuflpceyzx.supabase.co'
const supabaseAnonKey    = import.meta.env.VITE_SUPABASE_ANON_KEY    || 'sb_publishable_vlVnVt2rIvV98OIYoFSMvQ_LqBNJlvR'
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY || ''

// 일반 클라이언트 (RLS 적용)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 관리자 클라이언트 (회원가입 전용 — 이메일 발송 없이 유저 생성)
// VITE_SUPABASE_SERVICE_KEY 환경변수 필요
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null
