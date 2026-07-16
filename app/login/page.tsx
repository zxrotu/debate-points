'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// 1. 將登入表單抽離成獨立元件
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
    <div className="w-full max-w-md p-8 bg-slate-900 rounded-2xl shadow-xl border border-slate-800">
      <h2 className="text-2xl font-bold text-center mb-6">
        {isAdmin ? '🛡️ 管理員專屬登入' : '💡 社員登入'}
      </h2>
      {error && <div className="p-3 bg-red-900/30 border border-red-500 text-red-200 rounded-lg text-sm mb-4 text-center">{error}</div>}
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">帳號</label>
          <input type="text" required value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="請輸入帳號" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">密碼</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="請輸入密碼" />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 py-3 rounded-lg font-bold transition">
          {loading ? '登入中...' : '確認登入'}
        </button>
      </form>
    </div>
  );
}

// 2. 主登入頁面用 Suspense 包起表單，防止靜態打包時報錯
export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4 text-white">
      <Suspense fallback={<div className="text-white text-lg">載入中...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
