-- ============================================================
-- 공모전 팀원 매칭 기능을 위한 Supabase 테이블 생성 SQL
-- Supabase 대시보드 → SQL Editor에서 실행하세요.
-- ============================================================

-- 1. 공모전 팀 모집 테이블
create table if not exists public.contest_teams (
  id             uuid primary key default gen_random_uuid(),
  contest_id     integer not null,           -- src/data/contests.js 의 공모전 id
  leader_id      uuid not null references public.users(id) on delete cascade,
  team_name      text not null,
  description    text default '',
  required_roles text[] default '{}',
  max_size       integer not null default 4,
  is_recruiting  boolean not null default true,
  created_at     timestamptz default now()
);

-- RLS 활성화
alter table public.contest_teams enable row level security;

-- 누구나 팀 목록 조회 가능
create policy "Anyone can view contest teams"
  on public.contest_teams for select
  using (true);

-- 로그인한 유저만 팀 생성 (자신이 리더여야 함)
create policy "Auth users can create contest teams"
  on public.contest_teams for insert
  with check (auth.uid() = leader_id);

-- 리더만 자신의 팀 수정
create policy "Leader can update own team"
  on public.contest_teams for update
  using (auth.uid() = leader_id);

-- 리더만 자신의 팀 삭제
create policy "Leader can delete own team"
  on public.contest_teams for delete
  using (auth.uid() = leader_id);


-- 2. 공모전 팀 참여 신청 테이블
create table if not exists public.contest_team_applications (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.contest_teams(id) on delete cascade,
  applicant_id uuid not null references public.users(id) on delete cascade,
  message      text default '',
  created_at   timestamptz default now(),
  unique(team_id, applicant_id)         -- 중복 신청 방지
);

-- RLS 활성화
alter table public.contest_team_applications enable row level security;

-- 누구나 신청 목록 조회 가능 (팀 리더가 신청자 확인 용도)
create policy "Anyone can view contest applications"
  on public.contest_team_applications for select
  using (true);

-- 로그인한 유저만 신청 (자신이 신청자여야 함)
create policy "Auth users can apply to contest teams"
  on public.contest_team_applications for insert
  with check (auth.uid() = applicant_id);

-- 신청자 본인만 신청 취소(삭제) 가능
create policy "Applicant can delete own application"
  on public.contest_team_applications for delete
  using (auth.uid() = applicant_id);
