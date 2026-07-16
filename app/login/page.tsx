import Link from 'next/link';

export default function Home() {
  return (
    <div className="page-container">
      <div className="custom-card">
        {/* 社團 Logo：上方新增 16px 舒適留白 */}
        <img 
          src="/logo.png" 
          alt="辯論社 Logo" 
          style={{ 
            width: '100px', 
            height: 'auto', 
            marginTop: '16px', 
            marginBottom: '20px', 
            display: 'block', 
            marginLeft: 'auto', 
            marginRight: 'auto' 
          }} 
        />

        {/* 主標題 */}
        <h1 className="custom-h1" style={{ fontSize: '28px', marginBottom: '16px' }}>
          辯論社線上集點系統
        </h1>

        {/* 內文說明 */}
        <p className="custom-p" style={{ marginBottom: '32px' }}>
          思無界，辯無限。
          <br />
          本系統得查看您的「論點」餘額與兌換獎品。
        </p>

        {/* 圓角登入按鈕區 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <Link href="/login?role=member" className="custom-btn-primary">
            社員登入
          </Link>
          <Link href="/login?role=admin" className="custom-btn-secondary">
            管理員登入
          </Link>
        </div>

        {/* 副標帳號 */}
        <div style={{ fontSize: '16px', color: '#64748B', marginTop: '16px', textAlign: 'center' }}>
          @ptdtdb_115
        </div>

      </div>
    </div>
  );
}
