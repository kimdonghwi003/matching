import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Users, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
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

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { fetchMatches(); }, []);

  useEffect(() => {
    if (user) fetchApplied();
    else setApplied(new Set());
  }, [user]);

  const fetchMatches = async () => {
    setLoadingMatches(true);
    // 먼저 조인 포함 조회 시도
    const { data, error } = await supabase
      .from('matches')
      .select('*, users(nickname)')
      .order('created_at', { ascending: false });
    if (data) {
      setMatches(data);
    } else if (error) {
      // 조인 실패 시 닉네임 없이 재조회 (RLS 문제 우회)
      const { data: fallback } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });
      if (fallback) setMatches(fallback);
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

    if (!apps || apps.length === 0) {
      setApplicants(prev => ({ ...prev, [matchId]: [] }));
      setLoadingApplicants(null);
      return;
    }

    const ids = apps.map(a => a.applicant_id);
    const { data: usersData } = await supabase
      .from('users')
      .select('id, nickname')
      .in('id', ids);

    setApplicants(prev => ({ ...prev, [matchId]: usersData || [] }));
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

            return (
              <div key={match.id} className="card" style={{ padding: '20px' }}>
                {/* 종목 + 작성자 */}
                <div className="flex justify-between items-center mb-1">
                  <span className={`tag tag-${match.sport_type}`}>
                    {SPORT_LABEL[match.sport_type] || match.sport_type}
                  </span>
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>{authorNick}</span>
                </div>

                {/* 제목 */}
                <h3 className="mb-2" style={{ fontSize: '1.15rem', marginTop: '8px' }}>{match.title}</h3>

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
                          (applicants[match.id] || []).map(applicant => (
                            <div key={applicant.id} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="chat-avatar" style={{ width: '28px', height: '28px', fontSize: '0.8rem' }}>
                                  {applicant.nickname[0].toUpperCase()}
                                </div>
                                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{applicant.nickname}</span>
                              </div>
                              <button
                                className="btn btn-primary"
                                style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                                onClick={() => navigate(`/messages/${applicant.id}`)}
                              >
                                <MessageCircle size={14} /> 채팅
                              </button>
                            </div>
                          ))
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
