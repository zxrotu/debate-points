'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsAdmin(searchParams.get('role') === 'admin');
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, isAdminLogin: isAdmin }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      if (data.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/member/dashboard');
      }
    } else {
      setError(data.error || '登入失敗');
    }
  };

  return (
    <div className="custom-card">
      <h2 className="custom-h1" style={{ fontSize: '28px' }}>
        {isAdmin ? '管理員專屬登入' : '社員登入'}
      </h2>
      {error && (
        <div style={{ padding: '12px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', borderRadius: '12px', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
          {error}
        </div>
      )}
      <form onSubmit={handleLogin}>
        <div>
          <label className="custom-field-label">帳號</label>
          <input type="text" required value={username} onChange={e => setUsername(e.target.value)} className="custom-input" placeholder="請輸入帳號" />
        </div>
        <div>
          <label className="custom-field-label">密碼</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="custom-input" placeholder="請輸入密碼" />
        </div>
        <button type="submit" disabled={loading} className="custom-btn-primary" style={{ marginTop: '8px' }}>
          {loading ? '登入中...' : '確認登入'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="page-container">
      <Suspense fallback={<div style={{ color: '#000000', fontSize: '18px' }}>載入中...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
