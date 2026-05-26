import { Link, useLocation } from 'react-router-dom';
import { Home, User, PlusCircle, LogIn } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        <span style={{ fontSize: '1.5rem' }}>🌱</span> CBNU Match
      </Link>
      <div className="nav-links">
        <Link to="/" title="홈"><Home size={24} color={isActive('/') ? 'var(--primary)' : 'var(--text-muted)'} /></Link>
        <Link to="/create-match" title="모집하기"><PlusCircle size={24} color={isActive('/create-match') ? 'var(--primary)' : 'var(--text-muted)'} /></Link>
        <Link to="/profile" title="프로필"><User size={24} color={isActive('/profile') ? 'var(--primary)' : 'var(--text-muted)'} /></Link>
        <Link to="/login" title="로그인"><LogIn size={24} color={isActive('/login') ? 'var(--primary)' : 'var(--text-muted)'} /></Link>
      </div>
    </nav>
  );
}
