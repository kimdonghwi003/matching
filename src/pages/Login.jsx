import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    email: '', studentId: '', name: '', nickname: '', password: '', passwordConfirm: '',
  });

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await signIn(loginForm.email, loginForm.password);
    setLoading(false);
    if (err) {
      if (err.message.includes('Invalid login credentials') || err.message.includes('invalid_credentials'))
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      else if (err.message.includes('Email not confirmed') || err.message.includes('email_not_confirmed'))
        setError('이메일 인증이 완료되지 않았습니다. Supabase SQL에서 supabase_rls_setup.sql을 실행해주세요.');
      else
        setError(err.message);
      return;
    }
    navigate('/');
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (signupForm.password !== signupForm.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (signupForm.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    const result = await signUp(signupForm.email, signupForm.password, {
      studentId: signupForm.studentId,
      name: signupForm.name,
      nickname: signupForm.nickname,
    });
    setLoading(false);
    if (result.error) {
      if (result.error.message.includes('already registered') || result.error.message.includes('already been registered'))
        setError('이미 가입된 이메일입니다.');
      else if (result.error.message.includes('duplicate') || result.error.message.includes('unique'))
        setError('이미 사용 중인 닉네임이거나 학번입니다.');
      else
        setError(result.error.message);
      return;
    }
    if (result.autoLoggedIn) {
      navigate('/');
      return;
    }
    setSuccessMsg('회원가입이 완료되었습니다! 로그인 탭에서 로그인해주세요.');
  };

  return (
    <div className="card" style={{ marginTop: '40px' }}>
      <div className="text-center mb-3">
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏫</div>
        <h2 style={{ color: 'var(--primary)' }}>충북대 학생 인증</h2>
        <p className="text-muted">안전한 매칭을 위해 로그인이 필요합니다.</p>
      </div>

      {/* 탭 */}
      <div className="flex mb-3" style={{ borderBottom: '2px solid #f1f3f5' }}>
        {['login', 'signup'].map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1, padding: '12px', background: 'none', border: 'none',
              fontWeight: '600', fontSize: '1rem',
              color: tab === t ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: '-2px', cursor: 'pointer',
            }}
          >
            {t === 'login' ? '로그인' : '회원가입'}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ backgroundColor: '#fff0f3', color: 'var(--danger)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{ backgroundColor: '#d8f3dc', color: '#2d6a4f', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.9rem' }}>
          {successMsg}
        </div>
      )}

      {tab === 'login' ? (
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">이메일</label>
            <input
              type="email" className="input-field" placeholder="예: student@cbnu.ac.kr"
              value={loginForm.email} required
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">비밀번호</label>
            <input
              type="password" className="input-field" placeholder="비밀번호 입력"
              value={loginForm.password} required
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSignup}>
          <div className="form-group">
            <label className="form-label">이메일</label>
            <input
              type="email" className="input-field" placeholder="예: student@cbnu.ac.kr"
              value={signupForm.email} required
              onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">학번</label>
            <input
              type="text" className="input-field" placeholder="예: 202400000"
              value={signupForm.studentId} required
              onChange={(e) => setSignupForm({ ...signupForm, studentId: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">이름</label>
            <input
              type="text" className="input-field" placeholder="실명 입력"
              value={signupForm.name} required
              onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">닉네임</label>
            <input
              type="text" className="input-field" placeholder="사용할 닉네임"
              value={signupForm.nickname} required
              onChange={(e) => setSignupForm({ ...signupForm, nickname: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">비밀번호</label>
            <input
              type="password" className="input-field" placeholder="6자 이상"
              value={signupForm.password} required
              onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">비밀번호 확인</label>
            <input
              type="password" className="input-field" placeholder="비밀번호 재입력"
              value={signupForm.passwordConfirm} required
              onChange={(e) => setSignupForm({ ...signupForm, passwordConfirm: e.target.value })}
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>
      )}
    </div>
  );
}
