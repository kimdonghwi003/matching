import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const SKILL_OPTIONS = {
  futsal:     ['입문 (누구나)', '초급', '중급', '고급'],
  basketball: ['입문 (누구나)', '초급', '중급', '고급'],
  tennis:     ['입문 (누구나)', '초급', '중급', '고급'],
  esports:    ['브론즈', '실버', '골드', '플래티넘', '에메랄드', '다이아몬드', '마스터', '그랜드마스터', '챌린저'],
};

export default function CreateMatch() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const RESERVE_SLOTS = 2;

  const [form, setForm] = useState({
    sport: 'futsal',
    title: '',
    matchDate: '',
    location: '',
    skill: '입문 (누구나)',
    maxPlayers: 6,
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  const handleSportChange = (sport) => {
    setForm({ ...form, sport, skill: SKILL_OPTIONS[sport][0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) { setError('제목을 입력해주세요.'); return; }
    if (!form.location.trim()) { setError('장소를 입력해주세요.'); return; }
    if (form.maxPlayers < 2) { setError('모집 인원은 2명 이상이어야 합니다.'); return; }

    setLoading(true);
    const { error: err } = await supabase.from('matches').insert({
      author_id: user.id,
      sport_type: form.sport,
      match_type: 'team_member',
      title: form.title.trim(),
      match_date: form.matchDate || null,
      location: form.location.trim(),
      skill_level_required: form.skill,
      max_players: form.maxPlayers,
      description: form.description.trim(),
      status: 'OPEN',
    });
    setLoading(false);

    if (err) {
      setError('등록 실패: ' + err.message);
      return;
    }
    navigate('/');
  };

  return (
    <div className="card">
      <h2 className="mb-3 text-center" style={{ color: 'var(--primary)' }}>✍️ 매칭 글 작성</h2>

      {error && (
        <div style={{ backgroundColor: '#fff0f3', color: 'var(--danger)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">종목</label>
          <select
            className="input-field"
            value={form.sport}
            onChange={(e) => handleSportChange(e.target.value)}
          >
            <option value="futsal">풋살</option>
            <option value="basketball">농구</option>
            <option value="tennis">테니스</option>
            <option value="esports">e-sports (롤)</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">제목</label>
          <input
            type="text" className="input-field" placeholder="멋진 제목을 입력해주세요!"
            value={form.title} required
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">일시</label>
          <input
            type="datetime-local" className="input-field"
            value={form.matchDate}
            onChange={(e) => setForm({ ...form, matchDate: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">장소</label>
          <input
            type="text" className="input-field"
            placeholder={form.sport === 'esports' ? '예: 온라인 (디스코드)' : '예: 충북대 대운동장'}
            value={form.location} required
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            요구 실력{form.sport === 'esports' ? ' (롤 티어)' : ''}
          </label>
          <select
            className="input-field"
            value={form.skill}
            onChange={(e) => setForm({ ...form, skill: e.target.value })}
          >
            {SKILL_OPTIONS[form.sport].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">주전 모집 인원 <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input
            type="number"
            className="input-field"
            min={2} max={30}
            value={form.maxPlayers}
            required
            onChange={(e) =>
              setForm({ ...form, maxPlayers: Math.max(2, Math.min(30, parseInt(e.target.value) || 2)) })
            }
          />
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '5px', lineHeight: '1.4' }}>
            주전 {form.maxPlayers}명 + 예비 {RESERVE_SLOTS}명 = 총 {form.maxPlayers + RESERVE_SLOTS}명까지 신청 가능합니다.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">상세 내용</label>
          <textarea
            className="input-field" rows="4"
            placeholder="참가자들에게 전하고 싶은 말을 적어주세요."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? '등록 중...' : '등록하기'}
        </button>
      </form>
    </div>
  );
}
