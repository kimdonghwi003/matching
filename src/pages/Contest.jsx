import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Calendar, Users, MapPin, Plus, ChevronDown, ChevronUp, MessageCircle, X, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { CONTESTS, CATEGORY_LABELS, REGION_LABELS, ROLE_OPTIONS } from '../data/contests';

const REGION_DISPLAY = { 충북: '충청북도', 충남: '충청남도', 대전: '대전광역시', 세종: '세종특별자치시' };

const REGION_TABS = [
  { key: 'all',  label: '전체',      emoji: '🗺️' },
  { key: '충북', label: '충청북도',   emoji: '🌿' },
  { key: '충남', label: '충청남도',   emoji: '🌊' },
  { key: '대전', label: '대전광역시', emoji: '🔬' },
  { key: '세종', label: '세종특별자치시', emoji: '🏛️' },
];

export default function Contest() {
  const [filterRegion, setFilterRegion] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [teams, setTeams] = useState({});
  const [loadingTeams, setLoadingTeams] = useState(null);
  const [appliedTeams, setAppliedTeams] = useState(new Set());
  const [applyingTeamId, setApplyingTeamId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(null);
  const [createForm, setCreateForm] = useState({ teamName: '', description: '', maxSize: 4, roles: [] });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [contestStats, setContestStats] = useState({});

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) fetchApplied();
    else setAppliedTeams(new Set());
  }, [user]);

  // 공모전별 실시간 모집 현황
  useEffect(() => {
    fetchContestStats();
    const channel = supabase
      .channel('contest-stats-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'contest_team_applications' },
        fetchContestStats
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'contest_teams' },
        fetchContestStats
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const fetchContestStats = async () => {
    const { data: teams } = await supabase
      .from('contest_teams')
      .select('id, contest_id, max_size')
      .eq('is_recruiting', true);

    const teamMap = {};
    const stats = {};
    (teams || []).forEach(t => {
      teamMap[t.id] = t;
      if (!stats[t.contest_id]) stats[t.contest_id] = { teamCount: 0, totalSlots: 0, applicantCount: 0 };
      stats[t.contest_id].teamCount++;
      stats[t.contest_id].totalSlots += t.max_size;
    });

    const teamIds = Object.keys(teamMap);
    if (teamIds.length) {
      const { data: apps } = await supabase
        .from('contest_team_applications')
        .select('team_id')
        .in('team_id', teamIds);
      (apps || []).forEach(({ team_id }) => {
        const contestId = teamMap[team_id]?.contest_id;
        if (contestId && stats[contestId]) stats[contestId].applicantCount++;
      });
    }

    setContestStats(stats);
  };

  const fetchApplied = async () => {
    const { data } = await supabase
      .from('contest_team_applications')
      .select('team_id')
      .eq('applicant_id', user.id);
    if (data) setAppliedTeams(new Set(data.map((a) => a.team_id)));
  };

  const fetchTeams = async (contestId) => {
    if (teams[contestId] !== undefined) return;
    setLoadingTeams(contestId);
    const { data } = await supabase
      .from('contest_teams')
      .select('*, users(nickname)')
      .eq('contest_id', contestId)
      .eq('is_recruiting', true)
      .order('created_at', { ascending: false });
    setTeams((prev) => ({ ...prev, [contestId]: data || [] }));
    setLoadingTeams(null);
  };

  const toggleContest = (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      setShowCreateForm(null);
    } else {
      setExpandedId(id);
      setShowCreateForm(null);
      setCreateForm({ teamName: '', description: '', maxSize: 4, roles: [] });
      setCreateError('');
      fetchTeams(id);
    }
  };

  const handleApply = async (teamId) => {
    if (!user) { navigate('/login'); return; }
    if (appliedTeams.has(teamId)) return;
    setApplyingTeamId(teamId);
    const { error } = await supabase.from('contest_team_applications').insert({
      team_id: teamId,
      applicant_id: user.id,
      message: '',
    });
    if (!error) setAppliedTeams((prev) => new Set([...prev, teamId]));
    setApplyingTeamId(null);
  };

  const handleCreateTeam = async (contest) => {
    if (!user) { navigate('/login'); return; }
    setCreateError('');
    if (!createForm.teamName.trim()) {
      setCreateError('팀 이름을 입력해주세요.');
      return;
    }
    setCreating(true);
    const { data, error } = await supabase
      .from('contest_teams')
      .insert({
        contest_id: contest.id,
        leader_id: user.id,
        team_name: createForm.teamName.trim(),
        description: createForm.description.trim(),
        required_roles: createForm.roles,
        max_size: createForm.maxSize,
        is_recruiting: true,
      })
      .select('*, users(nickname)')
      .single();

    if (error) {
      if (error.code === '42P01') {
        setCreateError('contest_teams 테이블이 없습니다. Supabase SQL Editor에서 supabase_contest_setup.sql을 실행해주세요.');
      } else if (error.code === '42501') {
        setCreateError('권한 오류입니다. 로그인 상태를 확인하거나 Supabase RLS 정책을 확인해주세요.');
      } else {
        setCreateError(`오류: ${error.message}`);
      }
    } else if (data) {
      setTeams((prev) => ({
        ...prev,
        [contest.id]: [data, ...(prev[contest.id] || [])],
      }));
      setShowCreateForm(null);
      setCreateForm({ teamName: '', description: '', maxSize: 4, roles: [] });
    }
    setCreating(false);
  };

  const toggleRole = (role) => {
    setCreateForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };

  const handleRegionTab = (key) => {
    setFilterRegion(key);
    setExpandedId(null);
    setShowCreateForm(null);
  };

  const filteredContests = CONTESTS.filter((c) => {
    if (filterRegion !== 'all' && c.region !== filterRegion) return false;
    if (filterCategory !== 'all' && c.category !== filterCategory) return false;
    return true;
  });

  const getDaysLeft = (deadline) => {
    return Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div>
      {/* 히어로 배너 — 이미지 오른쪽 절반(노트북 팀작업 장면) */}
      <div style={{
        position: 'relative', height: '160px',
        borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '24px',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/hero-bg.png)',
          backgroundSize: '200% auto',
          backgroundPosition: '100% 50%',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(30,18,21,0.50) 0%, rgba(107,18,33,0.68) 100%)',
        }} />
        <div style={{
          position: 'relative', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.45)',
          padding: '0 16px', textAlign: 'center',
        }}>
          <h2 style={{ margin: 0, color: 'white', fontSize: '1.4rem' }}>🏆 공모전 팀원 매칭</h2>
          <p style={{ margin: '6px 0 0', opacity: 0.9, fontSize: '0.88rem' }}>
            충청·대전·세종 공모전에 함께할 팀원을 찾아보세요!
          </p>
        </div>
      </div>

      {/* 지역 탭 */}
      <div style={{
        display: 'flex', overflowX: 'auto',
        borderBottom: '2px solid var(--border)',
        marginBottom: '12px',
        scrollbarWidth: 'none',
      }}>
        {REGION_TABS.map(({ key, label, emoji }) => {
          const count = key === 'all' ? CONTESTS.length : CONTESTS.filter((c) => c.region === key).length;
          const isActive = filterRegion === key;
          return (
            <button
              key={key}
              onClick={() => handleRegionTab(key)}
              style={{
                flexShrink: 0,
                padding: '10px 16px',
                fontSize: '0.85rem',
                fontWeight: isActive ? '700' : '500',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-2px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'color 0.15s',
              }}
            >
              <span>{emoji}</span>
              <span>{label}</span>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: '600',
                padding: '1px 6px',
                borderRadius: '999px',
                background: isActive ? 'var(--primary)' : 'var(--border)',
                color: isActive ? 'white' : 'var(--text-muted)',
                marginLeft: '2px',
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 분야 필터 칩 */}
      <div className="flex gap-2" style={{ overflowX: 'auto', paddingBottom: '4px', marginBottom: '16px', scrollbarWidth: 'none' }}>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            className={`btn ${filterCategory === key ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '5px 12px', fontSize: '0.82rem', whiteSpace: 'nowrap', flexShrink: 0 }}
            onClick={() => setFilterCategory(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-col gap-3">
        {filteredContests.map((contest) => {
          const isExpanded = expandedId === contest.id;
          const contestTeams = teams[contest.id] || [];
          const isLoadingTeams = loadingTeams === contest.id;
          const isCreating = showCreateForm === contest.id;
          const daysLeft = getDaysLeft(contest.deadline);

          const stat = contestStats[contest.id];
          const pct = stat && stat.totalSlots > 0
            ? Math.min(100, Math.round((stat.applicantCount / stat.totalSlots) * 100))
            : 0;

          return (
            <div key={contest.id} className="card" style={{ padding: '20px' }}>
              {/* 태그 + 마감 */}
              <div className="flex justify-between items-center mb-1">
                <div className="flex gap-2 items-center" style={{ flexWrap: 'wrap' }}>
                  <span style={{
                    background: 'var(--primary)', color: 'white',
                    padding: '2px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600',
                  }}>
                    {contest.categoryLabel}
                  </span>
                  <span style={{
                    background: 'var(--primary-light)', color: 'var(--primary)',
                    padding: '2px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600',
                  }}>
                    {REGION_DISPLAY[contest.region] ?? contest.region}
                  </span>
                </div>
                <span style={{
                  fontSize: '0.82rem', fontWeight: '700',
                  color: daysLeft <= 0 ? 'var(--text-muted)' : daysLeft <= 14 ? 'var(--danger)' : 'var(--text-muted)',
                }}>
                  {daysLeft <= 0 ? '마감' : `D-${daysLeft}`}
                </span>
              </div>

              {/* 제목 */}
              <h3 style={{ fontSize: '1.05rem', margin: '8px 0 6px' }}>{contest.title}</h3>

              {/* 설명 */}
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: '1.5' }}>
                {contest.description}
              </p>

              {/* 상세 정보 */}
              <div className="flex-col gap-1" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                <div className="flex items-center gap-2">
                  <MapPin size={13} />
                  <span>{contest.organizer}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={13} />
                  <span>마감: {contest.deadline}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy size={13} />
                  <span>{contest.reward}</span>
                </div>
                <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                  <Users size={13} />
                  <span>최대 {contest.maxTeamSize}인 | 추천 역할: {contest.suggestedRoles.join(' · ')}</span>
                </div>
              </div>

              {/* 실시간 모집 현황 */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {stat
                      ? `모집 팀 ${stat.teamCount}개 · 총 ${stat.totalSlots}자리`
                      : '아직 모집 팀 없음'}
                  </span>
                  <span style={{
                    fontSize: '0.78rem', fontWeight: '700',
                    padding: '2px 9px', borderRadius: '999px',
                    background: stat && stat.totalSlots > 0
                      ? pct >= 80 ? 'var(--danger)' : 'var(--primary)'
                      : 'var(--border)',
                    color: stat && stat.totalSlots > 0 ? 'white' : 'var(--text-muted)',
                  }}>
                    👥 {stat ? stat.applicantCount : 0}/{stat ? stat.totalSlots : 0}명
                  </span>
                </div>
                <div style={{ height: '6px', borderRadius: '999px', background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: pct >= 80 ? 'var(--danger)' : 'var(--primary)',
                    borderRadius: '999px',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>

              {/* 팀 목록 토글 버튼 */}
              <button
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'space-between' }}
                onClick={() => toggleContest(contest.id)}
              >
                <span>
                  👥 팀원 모집 현황
                  {isExpanded && contestTeams.length > 0 && ` (${contestTeams.length}팀)`}
                </span>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {/* 확장 영역 */}
              {isExpanded && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* 팀 생성 버튼 */}
                  {user && !isCreating && (
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', gap: '6px' }}
                      onClick={() => setShowCreateForm(contest.id)}
                    >
                      <Plus size={16} /> 팀 모집 글 작성
                    </button>
                  )}

                  {!user && (
                    <button
                      className="btn btn-secondary"
                      style={{ width: '100%' }}
                      onClick={() => navigate('/login')}
                    >
                      로그인 후 팀 모집 글을 작성할 수 있습니다
                    </button>
                  )}

                  {/* 팀 생성 폼 */}
                  {isCreating && (
                    <div style={{ background: 'var(--bg-color)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--border)' }}>
                      <div className="flex justify-between items-center mb-2">
                        <h4 style={{ margin: 0 }}>팀 모집 글 작성</h4>
                        <button
                          onClick={() => { setShowCreateForm(null); setCreateError(''); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                        >
                          <X size={18} color="var(--text-muted)" />
                        </button>
                      </div>

                      {createError && (
                        <div style={{
                          background: '#fff0f3', color: 'var(--danger)',
                          padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                          marginBottom: '12px', fontSize: '0.85rem',
                        }}>
                          {createError}
                        </div>
                      )}

                      <div className="form-group">
                        <label className="form-label">팀 이름 *</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="예: 충북대 드림팀"
                          value={createForm.teamName}
                          onChange={(e) => setCreateForm((p) => ({ ...p, teamName: e.target.value }))}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">팀 소개 / 모집 공고</label>
                        <textarea
                          className="input-field"
                          rows={3}
                          placeholder="팀 소개와 찾고 있는 역량을 설명해주세요"
                          value={createForm.description}
                          onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                          style={{ resize: 'vertical' }}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">모집 인원 (본인 포함, 최대 {contest.maxTeamSize}명)</label>
                        <input
                          type="number"
                          className="input-field"
                          min={2}
                          max={contest.maxTeamSize}
                          value={createForm.maxSize}
                          onChange={(e) =>
                            setCreateForm((p) => ({
                              ...p,
                              maxSize: Math.min(Math.max(2, parseInt(e.target.value) || 2), contest.maxTeamSize),
                            }))
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">필요한 역할 (복수 선택 가능)</label>
                        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                          {ROLE_OPTIONS.map((role) => (
                            <button
                              key={role}
                              type="button"
                              className={`btn ${createForm.roles.includes(role) ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                              onClick={() => toggleRole(role)}
                            >
                              {role}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        onClick={() => handleCreateTeam(contest)}
                        disabled={creating || !createForm.teamName.trim()}
                      >
                        {creating ? '등록 중...' : '팀 모집 글 등록'}
                      </button>
                    </div>
                  )}

                  {/* 팀 목록 */}
                  {isLoadingTeams ? (
                    <div className="text-center text-muted" style={{ padding: '16px 0' }}>불러오는 중...</div>
                  ) : contestTeams.length === 0 ? (
                    <div className="text-center text-muted" style={{ padding: '16px 0', fontSize: '0.9rem' }}>
                      아직 모집 중인 팀이 없습니다. 첫 팀을 만들어보세요! 🎯
                    </div>
                  ) : (
                    contestTeams.map((team) => {
                      const isApplied = appliedTeams.has(team.id);
                      const isApplying = applyingTeamId === team.id;
                      const isLeader = user && user.id === team.leader_id;
                      const leaderNick = team.users?.nickname || '알 수 없음';

                      return (
                        <div
                          key={team.id}
                          style={{
                            background: '#ffffff',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '16px',
                          }}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>
                              {team.team_name}
                            </h4>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {leaderNick} · 최대 {team.max_size}명
                            </span>
                          </div>

                          {team.description && (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '8px 0 10px', lineHeight: '1.5' }}>
                              {team.description}
                            </p>
                          )}

                          {team.required_roles?.length > 0 && (
                            <div className="flex gap-1" style={{ flexWrap: 'wrap', marginBottom: '12px' }}>
                              {team.required_roles.map((role) => (
                                <span
                                  key={role}
                                  style={{
                                    background: 'var(--primary-light)', color: 'var(--primary)',
                                    padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '500',
                                  }}
                                >
                                  {role}
                                </span>
                              ))}
                            </div>
                          )}

                          {isLeader ? (
                            <button
                              className="btn btn-secondary"
                              style={{ width: '100%', fontSize: '0.85rem', cursor: 'default' }}
                              disabled
                            >
                              ✓ 내가 만든 팀
                            </button>
                          ) : isApplied ? (
                            <div className="flex gap-2">
                              <button
                                className="btn"
                                style={{
                                  flex: 1,
                                  backgroundColor: 'var(--success)',
                                  color: '#2d6a4f',
                                  cursor: 'default',
                                  fontSize: '0.85rem',
                                }}
                                disabled
                              >
                                ✓ 신청 완료
                              </button>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '10px 14px', fontSize: '0.85rem', gap: '4px' }}
                                onClick={() => navigate(`/messages/${team.leader_id}`)}
                              >
                                <MessageCircle size={14} /> 채팅
                              </button>
                            </div>
                          ) : (
                            <button
                              className="btn btn-primary"
                              style={{ width: '100%', fontSize: '0.85rem' }}
                              onClick={() => handleApply(team.id)}
                              disabled={isApplying || !user}
                            >
                              {!user
                                ? '로그인 후 신청 가능'
                                : isApplying
                                ? '신청 중...'
                                : '팀 참여 신청'}
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}

                  {/* 공모전 원문 링크 */}
                  <a
                    href={CONTESTS.find((c) => c.id === contest.id)?.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      fontSize: '0.8rem', color: 'var(--text-muted)',
                      justifyContent: 'center', textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={13} /> 공모전 원문 보기
                  </a>
                </div>
              )}
            </div>
          );
        })}

        {filteredContests.length === 0 && (
          <div className="text-center text-muted mt-2">해당 조건의 공모전이 없습니다.</div>
        )}
      </div>
    </div>
  );
}
