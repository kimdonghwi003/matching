import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function Chat() {
  const { userId: otherUserId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [otherUser, setOtherUser] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (otherUserId === user.id) { navigate('/messages'); return; }

    fetchOtherUser();
    fetchMessages();
    markAsRead();

    const channel = supabase
      .channel(`chat-${[user.id, otherUserId].sort().join('-')}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.new.sender_id === otherUserId) {
          setMessages(prev => [...prev, payload.new]);
          markAsRead();
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, otherUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchOtherUser = async () => {
    const { data } = await supabase
      .from('users').select('id, nickname').eq('id', otherUserId).single();
    if (data) setOtherUser(data);
  };

  const fetchMessages = async () => {
    const [{ data: sent }, { data: received }] = await Promise.all([
      supabase.from('messages').select('*')
        .eq('sender_id', user.id).eq('receiver_id', otherUserId)
        .order('created_at', { ascending: true }),
      supabase.from('messages').select('*')
        .eq('sender_id', otherUserId).eq('receiver_id', user.id)
        .order('created_at', { ascending: true }),
    ]);
    const all = [...(sent || []), ...(received || [])].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
    setMessages(all);
  };

  const markAsRead = async () => {
    await supabase.from('messages').update({ is_read: true })
      .eq('receiver_id', user.id).eq('sender_id', otherUserId).eq('is_read', false);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setSendError('');
    setInput('');
    const { data, error } = await supabase
      .from('messages')
      .insert({ sender_id: user.id, receiver_id: otherUserId, content })
      .select().single();
    if (!error && data) {
      setMessages(prev => [...prev, data]);
    } else if (error) {
      setInput(content); // 실패 시 입력창 복원
      if (error.code === '42501' || error.message?.includes('security policy')) {
        setSendError('권한 오류: Supabase SQL Editor에서 messages 테이블 RLS 정책을 설정해주세요.');
      } else {
        setSendError(`전송 오류: ${error.message}`);
      }
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  };

  // 날짜 구분선 렌더링
  let lastDate = null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)' }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        paddingBottom: '12px', marginBottom: '8px',
        borderBottom: '2px solid #f1f3f5', flexShrink: 0,
      }}>
        <button
          onClick={() => navigate('/messages')}
          style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <ChevronLeft size={24} color="var(--primary)" />
        </button>
        <div className="chat-avatar" style={{ width: '36px', height: '36px', fontSize: '1rem' }}>
          {otherUser?.nickname?.[0]?.toUpperCase() || '?'}
        </div>
        <span style={{ fontWeight: '700', fontSize: '1.05rem' }}>
          {otherUser?.nickname || '...'}
        </span>
      </div>

      {/* 메시지 목록 */}
      <div style={{
        flex: 1, overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: '4px',
        paddingBottom: '8px',
      }}>
        {messages.length === 0 && (
          <div className="text-center text-muted" style={{ marginTop: '60px', fontSize: '0.9rem' }}>
            첫 메시지를 보내보세요! 👋
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMine = msg.sender_id === user.id;
          const msgDate = new Date(msg.created_at).toDateString();
          const showDateSep = msgDate !== lastDate;
          lastDate = msgDate;

          return (
            <div key={msg.id}>
              {showDateSep && (
                <div style={{
                  textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)',
                  margin: '12px 0 8px', display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <div style={{ flex: 1, height: '1px', background: '#f1f3f5' }} />
                  {formatDate(msg.created_at)}
                  <div style={{ flex: 1, height: '1px', background: '#f1f3f5' }} />
                </div>
              )}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMine ? 'flex-end' : 'flex-start',
                marginTop: idx > 0 && messages[idx - 1]?.sender_id === msg.sender_id ? '2px' : '8px',
              }}>
                <div style={{
                  maxWidth: '75%',
                  padding: '9px 14px',
                  borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isMine ? 'var(--primary)' : '#f1f3f5',
                  color: isMine ? 'white' : 'var(--text-main)',
                  fontSize: '0.95rem',
                  lineHeight: '1.45',
                  wordBreak: 'break-word',
                }}>
                  {msg.content}
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {formatTime(msg.created_at)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {sendError && (
        <div style={{
          background: '#fff0f3', color: 'var(--danger)',
          padding: '10px 14px', borderRadius: 'var(--radius-sm)',
          fontSize: '0.82rem', marginBottom: '6px', flexShrink: 0,
        }}>
          ⚠️ {sendError}
        </div>
      )}

      {/* 입력창 */}
      <form
        onSubmit={sendMessage}
        style={{
          display: 'flex', gap: '8px', paddingTop: '10px',
          borderTop: '2px solid #f1f3f5', flexShrink: 0,
        }}
      >
        <input
          ref={inputRef}
          className="input-field"
          style={{ margin: 0, flex: 1, padding: '10px 14px' }}
          placeholder="메시지 입력..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) sendMessage(e); }}
          disabled={sending}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          style={{
            background: input.trim() ? 'var(--primary)' : '#f1f3f5',
            color: input.trim() ? 'white' : 'var(--text-muted)',
            border: 'none', borderRadius: 'var(--radius-md)',
            padding: '0 16px', display: 'flex', alignItems: 'center',
            transition: 'all 0.2s', flexShrink: 0,
            cursor: input.trim() ? 'pointer' : 'default',
          }}
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
