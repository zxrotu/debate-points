import Link from 'next/link';

export default function Home() {
  return (
    <div className="page-container">
      <div className="custom-card">
        {/* 第一行大標題 */}
        <h1 className="custom-h1" style={{ fontSize: '32px', marginBottom: '8px' }}>
          PTDTDB 115
        </h1>
        {/* 第二行標題 */}
        <h2 className="custom-h1" style={{ fontSize: '28px', marginTop: '0', marginBottom: '24px', fontWeight: 'bold', color: '#1E293B' }}>
          辯論社集點系統
        </h2>

        {/* 雙行說明文：字體與行高皆符合慎思設計指南 */}
        <p className="custom-p" style={{ marginBottom: '32px' }}>
          思無界，辯無限。
          <br />
          登入系統查看您的「論點」餘額或兌換獎品。
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
