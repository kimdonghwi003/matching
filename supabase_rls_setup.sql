-- ==============================================================================
-- Supabase SQL Editor에서 실행하세요.
-- 역할: 이메일 자동 인증 + 프로필 자동 생성 + RLS 정책
-- ==============================================================================

-- 1. 이메일 자동 인증 트리거 (회원가입 즉시 이메일 확인 처리)
CREATE OR REPLACE FUNCTION public.auto_confirm_user_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email_confirmed_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_confirm_email ON auth.users;
CREATE TRIGGER trg_auto_confirm_email
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.auto_confirm_user_email();

-- 기존에 이미 가입됐지만 미인증 상태인 계정도 즉시 인증 처리
UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;


-- 2. 회원가입 시 public.users 자동 생성 트리거
-- (클라이언트에서 INSERT 실패해도 트리거가 보장)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, student_id, name, nickname)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'student_id', ''),
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'nickname', SPLIT_PART(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 3. RLS 활성화 및 정책 설정

-- public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_all" ON public.users;
CREATE POLICY "users_select_all" ON public.users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- public.matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matches_select_all" ON public.matches;
CREATE POLICY "matches_select_all" ON public.matches
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "matches_insert_auth" ON public.matches;
CREATE POLICY "matches_insert_auth" ON public.matches
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "matches_update_own" ON public.matches;
CREATE POLICY "matches_update_own" ON public.matches
  FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "matches_delete_own" ON public.matches;
CREATE POLICY "matches_delete_own" ON public.matches
  FOR DELETE USING (auth.uid() = author_id);

-- public.match_applications
ALTER TABLE public.match_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "applications_select_all" ON public.match_applications;
CREATE POLICY "applications_select_all" ON public.match_applications
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "applications_insert_auth" ON public.match_applications;
CREATE POLICY "applications_insert_auth" ON public.match_applications
  FOR INSERT WITH CHECK (auth.uid() = applicant_id);

DROP POLICY IF EXISTS "applications_delete_own" ON public.match_applications;
CREATE POLICY "applications_delete_own" ON public.match_applications
  FOR DELETE USING (auth.uid() = applicant_id);
