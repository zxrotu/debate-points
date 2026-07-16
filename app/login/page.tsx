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
    <div className="w-full max-w-sm p-8 bg-white rounded-3xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-center mb-8 text-slate-800">
        {isAdmin ? '管理員專屬登入' : '社員登入'}
      </h2>
      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm mb-4 text-center">{error}</div>}
      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 px-1">帳號</label>
          <input type="text" required value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-[#FAF3E8] border border-slate-200 rounded-full px-5 py-2.5 text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#0097B2]" placeholder="請輸入帳號" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 px-1">密碼</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#FAF3E8] border border-slate-200 rounded-full px-5 py-2.5 text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#0097B2]" placeholder="請輸入密碼" />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-[#0097B2] hover:bg-[#007A8F] text-white py-3 rounded-full font-bold transition shadow-sm text-sm mt-2">
          {loading ? '登入中...' : '確認登入'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#FAF3E8] px-4">
      <Suspense fallback={<div className="text-slate-800 text-lg">載入中...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
