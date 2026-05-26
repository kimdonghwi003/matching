import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchConversations();
  }, [user]);

  const fetchConversations = async () => {
    setLoading(true);

    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!msgs || msgs.length === 0) { setLoading(false); return; }

    const partnerIds = [...new Set(
      msgs.map(m => m.sender_id === user.id ? m.receiver_id : m.sender_id)
    )];

    const { data: usersData } = await supabase
      .from('users')
      .select('id, nickname')
      .in('id', partnerIds);

    const partnerMap = {};
    (usersData || []).forEach(u => { partnerMap[u.id] = u.nickname; });

    const convMap = {};
    msgs.forEach(msg => {
      const pid = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!convMap[pid]) {
        convMap[pid] = {
          userId: pid,
          nickname: partnerMap[pid] || '알 수 없음',
          lastMessage: msg.content,
          lastTime: msg.created_at,
          unread: 0,
        };
      }
      if (msg.receiver_id === user.id && !msg.is_read) {
        convMap[pid].unread++;
      }
    });

    setConversations(
      Object.values(convMap).sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime))
    );
    setLoading(false);
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    const diff = Date.now() - d;
    if (diff < 60000) return '방금';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div>
      <h2 style={{ color: 'var(--primary)', marginBottom: '24px' }}>💬 메시지</h2>

      {loading ? (
        <div className="text-center text-muted mt-2">불러오는 중...</div>
      ) : conversations.length === 0 ? (
        <div className="card text-center" style={{ padding: '48px 24px' }}>
          <MessageSquare size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
          <p className="text-muted">아직 대화가 없습니다.</p>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>
            매칭 신청 후 상대방과 채팅해보세요!
          </p>
        </div>
      ) : (
        <div className="flex-col gap-2">
          {conversations.map(conv => (
            <div
              key={conv.userId}
              onClick={() => navigate(`/messages/${conv.userId}`)}
              className="chat-conv-item"
            >
              <div className="chat-avatar">
                {conv.nickname[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{ fontWeight: '700' }}>{conv.nickname}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {formatTime(conv.lastTime)}
                  </span>
                </div>
                <div style={{
                  fontSize: '0.88rem', color: 'var(--text-muted)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {conv.lastMessage}
                </div>
              </div>
              {conv.unread > 0 && (
                <span style={{
                  background: 'var(--danger)', color: 'white', borderRadius: '999px',
                  padding: '2px 8px', fontSize: '0.75rem', fontWeight: '700', flexShrink: 0,
                }}>
                  {conv.unread}
                </span>
              )}
              <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
