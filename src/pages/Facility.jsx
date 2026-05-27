import { ExternalLink, Clock, MapPin, Phone } from 'lucide-react';

const FACILITIES = [
  {
    id: 1,
    name: '충북대학교 체육관',
    icon: '🏟️',
    description: '농구, 배드민턴, 탁구, 실내 풋살 등 다목적 체육 시설. 학생증 지참 후 이용 가능.',
    hours: '평일 09:00 ~ 22:00 / 토 10:00 ~ 18:00 / 일·공휴일 휴관',
    location: '충북대학교 학생회관 인근 (충북 청주시 서원구 충대로 1)',
    note: '사전 예약 필수 (학교 포털 로그인 후 예약)',
    reservationUrl: 'https://www.cbnu.ac.kr/site/www/main.do',
    tags: ['농구', '배드민턴', '탁구', '풋살'],
  },
  {
    id: 2,
    name: '충북대학교 대운동장',
    icon: '⚽',
    description: '풋살, 축구 등 야외 구기 종목에 적합한 잔디 운동장. 소규모 팀 매칭에 최적.',
    hours: '일출~일몰 (계절별 상이)',
    location: '충북대학교 캠퍼스 내 (학생회관 뒤편)',
    note: '단체 사용 시 사전 공간 예약 필요',
    reservationUrl: 'https://www.cbnu.ac.kr/site/www/main.do',
    tags: ['풋살', '축구'],
  },
  {
    id: 3,
    name: '충북대학교 테니스장',
    icon: '🎾',
    description: '정규 규격 테니스 코트. 개인 라켓 지참. 충북대 재학생 우선 사용.',
    hours: '평일 09:00 ~ 20:00 / 주말 10:00 ~ 17:00',
    location: '충북대학교 체육관 인근',
    note: '코트 예약제 운영 (1시간 단위)',
    reservationUrl: 'https://www.cbnu.ac.kr/site/www/main.do',
    tags: ['테니스'],
  },
  {
    id: 4,
    name: '충북대학교 수영장',
    icon: '🏊',
    description: '25m 실내 수영장. 레인별 수영, 수영 강습 등 이용 가능.',
    hours: '평일 06:00 ~ 22:00 / 주말 08:00 ~ 18:00',
    location: '충북대학교 체육교육학과 건물 내',
    note: '입장료 별도 (학생 할인 적용)',
    reservationUrl: 'https://www.cbnu.ac.kr/site/www/main.do',
    tags: ['수영'],
  },
  {
    id: 5,
    name: '충북대학교 스쿼시장',
    icon: '🏸',
    description: '스쿼시 코트 시설. 라켓 및 공 대여 가능.',
    hours: '평일 09:00 ~ 21:00',
    location: '체육관 지하 1층',
    note: '2인 이상 예약 시 사용 가능',
    reservationUrl: 'https://www.cbnu.ac.kr/site/www/main.do',
    tags: ['스쿼시'],
  },
];

const QUICK_LINKS = [
  {
    label: '충북대학교 포털 (시설 예약)',
    url: 'https://portal.cbnu.ac.kr',
    desc: '학생 로그인 후 체육 시설 예약',
  },
  {
    label: '충북대학교 공식 홈페이지',
    url: 'https://www.cbnu.ac.kr',
    desc: '학교 공지 및 안내 확인',
  },
  {
    label: '충북대학교 체육문화회관',
    url: 'https://www.cbnu.ac.kr/site/www/main.do',
    desc: '체육관 프로그램 및 예약 정보',
  },
];

export default function Facility() {
  return (
    <div>
      <div className="mb-3 text-center">
        <h2 style={{ color: 'var(--primary)' }}>🏟️ 학내 체육 시설</h2>
        <p className="text-muted">충북대학교 캠퍼스 내 체육 시설 정보와 예약 안내입니다.</p>
      </div>

      {/* 예약 안내 배너 */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, #1a7a4e 100%)',
        color: 'white',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        <div style={{ fontWeight: '700', fontSize: '1rem' }}>📋 시설 예약 방법</div>
        <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.88rem', lineHeight: '1.8', opacity: 0.95 }}>
          <li>충북대학교 포털(<code>portal.cbnu.ac.kr</code>)에 학생 계정으로 로그인</li>
          <li>생활 / 체육 시설 예약 메뉴 접속</li>
          <li>원하는 시설·날짜·시간 선택 후 예약 확정</li>
          <li>예약 확인서 출력 or 모바일 제시 후 입장</li>
        </ol>
        <a
          href="https://portal.cbnu.ac.kr"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,0.2)', borderRadius: '8px',
            padding: '8px 14px', fontSize: '0.85rem', color: 'white',
            textDecoration: 'none', marginTop: '4px', width: 'fit-content',
          }}
        >
          <ExternalLink size={14} /> 포털 바로가기
        </a>
      </div>

      {/* 시설 목록 */}
      <h3 style={{ color: 'var(--primary)', marginBottom: '12px' }}>🏋️ 시설 목록</h3>
      <div className="flex-col gap-3 mb-3">
        {FACILITIES.map((fac) => (
          <div key={fac.id} className="card" style={{ padding: '18px' }}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '1.6rem' }}>{fac.icon}</span>
                <h4 style={{ margin: 0, fontSize: '1rem' }}>{fac.name}</h4>
              </div>
              <a
                href={fac.reservationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '4px', textDecoration: 'none' }}
              >
                <ExternalLink size={12} /> 예약
              </a>
            </div>

            {/* 태그 */}
            <div className="flex gap-1" style={{ flexWrap: 'wrap', marginBottom: '10px' }}>
              {fac.tags.map((tag) => (
                <span key={tag} style={{
                  background: '#e8f4fd', color: '#1a73e8',
                  padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '500',
                }}>
                  {tag}
                </span>
              ))}
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: '1.5' }}>
              {fac.description}
            </p>

            <div className="flex-col gap-1" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <div className="flex items-center gap-2">
                <Clock size={13} />
                <span>{fac.hours}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={13} />
                <span>{fac.location}</span>
              </div>
              {fac.note && (
                <div style={{ marginTop: '4px', padding: '6px 10px', background: '#fff8e1', borderRadius: '6px', color: '#7c5c00', fontSize: '0.8rem' }}>
                  ⚠️ {fac.note}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 빠른 링크 */}
      <h3 style={{ color: 'var(--primary)', marginBottom: '12px' }}>🔗 빠른 링크</h3>
      <div className="flex-col gap-2">
        {QUICK_LINKS.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <div className="card flex justify-between items-center" style={{ padding: '14px 16px' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-main)' }}>{link.label}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>{link.desc}</div>
              </div>
              <ExternalLink size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            </div>
          </a>
        ))}
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '20px' }}>
        시설 운영시간은 학교 사정에 따라 변경될 수 있습니다.<br />
        최신 정보는 충북대학교 공식 홈페이지에서 확인하세요.
      </p>
    </div>
  );
}
