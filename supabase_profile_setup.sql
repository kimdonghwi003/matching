-- ============================================================
-- 프로필·스포츠 프로필 기능을 위한 Supabase 설정 SQL
-- Supabase 대시보드 → SQL Editor에서 실행하세요.
-- ============================================================

-- 1. public.users 테이블 — 자신의 닉네임 수정 허용 정책 추가
--    (기존 테이블이 있으므로 정책만 추가합니다)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'users' and policyname = 'Users can update own profile'
  ) then
    execute $policy$
      create policy "Users can update own profile"
        on public.users for update
        using (auth.uid() = id)
        with check (auth.uid() = id)
    $policy$;
  end if;
end $$;


-- 2. 종목별 스포츠 프로필 테이블
create table if not exists public.sport_profiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  sport_type text not null check (sport_type in ('futsal', 'basketball', 'tennis', 'esports')),
  skill_level text not null,
  position   text default '',
  created_at timestamptz default now(),
  unique(user_id, sport_type)   -- 종목당 1개 프로필
);

-- RLS 활성화
alter table public.sport_profiles enable row level security;

-- 누구나 스포츠 프로필 조회 가능 (매칭 시 실력 확인 용도)
create policy "Anyone can view sport profiles"
  on public.sport_profiles for select
  using (true);

-- 로그인한 유저 본인만 자신의 스포츠 프로필 추가
create policy "User can insert own sport profile"
  on public.sport_profiles for insert
  with check (auth.uid() = user_id);

-- 로그인한 유저 본인만 자신의 스포츠 프로필 수정
create policy "User can update own sport profile"
  on public.sport_profiles for update
  using (auth.uid() = user_id);

-- 로그인한 유저 본인만 자신의 스포츠 프로필 삭제
create policy "User can delete own sport profile"
  on public.sport_profiles for delete
  using (auth.uid() = user_id);
