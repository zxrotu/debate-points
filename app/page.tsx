import Link from 'next/link';

export default function Home() {
  return (
    <div className="page-container">
      <div className="custom-card">
        <h1 className="custom-h1">辯論社「論點」集點系統</h1>
        <p className="custom-p">
          思無界，辯無限。在此查看您的「論點」餘額與兌換精美獎品。
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Link href="/login?role=member" className="custom-btn-primary">
            社員登入
          </Link>
          <Link href="/login?role=admin" className="custom-btn-secondary">
            管理員登入
          </Link>
        </div>
      </div>
    </div>
  );
}
