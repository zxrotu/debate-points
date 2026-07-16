import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF3E8] text-black px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-extrabold mb-4 text-slate-800">
          辯論社「論點」集點系統
        </h1>
        <p className="text-slate-600 mb-8 font-light">思無界，辯無限。在此查看您的「論點」餘額或兌換獎品。</p>
        <div className="space-y-4">
          <Link href="/login?role=member" className="block w-full bg-[#0097B2] hover:bg-[#007A8F] text-white py-3 rounded-lg font-semibold transition text-center shadow-sm">
            社員登入
          </Link>
          <Link href="/login?role=admin" className="block w-full bg-white hover:bg-slate-50 text-[#0097B2] border border-[#0097B2] py-3 rounded-lg font-semibold transition text-center shadow-sm">
            管理員登入
          </Link>
        </div>
      </div>
    </div>
  );
}
