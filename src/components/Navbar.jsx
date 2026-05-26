import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, User, PlusCircle, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const isActive = (path) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        <span style={{ fontSize: '1.5rem' }}>🌱</span> CBNU Match
      </Link>
      <div className="nav-links" style={{ alignItems: 'center' }}>
        <Link to="/" title="홈"><Home size={24} color={isActive('/') ? 'var(--primary)' : 'var(--text-muted)'} /></Link>
        <Link to="/create-match" title="모집하기"><PlusCircle size={24} color={isActive('/create-match') ? 'var(--primary)' : 'var(--text-muted)'} /></Link>
        <Link to="/profile" title="프로필"><User size={24} color={isActive('/profile') ? 'var(--primary)' : 'var(--text-muted)'} /></Link>
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
          <Link to="/login" title="로그인"><LogIn size={24} color={isActive('/login') ? 'var(--primary)' : 'var(--text-muted)'} /></Link>
        )}
      </div>
    </nav>
  );
}
