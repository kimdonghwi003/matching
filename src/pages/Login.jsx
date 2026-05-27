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
        setError('이메일 인증이 필요한 계정입니다. Supabase 대시보드 → Authentication → Providers → Email → "Confirm email" 을 OFF로 설정하고, SQL Editor에서 UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL; 을 실행해주세요.');
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
      const msg = result.error.message || '';
      if (msg.includes('already registered') || msg.includes('already been registered'))
        setError('이미 가입된 이메일입니다.');
      else if (msg.includes('duplicate') || msg.includes('unique'))
        setError('이미 사용 중인 닉네임이거나 학번입니다.');
      else if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit'))
        setError('잠시 후 다시 시도해주세요.');
      else if (msg.includes('User already registered'))
        setError('이미 가입된 이메일입니다.');
      else
        setError(msg);
      return;
    }
    if (result.autoLoggedIn) {
      navigate('/');
      return;
    }
    setSuccessMsg('회원가입 완료! 로그인 탭에서 로그인해주세요.');
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
          {/* 로그인 안내 문구 */}
          <div style={{
            background: '#e8f4fd', border: '1px solid #bde0ff',
            borderRadius: 'var(--radius-sm)', padding: '12px 14px',
            marginBottom: '16px', fontSize: '0.8rem', color: '#1a3c6a', lineHeight: '1.6',
          }}>
            🔐 <strong>로그인 안내</strong><br />
            회원가입 시 등록한 이메일과 비밀번호로 로그인해주세요.
            회원 탈퇴 전까지 계정 정보가 유지됩니다.
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
          {/* 회원가입 개인정보 보호 안내 문구 */}
          <div style={{
            background: '#e8f4fd', border: '1px solid #bde0ff',
            borderRadius: 'var(--radius-sm)', padding: '12px 14px',
            marginBottom: '16px', fontSize: '0.8rem', color: '#1a3c6a', lineHeight: '1.7',
          }}>
            🔐 <strong>개인정보 보호 안내</strong><br />
            회원가입 시 입력하신 이메일과 비밀번호는 Supabase 데이터베이스에 암호화(해시 처리)된 상태로
            안전하게 저장됩니다. 회원 탈퇴 전까지 동일한 이메일과 비밀번호로 로그인하실 수 있습니다.
            이메일 인증번호 발송은 진행되지 않으며, 가입 즉시 로그인이 가능합니다.
            이미 가입된 이메일로는 중복 가입이 불가하며, 비밀번호와 비밀번호 확인이 일치해야 가입이 완료됩니다.
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>
      )}
    </div>
  );
}
