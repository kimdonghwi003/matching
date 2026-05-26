import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const matches = [
  { id: 1, title: '오늘 저녁 풋살 한 게임 하실 분!', sport: 'futsal', date: '오늘 19:00', location: '충북대 대운동장', skill: '초중급', author: '축구왕' },
  { id: 2, title: '농구 3:3 상대팀 모십니다', sport: 'basketball', date: '내일 15:00', location: '야외 농구장', skill: '중급', author: '바스켓보이' },
  { id: 3, title: '가볍게 테니스 랠리 하실분', sport: 'tennis', date: '이번주 토 10:00', location: '교내 테니스장', skill: '입문', author: '테린이' },
  { id: 4, title: '롤 5인팟 구해요 (골드~플레)', sport: 'esports', date: '오늘 21:00', location: '온라인 (디스코드)', skill: '고급', author: '미드장인' },
];

export default function Home() {
  const [filter, setFilter] = useState('All');
  const [applied, setApplied] = useState(new Set());
  const [applyingId, setApplyingId] = useState(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  const filteredMatches = filter === 'All' ? matches : matches.filter(m => m.sport === filter.toLowerCase());

  const handleApply = async (match) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (applied.has(match.id)) return;

    setApplyingId(match.id);
    await supabase.from('match_applications').insert({
      match_id: match.id.toString(),
      applicant_id: user.id,
      message: '',
    }).then(() => {});

    setApplied(prev => new Set([...prev, match.id]));
    setApplyingId(null);
  };

  return (
    <div>
      <div className="mb-3 text-center">
        <h2 style={{ color: 'var(--primary)' }}>🔥 오늘의 매칭</h2>
        <p className="text-muted">실력이 비슷한 교내 학우들과 매칭해보세요!</p>
      </div>

      <div className="flex gap-2 mb-3" style={{ overflowX: 'auto', paddingBottom: '8px' }}>
        {['All', 'Futsal', 'Basketball', 'Tennis', 'Esports'].map(f => (
          <button
            key={f}
            className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
            onClick={() => setFilter(f)}
          >
            {f === 'All' ? '전체' : f === 'Futsal' ? '⚽ 풋살' : f === 'Basketball' ? '🏀 농구' : f === 'Tennis' ? '🎾 테니스' : '🎮 e-sports'}
          </button>
        ))}
      </div>

      <div className="flex-col gap-3">
        {filteredMatches.map(match => {
          const isApplied = applied.has(match.id);
          const isApplying = applyingId === match.id;
          return (
            <div key={match.id} className="card">
              <div className="flex justify-between items-center mb-1">
                <span className={`tag tag-${match.sport}`}>{match.sport.toUpperCase()}</span>
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>{match.author}</span>
              </div>
              <h3 className="mb-2" style={{ fontSize: '1.2rem', marginTop: '8px' }}>{match.title}</h3>

              <div className="flex-col gap-2 mb-3" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <div className="flex items-center gap-2"><Calendar size={16} /> {match.date}</div>
                <div className="flex items-center gap-2"><MapPin size={16} /> {match.location}</div>
                <div className="flex items-center gap-2"><Users size={16} /> 실력: {match.skill}</div>
              </div>

              <button
                className="btn btn-primary"
                style={{
                  width: '100%',
                  backgroundColor: isApplied ? 'var(--success)' : undefined,
                  color: isApplied ? '#2d6a4f' : undefined,
                  cursor: isApplied ? 'default' : 'pointer',
                }}
                onClick={() => handleApply(match)}
                disabled={isApplied || isApplying}
              >
                {isApplying ? '신청 중...' : isApplied ? '✓ 신청 완료' : '신청하기'}
              </button>
            </div>
          );
        })}
        {filteredMatches.length === 0 && (
          <div className="text-center text-muted mt-2">해당 종목의 매칭 글이 없습니다. 😢</div>
        )}
      </div>
    </div>
  );
}
