export default function Profile() {
  return (
    <div>
      <div className="card mb-3 text-center">
        <div style={{ 
          width: '80px', height: '80px', 
          backgroundColor: 'var(--primary)', 
          borderRadius: '50%', 
          margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', color: 'white'
        }}>
          😎
        </div>
        <h2>충북대 열정맨</h2>
        <p className="text-muted">소프트웨어학부 • 20학번</p>
        
        <div className="flex justify-between items-center mt-2" style={{ backgroundColor: '#f1f3f5', padding: '16px', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontWeight: '600' }}>🌡️ 매너 온도</span>
          <span style={{ color: 'var(--danger)', fontWeight: 'bold', fontSize: '1.4rem' }}>38.5°C</span>
        </div>
      </div>

      <h3 className="mb-2" style={{ color: 'var(--primary)' }}>내 스포츠 프로필</h3>
      
      <div className="card mb-2 flex justify-between items-center" style={{ padding: '16px' }}>
        <div>
          <div className="tag tag-futsal mb-1">FUTSAL</div>
          <div style={{ fontWeight: '600' }}>중급 • 피보</div>
        </div>
        <button className="btn btn-secondary">수정</button>
      </div>

      <div className="card flex justify-between items-center" style={{ padding: '16px' }}>
        <div>
          <div className="tag tag-esports mb-1">E-SPORTS</div>
          <div style={{ fontWeight: '600' }}>고급 • 서포터</div>
        </div>
        <button className="btn btn-secondary">수정</button>
      </div>
    </div>
  );
}
