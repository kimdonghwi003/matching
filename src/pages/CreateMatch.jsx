export default function CreateMatch() {
  return (
    <div className="card">
      <h2 className="mb-3 text-center" style={{ color: 'var(--primary)' }}>✍️ 매칭 글 작성</h2>
      
      <div className="form-group">
        <label className="form-label">종목</label>
        <select className="input-field">
          <option value="futsal">풋살</option>
          <option value="basketball">농구</option>
          <option value="tennis">테니스</option>
          <option value="esports">e-sports</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">제목</label>
        <input type="text" className="input-field" placeholder="멋진 제목을 입력해주세요!" />
      </div>

      <div className="form-group">
        <label className="form-label">일시</label>
        <input type="datetime-local" className="input-field" />
      </div>

      <div className="form-group">
        <label className="form-label">장소</label>
        <input type="text" className="input-field" placeholder="예: 충북대 대운동장" />
      </div>

      <div className="form-group">
        <label className="form-label">요구 실력</label>
        <select className="input-field">
          <option value="입문">입문 (누구나)</option>
          <option value="초급">초급</option>
          <option value="중급">중급</option>
          <option value="고급">고급</option>
        </select>
      </div>
      
      <div className="form-group">
        <label className="form-label">상세 내용</label>
        <textarea className="input-field" rows="4" placeholder="참가자들에게 전하고 싶은 말을 적어주세요."></textarea>
      </div>

      <button className="btn btn-primary" style={{ width: '100%' }}>등록하기</button>
    </div>
  );
}
