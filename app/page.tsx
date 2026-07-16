import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-extrabold mb-4 bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          辯論社【論點】集點系統
        </h1>
        <p className="text-slate-400 mb-8 font-light">精進思維，累積智慧。在此查看您的「論點」餘額與兌換精美獎品。</p>
        <div className="space-y-4">
          <Link href="/login?role=member" className="block w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold transition text-center">
            社員登入
          </Link>
          <Link href="/login?role=admin" className="block w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-lg font-semibold transition text-center text-slate-300">
            管理員登入
          </Link>
        </div>
      </div>
    </div>
  );
}
