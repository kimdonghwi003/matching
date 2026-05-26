import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Users } from 'lucide-react';
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
  const [filter, setFilter]           = useState('All');
  const [matches, setMatches]         = useState([]);
  const [applied, setApplied]         = useState(new Set());
  const [applyingId, setApplyingId]   = useState(null);
  const [loadingMatches, setLoadingMatches] = useState(true);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { fetchMatches(); }, []);

  useEffect(() => {
    if (user) fetchApplied();
    else setApplied(new Set());
  }, [user]);

  const fetchMatches = async () => {
    setLoadingMatches(true);
    const { data, error } = await supabase
      .from('matches')
      .select('*, users(nickname)')
      .order('created_at', { ascending: false });

    if (!error && data) setMatches(data);
    setLoadingMatches(false);
  };

  const fetchApplied = async () => {
    const { data } = await supabase
      .from('match_applications')
      .select('match_id')
      .eq('applicant_id', user.id);
    if (data) setApplied(new Set(data.map(a => a.match_id)));
  };

  const handleApply = async (match) => {
    if (!user) { navigate('/login'); return; }
    if (applied.has(match.id)) return;

    setApplyingId(match.id);
    const { error } = await supabase.from('match_applications').insert({
      match_id:     match.id,
      applicant_id: user.id,
      message:      '',
    });

    if (!error) setApplied(prev => new Set([...prev, match.id]));
    setApplyingId(null);
  };

  const filteredMatches = filter === 'All'
    ? matches
    : matches.filter(m => m.sport_type === filter);

  return (
    <div>
      <div className="mb-3 text-center">
        <h2 style={{ color: 'var(--primary)' }}>🔥 오늘의 매칭</h2>
        <p className="text-muted">실력이 비슷한 교내 학우들과 매칭해보세요!</p>
      </div>

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

            return (
              <div key={match.id} className="card">
                <div className="flex justify-between items-center mb-1">
                  <span className={`tag tag-${match.sport_type}`}>
                    {SPORT_LABEL[match.sport_type] || match.sport_type}
                  </span>
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>{authorNick}</span>
                </div>
                <h3 className="mb-2" style={{ fontSize: '1.2rem', marginTop: '8px' }}>{match.title}</h3>

                <div className="flex-col gap-2 mb-3" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  {match.match_date && (
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      {new Date(match.match_date).toLocaleString('ko-KR')}
                    </div>
                  )}
                  {match.location && (
                    <div className="flex items-center gap-2"><MapPin size={16} /> {match.location}</div>
                  )}
                  {match.skill_level_required && (
                    <div className="flex items-center gap-2"><Users size={16} /> 실력: {match.skill_level_required}</div>
                  )}
                </div>

                {isAuthor ? (
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', cursor: 'default', opacity: 0.7 }}
                    disabled
                  >
                    내가 개설한 매칭
                  </button>
                ) : (
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
