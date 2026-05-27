import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, User, PlusCircle, LogIn, LogOut, MessageSquare, Trophy, Building } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [unread, setUnread] = useState(0);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  // 읽지 않은 메시지 수
  useEffect(() => {
    if (!user) { setUnread(0); return; }

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);
      setUnread(count || 0);
    };

    fetchUnread();

    const channel = supabase
      .channel(`unread-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, () => fetchUnread())
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, () => fetchUnread())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        <span style={{ fontSize: '1.5rem' }}>🐮</span> CBNU Match
      </Link>
      <div className="nav-links" style={{ alignItems: 'center' }}>
        <Link to="/" title="홈">
          <Home size={24} color={isActive('/') && location.pathname === '/' ? 'var(--primary)' : 'var(--text-muted)'} />
        </Link>
        <Link to="/create-match" title="모집하기">
          <PlusCircle size={24} color={isActive('/create-match') ? 'var(--primary)' : 'var(--text-muted)'} />
        </Link>
        <Link to="/contest" title="공모전">
          <Trophy size={24} color={isActive('/contest') ? 'var(--primary)' : 'var(--text-muted)'} />
        </Link>
        <Link to="/facility" title="시설예약">
          <Building size={24} color={isActive('/facility') ? 'var(--primary)' : 'var(--text-muted)'} />
        </Link>

        {user && (
          <Link to="/messages" title="메시지" style={{ position: 'relative' }}>
            <MessageSquare size={24} color={isActive('/messages') ? 'var(--primary)' : 'var(--text-muted)'} />
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-6px',
                background: 'var(--danger)', color: 'white',
                borderRadius: '999px', fontSize: '0.65rem', fontWeight: '700',
                padding: '1px 5px', lineHeight: '1.4', pointerEvents: 'none',
              }}>
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </Link>
        )}

        <Link to="/profile" title="프로필">
          <User size={24} color={isActive('/profile') ? 'var(--primary)' : 'var(--text-muted)'} />
        </Link>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.user_metadata?.nickname || user.email?.split('@')[0]}
            </span>
            <button
              onClick={handleSignOut}
              title="로그아웃"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
            >
              <LogOut size={24} color="var(--text-muted)" />
            </button>
          </div>
        ) : (
          <Link to="/login" title="로그인">
            <LogIn size={24} color={isActive('/login') ? 'var(--primary)' : 'var(--text-muted)'} />
          </Link>
        )}
      </div>
    </nav>
  );
}
