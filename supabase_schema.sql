-- ==============================================================================
-- 충북대학교 교내 매칭 플랫폼 (Supabase PostgreSQL 스키마)
-- ==============================================================================

-- 1. 사용자 테이블 (Users)
-- Supabase의 auth.users 테이블과 연동하기 위해 id를 uuid로 설정하고 참조합니다.
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    student_id VARCHAR(50) UNIQUE NOT NULL, -- 학번 (로그인 또는 식별용)
    name VARCHAR(50) NOT NULL, -- 실명
    nickname VARCHAR(50) UNIQUE NOT NULL, -- 닉네임
    university VARCHAR(100) DEFAULT '충북대학교', -- 대학교 (기본값 설정)
    is_verified BOOLEAN DEFAULT FALSE, -- 학생증/재학 인증 여부
    manner_score FLOAT DEFAULT 36.5, -- 매너 온도/지수 (기본 36.5도 시작)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 사용자 스포츠 프로필 테이블 (User Sports Profiles)
-- 한 사용자가 풋살, 농구 등 여러 종목에 대해 각각 다른 프로필(실력, 포지션 등)을 가질 수 있습니다.
CREATE TABLE public.user_sports_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    sport_type VARCHAR(50) NOT NULL, -- 종목 (예: futsal, basketball, tennis, esports)
    skill_level VARCHAR(50), -- 실력 (예: 입문, 초급, 중급, 고급)
    experience_years INT DEFAULT 0, -- 구력 (연차)
    preferred_position VARCHAR(50), -- 선호 포지션 (예: 풋살-픽소, 농구-포인트가드 등)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, sport_type) -- 한 사용자는 종목당 하나의 프로필만 가짐
);

-- 3. 매칭 모집글 테이블 (Matches)
-- 팀원을 모집하거나 시합 상대팀을 구하는 게시글 데이터입니다.
CREATE TABLE public.matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- 작성자
    sport_type VARCHAR(50) NOT NULL, -- 종목
    match_type VARCHAR(50) NOT NULL, -- 매칭 종류 (예: team_member(팀원 모집), opponent(상대팀 모집))
    match_date TIMESTAMP WITH TIME ZONE, -- 실제 경기 일시
    location VARCHAR(255), -- 장소 (예: 충북대 대운동장, 농구장 등)
    skill_level_required VARCHAR(50), -- 요구 실력 수준
    max_players INT DEFAULT 0,         -- 주전 모집 인원 (0 = 미설정)
    status VARCHAR(50) DEFAULT 'OPEN', -- 모집 상태 (OPEN, CLOSED, COMPLETED)
    title VARCHAR(255) NOT NULL, -- 모집글 제목
    description TEXT, -- 상세 본문 내용
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 매칭 신청 테이블 (Match Applications)
-- 모집글에 대해 다른 사용자가 매칭을 신청한 내역입니다.
CREATE TABLE public.match_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    applicant_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- 신청자
    status VARCHAR(50) DEFAULT 'PENDING', -- 신청 상태 (PENDING(대기), ACCEPTED(수락), REJECTED(거절))
    message TEXT, -- 신청 시 남기는 메시지/어필
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(match_id, applicant_id) -- 한 매칭글에 대해 중복 신청 방지
);

-- 5. 상호 평가 및 리뷰 테이블 (Reviews)
-- 경기가 끝난 후 사용자(또는 팀) 간에 매너 및 실력을 평가합니다.
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL, -- 어떤 경기에서의 리뷰인지
    reviewer_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- 평가를 남긴 사람
    reviewee_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- 평가를 받은 사람
    manner_rating INT CHECK (manner_rating >= 1 AND manner_rating <= 5), -- 매너 별점 (1~5점)
    skill_rating INT CHECK (skill_rating >= 1 AND skill_rating <= 5), -- 실력 별점 (1~5점)
    comment TEXT, -- 리뷰 코멘트
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ==============================================================================
-- [선택 사항] updated_at 자동 갱신 트리거 및 RLS(Row Level Security) 설정
-- ==============================================================================

-- 데이터가 수정될 때 updated_at을 현재 시간으로 자동 갱신하는 함수
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- users, matches 테이블에 트리거 적용
CREATE TRIGGER update_users_modtime 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();

CREATE TRIGGER update_matches_modtime 
    BEFORE UPDATE ON public.matches 
    FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();

-- Supabase 보안을 위한 RLS(행 수준 보안) 활성화 (주석 해제 후 정책 설정 필요)
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.user_sports_profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.match_applications ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- (예시) 모든 사용자는 다른 사람의 프로필(users)을 볼 수 있습니다.
-- CREATE POLICY "Public profiles are viewable by everyone." 
-- ON public.users FOR SELECT USING (true);

-- (예시) 사용자는 자기 자신의 데이터만 수정할 수 있습니다.
-- CREATE POLICY "Users can update own profile."
-- ON public.users FOR UPDATE USING (auth.uid() = id);

-- ==============================================================================
-- [마이그레이션] 기존 DB에 max_players 컬럼 추가 (Supabase SQL Editor에서 실행)
-- ==============================================================================
-- ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS max_players INT DEFAULT 0;
