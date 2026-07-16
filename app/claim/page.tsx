'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ClaimPointsForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const claimId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'success' | 'expired' | 'already_claimed' | 'error' | 'loading'>('loading');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!claimId) {
      setStatus('error');
      setLoading(false);
      return;
    }

    const executeClaim = async () => {
      try {
        const res = await fetch('/api/member/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ claim_id: claimId }),
        });

        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setResult(data);
        } else {
          if (data.error === 'NOT_LOGGED_IN') {
            // 💡 若未登入，自動重導向至登入頁，並記錄 redirect 參數以供登入後直接回到此頁面加點！
            router.push(`/login?role=member&redirect=/claim?id=${claimId}`);
            return;
          } else if (data.error === 'EXPIRED') {
            setStatus('expired');
          } else if (data.error === 'ALREADY_CLAIMED') {
            setStatus('already_claimed');
            setResult(data);
          } else {
            setStatus('error');
          }
        }
      } catch (err) {
        setStatus('error');
      } finally {
        setLoading(false);
      }
    };

    executeClaim();
  }, [claimId]);

  if (status === 'loading') {
    return (
      <div className="custom-card" style={{ textAlign: 'center' }}>
        <h2 className="custom-h1">安全碼驗證中</h2>
        <p className="custom-p">正在確認您的領取資格，請稍候...</p>
      </div>
    );
  }

  if (status === 'success' && result) {
    return (
      <div className="custom-card" style={{ textAlign: 'center' }}>
        <h2 className="custom-h1" style={{ color: '#059669' }}>點數領取成功</h2>
        <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #10B981', padding: '16px', borderRadius: '16px', marginBottom: '24px' }}>
          <p style={{ fontSize: '15px', color: '#065F46', margin: '0 0 8px 0', fontWeight: 'bold' }}>
            恭喜 {result.student_name} 同學！
          </p>
          <p style={{ fontSize: '14px', color: '#065F46', margin: '0 0 12px 0' }}>
            您已成功領取【{result.title}】的 {result.points_added} 個論點！
          </p>
          <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#0097B2', margin: 0 }}>
            目前論點餘額：{result.new_points} 點
          </p>
        </div>
        <button onClick={() => router.push('/member/dashboard')} className="custom-btn-primary">
          前往個人後台
        </button>
      </div>
    );
  }

  if (status === 'already_claimed' && result) {
    return (
      <div className="custom-card" style={{ textAlign: 'center' }}>
        <h2 className="custom-h1" style={{ color: '#D97706' }}>請勿重複領取</h2>
        <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #F59E0B', padding: '16px', borderRadius: '16px', marginBottom: '24px' }}>
          <p style={{ fontSize: '14px', color: '#78350F', margin: 0 }}>
            您先前已經成功領取過【{result.title}】的 {result.points} 點囉，無法重複掃描領取！
          </p>
        </div>
        <button onClick={() => router.push('/member/dashboard')} className="custom-btn-primary">
          返回個人後台
        </button>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="custom-card" style={{ textAlign: 'center' }}>
        <h2 className="custom-h1" style={{ color: '#EF4444' }}>此安全碼已失效</h2>
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #EF4444', padding: '16px', borderRadius: '16px', marginBottom: '24px' }}>
          <p style={{ fontSize: '14px', color: '#991B1B', margin: 0 }}>
            很抱歉！此加點活動已超過 5 分鐘領取時限，條碼已過期失效。請向管理員出示最新畫面。
          </p>
        </div>
        <button onClick={() => router.push('/')} className="custom-btn-primary">
          返回首頁
        </button>
      </div>
    );
  }

  return (
    <div className="custom-card" style={{ textAlign: 'center' }}>
      <h2 className="custom-h1" style={{ color: '#EF4444' }}>條碼無效</h2>
      <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #EF4444', padding: '16px', borderRadius: '16px', marginBottom: '24px' }}>
        <p style={{ fontSize: '14px', color: '#991B1B', margin: 0 }}>
          偵測到格式錯誤或不存在的活動安全碼，請重新掃描正確的 QR Code。
        </p>
      </div>
      <button onClick={() => router.push('/')} className="custom-btn-primary">
        返回首頁
      </button>
    </div>
  );
}

export default function ClaimPage() {
  return (
    <div className="page-container">
      <Suspense fallback={<div style={{ color: '#000000', fontSize: '18px' }}>安全碼加載中...</div>}>
        <ClaimPointsForm />
      </Suspense>
    </div>
  );
}
