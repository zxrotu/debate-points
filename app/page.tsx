import Link from 'next/link';

export default function Home() {
  return (
    <div className="page-container">
      <div className="custom-card">
        <img 
          src="/logo.png" 
          alt="辯論社 Logo" 
          style={{ 
            width: '100px', 
            height: 'auto', 
            marginTop: '16px', 
            marginBottom: '20px', // 💡 修正：B 必須是大寫！
            display: 'block', 
            marginLeft: 'auto', 
            marginRight: 'auto' 
          }} 
        />
        <h1 className="custom-h1" style={{ fontSize: '28px', marginBottom: '16px' }}>
          辯論社線上系統
        </h1>
        <p className="custom-p" style={{ marginBottom: '32px' }}>
          思無界，辯無限。
          <br />
          本系統僅授權辯論社社員登入！
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <Link href="/login?role=member" className="custom-btn-primary">
            社員登入
          </Link>
          <Link href="/login?role=admin" className="custom-btn-secondary">
            管理員登入
          </Link>
        </div>
        <div style={{ fontSize: '16px', color: '#64748B', marginTop: '16px', textAlign: 'center' }}>
          @ptdtdb_115
        </div>
      </div>
    </div>
  );
}
