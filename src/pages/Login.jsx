export default function Login() {
  return (
    <div className="card" style={{ marginTop: '40px' }}>
      <div className="text-center mb-3">
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏫</div>
        <h2 style={{ color: 'var(--primary)' }}>충북대 학생 인증</h2>
        <p className="text-muted">안전한 매칭을 위해 학번 로그인이 필요합니다.</p>
      </div>

      <div className="form-group">
        <label className="form-label">학번</label>
        <input type="text" className="input-field" placeholder="예: 202400000" />
      </div>

      <div className="form-group">
        <label className="form-label">비밀번호</label>
        <input type="password" className="input-field" placeholder="종합정보시스템 비밀번호" />
      </div>

      <button className="btn btn-primary" style={{ width: '100%', marginBottom: '16px' }}>로그인</button>
      
      <button className="btn btn-outline" style={{ width: '100%' }}>회원가입</button>
    </div>
  );
}
