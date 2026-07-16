import Link from 'next/link';

export default function Home() {
  return (
    <div className="page-container">
      <div className="custom-card">
        {/* 主標題 */}
        <h1 className="custom-h1" style={{ fontSize: '28px', marginBottom: '8px' }}>
          辯論社線上集點系統
        </h1>
        {/* 副標（字小一點，高對比灰色） */}
        <h2 className="custom-h1" style={{ fontSize: '18px', fontWeight: 'normal', color: '#64748B', marginTop: '0', marginBottom: '24px' }}>
          @ptdtdb_115
        </h2>

        {/* 內文 */}
        <p className="custom-p" style={{ marginBottom: '32px' }}>
          登入系統查看您的論點餘額與兌換獎品。
        </p>

        {/* 圓角登入按鈕區 */}
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
