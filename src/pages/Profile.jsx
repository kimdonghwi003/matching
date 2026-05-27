import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Plus, Trash2, Check, X, LogOut, Building } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const SPORT_OPTIONS = {
  futsal: {
    label: '⚽ 풋살',
    skills: ['입문 (누구나)', '초급', '중급', '고급'],
    positions: ['골키퍼', '수비수', '미드필더', '공격수'],
  },
  basketball: {
    label: '🏀 농구',
    skills: ['입문 (누구나)', '초급', '중급', '고급'],
    positions: ['포인트가드', '슈팅가드', '스몰포워드', '파워포워드', '센터'],
  },
  tennis: {
    label: '🎾 테니스',
    skills: ['입문 (누구나)', '초급', '중급', '고급'],
    positions: ['단식', '복식'],
  },
  esports: {
    label: '🎮 e-sports',
    skills: [
      '브론즈', '실버', '골드', '플래티넘',
      '에메랄드', '다이아몬드', '마스터', '그랜드마스터', '챌린저',
    ],
    positions: ['탑', '정글', '미드', '원딜', '서포터'],
  },
};

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [sportProfiles, setSportProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingNick, setEditingNick] = useState(false);
  const [newNick, setNewNick] = useState('');
  const [savingNick, setSavingNick] = useState(false);
  const [nickError, setNickError] = useState('');

  const [showAddSport, setShowAddSport] = useState(false);
  const [addForm, setAddForm] = useState({ sport: 'futsal', skill: '입문 (누구나)', position: '' });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: prof }, { data: sports }] = await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase.from('sport_profiles').select('*').eq('user_id', user.id).order('created_at'),
    ]);
    if (prof) setProfile(prof);
    if (sports) setSportProfiles(sports);
    setLoading(false);
  };

  const handleStartEditNick = () => {
    setNewNick(profile?.nickname || '');
    setNickError('');
    setEditingNick(true);
  };

  const handleSaveNick = async () => {
    const trimmed = newNick.trim();
    if (!trimmed) { setNickError('닉네임을 입력해주세요.'); return; }
    setSavingNick(true);
    setNickError('');
    const { error } = await supabase.from('users').update({ nickname: trimmed }).eq('id', user.id);
    if (error) {
      setNickError('저장 중 오류가 발생했습니다.');
    } else {
      setProfile((p) => ({ ...p, nickname: trimmed }));
      setEditingNick(false);
    }
    setSavingNick(false);
  };

  const handleSportFormChange = (field, value) => {
    if (field === 'sport') {
      setAddForm({ sport: value, skill: SPORT_OPTIONS[value].skills[0], position: '' });
    } else {
      setAddForm((p) => ({ ...p, [field]: value }));
    }
  };

  const handleAddSport = async () => {
    setAddError('');
    setAdding(true);
    const { data, error } = await supabase
      .from('sport_profiles')
      .upsert(
        { user_id: user.id, sport_type: addForm.sport, skill_level: addForm.skill, position: addForm.position },
        { onConflict: 'user_id,sport_type' }
      )
      .select()
      .single();

    if (error) {
      setAddError('저장 중 오류가 발생했습니다. supabase_profile_setup.sql을 실행했는지 확인해주세요.');
    } else if (data) {
      setSportProfiles((prev) => {
        const idx = prev.findIndex((p) => p.sport_type === addForm.sport);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = data;
          return updated;
        }
        return [...prev, data];
      });
      setShowAddSport(false);
      setAddForm({ sport: 'futsal', skill: '입문 (누구나)', position: '' });
    }
    setAdding(false);
  };

  const handleDeleteSport = async (id) => {
    await supabase.from('sport_profiles').delete().eq('id', id);
    setSportProfiles((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return <div className="text-center text-muted mt-2">불러오는 중...</div>;
  }

  const nickname = profile?.nickname || user?.user_metadata?.nickname || '닉네임 없음';
  const name = profile?.name || user?.user_metadata?.name || '';
  const studentId = profile?.student_id || user?.user_metadata?.student_id || '';

  return (
    <div>
      {/* 기본 프로필 카드 */}
      <div className="card mb-3 text-center">
        <div style={{
          width: '80px', height: '80px',
          backgroundColor: 'var(--primary)',
          borderRadius: '50%',
          margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', color: 'white',
          userSelect: 'none',
        }}>
          {nickname[0]?.toUpperCase() || '?'}
        </div>

        {/* 닉네임 편집 */}
        {editingNick ? (
          <div className="flex gap-2 justify-center items-center mb-1">
            <input
              type="text"
              className="input-field"
              style={{ maxWidth: '160px', textAlign: 'center', margin: 0 }}
              value={newNick}
              onChange={(e) => setNewNick(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveNick()}
              autoFocus
            />
            <button
              onClick={handleSaveNick}
              disabled={savingNick}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '4px' }}
              title="저장"
            >
              <Check size={20} />
            </button>
            <button
              onClick={() => { setEditingNick(false); setNickError(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
              title="취소"
            >
              <X size={20} />
            </button>
          </div>
        ) : (
          <div className="flex gap-2 justify-center items-center mb-1">
            <h2 style={{ margin: 0 }}>{nickname}</h2>
            <button
              onClick={handleStartEditNick}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
              title="닉네임 수정"
            >
              <Edit2 size={16} />
            </button>
          </div>
        )}
        {nickError && (
          <p style={{ color: 'var(--danger)', fontSize: '0.82rem', margin: '4px 0' }}>{nickError}</p>
        )}

        {name && (
          <p className="text-muted" style={{ margin: '4px 0', fontSize: '0.95rem' }}>{name}</p>
        )}
        {studentId && (
          <p className="text-muted" style={{ margin: '2px 0', fontSize: '0.85rem' }}>
            학번: {studentId}
          </p>
        )}
        <p className="text-muted" style={{ margin: '2px 0', fontSize: '0.82rem' }}>
          {user?.email}
        </p>

        {/* 매너 온도 */}
        <div
          className="flex justify-between items-center mt-2"
          style={{ backgroundColor: 'var(--primary-light)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
        >
          <span style={{ fontWeight: '600' }}>🌡️ 매너 온도</span>
          <span style={{ color: 'var(--danger)', fontWeight: 'bold', fontSize: '1.4rem' }}>36.5°C</span>
        </div>
      </div>

      {/* 스포츠 프로필 섹션 */}
      <div className="flex justify-between items-center mb-2">
        <h3 style={{ color: 'var(--primary)', margin: 0 }}>내 스포츠 프로필</h3>
        <button
          className="btn btn-secondary"
          style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          onClick={() => { setShowAddSport(!showAddSport); setAddError(''); }}
        >
          <Plus size={15} /> 추가
        </button>
      </div>

      {/* 스포츠 프로필 추가 폼 */}
      {showAddSport && (
        <div className="card mb-2" style={{ padding: '16px' }}>
          <h4 style={{ margin: '0 0 12px' }}>스포츠 프로필 추가 / 수정</h4>

          {addError && (
            <div style={{
              background: '#fff0f3', color: 'var(--danger)',
              padding: '10px 14px', borderRadius: 'var(--radius-sm)',
              marginBottom: '12px', fontSize: '0.82rem',
            }}>
              {addError}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">종목</label>
            <select
              className="input-field"
              value={addForm.sport}
              onChange={(e) => handleSportFormChange('sport', e.target.value)}
            >
              {Object.entries(SPORT_OPTIONS).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              실력 수준{addForm.sport === 'esports' ? ' (롤 티어)' : ''}
            </label>
            <select
              className="input-field"
              value={addForm.skill}
              onChange={(e) => handleSportFormChange('skill', e.target.value)}
            >
              {SPORT_OPTIONS[addForm.sport].skills.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">포지션 (선택)</label>
            <select
              className="input-field"
              value={addForm.position}
              onChange={(e) => handleSportFormChange('position', e.target.value)}
            >
              <option value="">선택 안 함</option>
              {SPORT_OPTIONS[addForm.sport].positions.map((pos) => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={handleAddSport}
              disabled={adding}
            >
              {adding ? '저장 중...' : '저장'}
            </button>
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => { setShowAddSport(false); setAddError(''); }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 스포츠 프로필 목록 */}
      <div className="flex-col gap-2 mb-3">
        {sportProfiles.length === 0 ? (
          <div className="card text-center" style={{ padding: '24px' }}>
            <p className="text-muted" style={{ margin: 0 }}>
              아직 등록된 스포츠 프로필이 없습니다.
            </p>
            <p className="text-muted" style={{ margin: '8px 0 0', fontSize: '0.85rem' }}>
              위의 '추가' 버튼으로 내 실력과 포지션을 등록해보세요!
            </p>
          </div>
        ) : (
          sportProfiles.map((sp) => {
            const info = SPORT_OPTIONS[sp.sport_type];
            return (
              <div
                key={sp.id}
                className="card flex justify-between items-center"
                style={{ padding: '14px 16px' }}
              >
                <div>
                  <div
                    className={`tag tag-${sp.sport_type}`}
                    style={{ display: 'inline-block', marginBottom: '6px' }}
                  >
                    {info?.label || sp.sport_type}
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                    {sp.skill_level}
                    {sp.position && ` · ${sp.position}`}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteSport(sp.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--danger)', padding: '6px',
                  }}
                  title="삭제"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* 시설 예약 바로가기 */}
      <button
        className="btn btn-secondary"
        style={{ width: '100%', gap: '6px', marginBottom: '12px' }}
        onClick={() => navigate('/facility')}
      >
        <Building size={16} /> 학내 체육 시설 예약 바로가기
      </button>

      {/* 로그아웃 */}
      <button
        className="btn btn-secondary"
        style={{ width: '100%', color: 'var(--danger)', borderColor: 'var(--danger)', gap: '6px' }}
        onClick={handleSignOut}
      >
        <LogOut size={16} /> 로그아웃
      </button>
    </div>
  );
}
