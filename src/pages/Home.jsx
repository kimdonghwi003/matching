import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Users, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';

const RESERVE_SLOTS = 2;
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const SPORT_LABEL = {
  futsal:     '⚽ 풋살',
  basketball: '🏀 농구',
  tennis:     '🎾 테니스',
  esports:    '🎮 e-sports',
};

const FILTER_OPTIONS = ['All', 'futsal', 'basketball', 'tennis', 'esports'];
const FILTER_LABEL   = { All: '전체', futsal: '⚽ 풋살', basketball: '🏀 농구', tennis: '🎾 테니스', esports: '🎮 e-sports' };

export default function Home() {
  const [filter, setFilter]                 = useState('All');
  const [matches, setMatches]               = useState([]);
  const [applied, setApplied]               = useState(new Set());
  const [applyingId, setApplyingId]         = useState(null);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [expandedId, setExpandedId]               = useState(null);
  const [applicants, setApplicants]               = useState({});
  const [loadingApplicants, setLoadingApplicants] = useState(null);
  const [deletingId, setDeletingId]               = useState(null);
  const [applyError, setApplyError]               = useState('');
  const [applyCounts, setApplyCounts]             = useState({});

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { fetchMatches(); }, []);

  // 실시간 신청자 수 동기화
  useEffect(() => {
    const channel = supabase
      .channel('home-apply-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'match_applications' },
        (payload) => {
          const mid = payload.new.match_id;
          setApplyCounts(prev => ({ ...prev, [mid]: (prev[mid] || 0) + 1 }));
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'match_applications' },
        (payload) => {
          const mid = payload.old.match_id;
          setApplyCounts(prev => ({ ...prev, [mid]: Math.max(0, (prev[mid] || 0) - 1) }));
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    if (user) fetchApplied();
    else setApplied(new Set());
  }, [user]);

  const fetchApplyCounts = async (ids) => {
    if (!ids.length) return;
    const { data } = await supabase
      .from('match_applications')
      .select('match_id')
      .in('match_id', ids);
    if (!data) return;
    const counts = {};
    data.forEach(({ match_id }) => { counts[match_id] = (counts[match_id] || 0) + 1; });
    setApplyCounts(counts);
  };

  const fetchMatches = async () => {
    setLoadingMatches(true);
    const { data, error } = await supabase
      .from('matches')
      .select('*, users(nickname)')
      .order('created_at', { ascending: false });
    if (data) {
      setMatches(data);
      fetchApplyCounts(data.map(m => m.id));
    } else if (error) {
      const { data: fallback } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });
      if (fallback) {
        setMatches(fallback);
        fetchApplyCounts(fallback.map(m => m.id));
      }
    }
    setLoadingMatches(false);
  };

  const fetchApplied = async () => {
    const { data } = await supabase
      .from('match_applications')
      .select('match_id')
      .eq('applicant_id', user.id);
    if (data) setApplied(new Set(data.map(a => a.match_id)));
  };

  const fetchApplicants = async (matchId) => {
    if (applicants[matchId]) return;
    setLoadingApplicants(matchId);

    const match = matches.find(m => m.id === matchId);
    const authorId = match?.author_id;
    const sportType = match?.sport_type;

    const { data: apps, error: appErr } = await supabase
      .from('match_applications')
      .select('applicant_id')
      .eq('match_id', matchId);

    if (appErr) {
      setApplicants(prev => ({ ...prev, [matchId]: [] }));
      setLoadingApplicants(null);
      setApplyError(`신청자 조회 오류: ${appErr.message}`);
      return;
    }

    const applicantIds = (apps || []).map(a => a.applicant_id);
    const allIds = [...new Set([authorId, ...applicantIds].filter(Boolean))];

    const { data: usersData } = await supabase
      .from('users')
      .select('id, nickname, manner_score')
      .in('id', allIds);

    let profiles = [];
    if (sportType && allIds.length > 0) {
      const { data: profileData } = await supabase
        .from('sport_profiles')
        .select('user_id, skill_level, position')
        .in('user_id', allIds)
        .eq('sport_type', sportType);
      profiles = profileData || [];
    }

    const merged = (usersData || []).map(u => ({
      ...u,
      skill_level: profiles.find(p => p.user_id === u.id)?.skill_level ?? null,
      position:    profiles.find(p => p.user_id === u.id)?.position    ?? null,
      isAuthor:    u.id === authorId,
    }));
    merged.sort((a, b) => (b.isAuthor ? 1 : 0) - (a.isAuthor ? 1 : 0));

    setApplicants(prev => ({ ...prev, [matchId]: merged }));
    setLoadingApplicants(null);
  };

  const toggleApplicants = (matchId) => {
    if (expandedId === matchId) {
      setExpandedId(null);
    } else {
      setExpandedId(matchId);
      fetchApplicants(matchId);
    }
  };

  const handleDeleteMatch = async (matchId) => {
    if (!window.confirm('이 매칭 글을 삭제하시겠습니까?')) return;
    setDeletingId(matchId);
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId)
      .eq('author_id', user.id);
    if (!error) setMatches((prev) => prev.filter((m) => m.id !== matchId));
    setDeletingId(null);
  };

  const handleApply = async (match) => {
    if (!user) { navigate('/login'); return; }
    if (applied.has(match.id)) return;

    setApplyingId(match.id);
    setApplyError('');
    const { error } = await supabase.from('match_applications').insert({
      match_id:     match.id,
      applicant_id: user.id,
      message:      '',
    });
    if (!error) {
      setApplied(prev => new Set([...prev, match.id]));
    } else {
      if (error.code === '42P01') {
        setApplyError('match_applications 테이블이 없습니다. SQL을 실행해주세요.');
      } else if (error.code === '23505') {
        setApplied(prev => new Set([...prev, match.id])); // 이미 신청됨
      } else {
        setApplyError(`신청 오류: ${error.message}`);
      }
    }
    setApplyingId(null);
  };

  const filteredMatches = filter === 'All'
    ? matches
    : matches.filter(m => m.sport_type === filter);

  return (
    <div>
      {/* 히어로 배너 — 이미지 왼쪽 절반(축구 장면) */}
      <div style={{
        position: 'relative', height: '160px',
        borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '24px',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/hero-bg.png)',
          backgroundSize: '200% auto',
          backgroundPosition: '0% 50%',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(107,18,33,0.70) 0%, rgba(30,18,21,0.55) 100%)',
        }} />
        <div style={{
          position: 'relative', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.45)',
          padding: '0 16px', textAlign: 'center',
        }}>
          <h2 style={{ margin: 0, color: 'white', fontSize: '1.4rem' }}>🔥 오늘의 매칭</h2>
          <p style={{ margin: '6px 0 0', opacity: 0.9, fontSize: '0.88rem' }}>
            실력이 비슷한 교내 학우들과 매칭해보세요!
          </p>
        </div>
      </div>

      {applyError && (
        <div style={{
          background: '#fff0f3', color: 'var(--danger)',
          padding: '12px 16px', borderRadius: 'var(--radius-md)',
          marginBottom: '16px', fontSize: '0.88rem',
        }}>
          ⚠️ {applyError}
        </div>
      )}

      {/* 필터 */}
      <div className="flex gap-2 mb-3" style={{ overflowX: 'auto', paddingBottom: '8px' }}>
        {FILTER_OPTIONS.map(f => (
          <button
            key={f}
            className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
            onClick={() => setFilter(f)}
          >
            {FILTER_LABEL[f]}
          </button>
        ))}
      </div>

      {loadingMatches ? (
        <div className="text-center text-muted mt-2">불러오는 중...</div>
      ) : (
        <div className="flex-col gap-3">
          {filteredMatches.map(match => {
            const isApplied  = applied.has(match.id);
            const isApplying = applyingId === match.id;
            const isAuthor   = user && user.id === match.author_id;
            const authorNick = match.users?.nickname || '알 수 없음';
            const isExpanded  = expandedId === match.id;
            const isDeleting  = deletingId === match.id;

            const applyCount = applyCounts[match.id] || 0;
            const displayCount = applyCount + 1; // 작성자 1명 포함
            const maxPlayers = match.max_players || 0;
            const totalSlots = maxPlayers + RESERVE_SLOTS;
            const mainCount = maxPlayers > 0 ? Math.min(displayCount, maxPlayers) : displayCount;
            const reserveCount = maxPlayers > 0 ? Math.max(0, displayCount - maxPlayers) : 0;
            const mainPct = maxPlayers > 0 ? (mainCount / totalSlots) * 100 : 0;
            const reservePct = maxPlayers > 0 ? (reserveCount / totalSlots) * 100 : 0;
            const dividerPct = maxPlayers > 0 ? (maxPlayers / totalSlots) * 100 : 0;
            const isFull = maxPlayers > 0 && displayCount >= maxPlayers;

            return (
              <div key={match.id} className="card" style={{ padding: '20px' }}>
                {/* 종목 + 작성자 */}
                <div className="flex justify-between items-center mb-1">
                  <span className={`tag tag-${match.sport_type}`}>
                    {SPORT_LABEL[match.sport_type] || match.sport_type}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: '700',
                      padding: '2px 9px', borderRadius: '999px',
                      background: reserveCount > 0
                        ? 'var(--danger)'
                        : isFull
                        ? '#f59e0b'
                        : 'var(--primary)',
                      color: 'white',
                    }}>
                      {maxPlayers > 0
                        ? reserveCount > 0
                          ? `👥 ${displayCount}/${maxPlayers + RESERVE_SLOTS}명 (예비 ${reserveCount}/${RESERVE_SLOTS})`
                          : `👥 ${displayCount}/${maxPlayers}명`
                        : `👥 ${displayCount}명`}
                    </span>
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>{authorNick}</span>
                  </div>
                </div>

                {/* 제목 */}
                <h3 style={{ fontSize: '1.15rem', marginTop: '8px', marginBottom: '10px' }}>{match.title}</h3>

                {/* 모집 인원 강조 블록 */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '12px',
                  background: '#fff0f3', border: '1.5px solid #ffc9d4',
                }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--danger)' }}>
                    🔴 모집 현황
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--danger)', letterSpacing: '-0.5px' }}>
                      {displayCount}
                    </span>
                    <span style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--danger)' }}>
                      / {maxPlayers > 0 ? maxPlayers : '?'}명
                    </span>
                    {maxPlayers > 0 && (
                      <span style={{
                        fontSize: '0.72rem', fontWeight: '700', marginLeft: '6px',
                        padding: '2px 7px', borderRadius: '999px',
                        background: reserveCount > 0 ? 'var(--danger)' : isFull ? '#f59e0b' : 'var(--primary)',
                        color: 'white',
                      }}>
                        {reserveCount > 0 ? `예비 ${reserveCount}/${RESERVE_SLOTS}` : isFull ? '주전 마감' : '모집 중'}
                      </span>
                    )}
                  </div>
                </div>

                {/* 정보 */}
                <div className="flex-col gap-2 mb-3" style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  {match.match_date && (
                    <div className="flex items-center gap-2">
                      <Calendar size={15} />
                      {new Date(match.match_date).toLocaleString('ko-KR')}
                    </div>
                  )}
                  {match.location && (
                    <div className="flex items-center gap-2"><MapPin size={15} /> {match.location}</div>
                  )}
                  {match.skill_level_required && (
                    <div className="flex items-center gap-2"><Users size={15} /> 실력: {match.skill_level_required}</div>
                  )}
                </div>

                {/* 주전 / 예비 모집 현황 */}
                {maxPlayers > 0 && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '5px' }}>
                      <span style={{ fontWeight: '600', color: isFull ? '#f59e0b' : 'var(--text-secondary)' }}>
                        주전 {mainCount}/{maxPlayers}명{isFull ? ' · 마감' : ''}
                      </span>
                      <span style={{ fontWeight: '600', color: reserveCount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                        예비 {reserveCount}/{RESERVE_SLOTS}명
                      </span>
                    </div>
                    <div style={{ height: '7px', borderRadius: '999px', background: 'var(--border)', position: 'relative', overflow: 'hidden' }}>
                      {/* 주전 채움 */}
                      <div style={{
                        position: 'absolute', left: 0, top: 0, height: '100%',
                        width: `${mainPct}%`,
                        background: isFull ? '#f59e0b' : 'var(--primary)',
                        transition: 'width 0.3s ease',
                      }} />
                      {/* 예비 채움 */}
                      {reserveCount > 0 && (
                        <div style={{
                          position: 'absolute', top: 0, height: '100%',
                          left: `${dividerPct}%`,
                          width: `${reservePct}%`,
                          background: 'var(--danger)',
                          transition: 'width 0.3s ease',
                        }} />
                      )}
                      {/* 주전/예비 경계선 */}
                      <div style={{
                        position: 'absolute', top: 0, height: '100%',
                        left: `${dividerPct}%`, width: '2px',
                        background: 'white', opacity: 0.7,
                      }} />
                    </div>
                  </div>
                )}

                {/* 버튼 영역 */}
                {isAuthor ? (
                  <div className="flex-col gap-2">
                    {/* 신청자 보기 */}
                    <button
                      className="btn btn-secondary"
                      style={{ width: '100%', justifyContent: 'space-between' }}
                      onClick={() => toggleApplicants(match.id)}
                    >
                      <span>👥 신청자 보기</span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {/* 매칭 글 삭제 */}
                    <button
                      className="btn"
                      style={{
                        width: '100%', background: '#fff0f3',
                        color: 'var(--danger)', border: '1px solid #ffc9d4',
                        fontSize: '0.88rem',
                      }}
                      onClick={() => handleDeleteMatch(match.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? '삭제 중...' : '🗑️ 매칭 글 삭제'}
                    </button>

                    {/* 신청자 목록 */}
                    {isExpanded && (
                      <div style={{
                        background: 'var(--bg-color)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                        padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px',
                      }}>
                        {loadingApplicants === match.id ? (
                          <p className="text-muted" style={{ fontSize: '0.85rem', margin: 0 }}>불러오는 중...</p>
                        ) : (applicants[match.id] || []).length === 0 ? (
                          <p className="text-muted" style={{ fontSize: '0.85rem', margin: 0 }}>아직 신청자가 없습니다.</p>
                        ) : (
                          (applicants[match.id] || []).map(applicant => {
                            const score = applicant.manner_score ?? 36.5;
                            const tempColor = score >= 38 ? '#ef4444' : score >= 36.5 ? '#22c55e' : '#3b82f6';
                            return (
                              <div key={applicant.id} style={{
                                background: '#fff', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)', padding: '12px 14px',
                                display: 'flex', flexDirection: 'column', gap: '8px',
                              }}>
                                {/* 닉네임 + 채팅 */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div className="chat-avatar" style={{ width: '30px', height: '30px', fontSize: '0.85rem' }}>
                                      {applicant.nickname[0].toUpperCase()}
                                    </div>
                                    <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{applicant.nickname}</span>
                                    {applicant.isAuthor && (
                                      <span style={{
                                        fontSize: '0.7rem', fontWeight: '700',
                                        padding: '2px 7px', borderRadius: '999px',
                                        background: 'var(--primary)', color: 'white',
                                      }}>개설자</span>
                                    )}
                                  </div>
                                  {!applicant.isAuthor && (
                                    <button
                                      className="btn btn-primary"
                                      style={{ padding: '5px 12px', fontSize: '0.8rem', gap: '4px' }}
                                      onClick={() => navigate(`/messages/${applicant.id}`)}
                                    >
                                      <MessageCircle size={13} /> 채팅
                                    </button>
                                  )}
                                </div>

                                {/* 매너 온도 + 실력 */}
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{
                                    fontSize: '0.78rem', fontWeight: '700',
                                    padding: '3px 9px', borderRadius: '999px',
                                    background: tempColor + '20', color: tempColor, border: `1px solid ${tempColor}40`,
                                  }}>
                                    🌡️ {score.toFixed(1)}°C
                                  </span>
                                  <span style={{
                                    fontSize: '0.78rem', fontWeight: '600',
                                    padding: '3px 9px', borderRadius: '999px',
                                    background: 'var(--primary-light)', color: 'var(--primary)',
                                  }}>
                                    ⚡ {applicant.skill_level ?? '실력 미등록'}
                                    {applicant.position && ` · ${applicant.position}`}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                ) : isApplied ? (
                  /* 신청 완료 + 채팅하기 */
                  <div className="flex gap-2">
                    <button
                      className="btn"
                      style={{
                        flex: 1, backgroundColor: 'var(--success)', color: '#2d6a4f',
                        cursor: 'default', fontSize: '0.9rem',
                      }}
                      disabled
                    >
                      ✓ 신청 완료
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '12px 16px', fontSize: '0.9rem', gap: '4px' }}
                      onClick={() => navigate(`/messages/${match.author_id}`)}
                    >
                      <MessageCircle size={16} /> 채팅
                    </button>
                  </div>
                ) : (
                  /* 신청하기 */
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={() => handleApply(match)}
                    disabled={isApplying}
                  >
                    {isApplying ? '신청 중...' : '신청하기'}
                  </button>
                )}
              </div>
            );
          })}

          {filteredMatches.length === 0 && (
            <div className="text-center text-muted mt-2">
              {matches.length === 0
                ? '아직 등록된 매칭이 없습니다. 첫 매칭을 개설해보세요! 🎉'
                : '해당 종목의 매칭 글이 없습니다. 😢'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
