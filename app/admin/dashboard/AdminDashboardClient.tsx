'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface AdminDashboardClientProps {
  adminName: string;
}

export default function AdminDashboardClient({ adminName }: AdminDashboardClientProps) {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'scan' | 'manual' | 'requests'>('scan');
  const [step, setStep] = useState<'scan_or_search' | 'student_confirm' | 'points_adjust'>('scan_or_search');
  
  const [student, setStudent] = useState<any>(null);
  const [pointsAction, setPointsAction] = useState<'add' | 'deduct'>('add');
  const [amount, setAmount] = useState<number>(5);
  const [reason, setReason] = useState('參與社課加點');
  const [redeemRequests, setRedeemRequests] = useState<any[]>([]);
  
  const [manualUsername, setManualUsername] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  // 精準控制相機實體：當切換到非掃描分頁時，立即呼叫 .clear()，且元件會保持在 DOM 中被隱藏，徹底防範飄移 Bug
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (step === 'scan_or_search' && activeTab === 'scan') {
      scanner = new Html5QrcodeScanner(
        'reader',
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [0], // 僅限相機
          videoConstraints: {
            facingMode: "environment" // 鎖死後鏡頭
          }
        },
        false
      );

      scanner.render(
        async (decodedText) => {
          if (scanner) {
            scanner.clear().catch(err => console.error(err));
          }
          await handleFetchStudent({ qr_token: decodedText });
        },
        (error) => {
          // 忽略掃描中的微小異常
        }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(err => console.error("Scanner clear error", err));
      }
    };
  }, [step, activeTab]);

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchRedeemRequests();
    }
  }, [activeTab]);

  const fetchRedeemRequests = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/redeem-requests');
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setRedeemRequests(data.requests);
    }
  };

  const handleFetchStudent = async (payload: { qr_token?: string; username?: string }) => {
    setLoading(true);
    setMessage({ text: '', type: '' });

    const res = await fetch('/api/admin/student-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setStudent(data.student);
      setStep('student_confirm');
    } else {
      setMessage({ text: data.error || '找不到該社員', type: 'error' });
    }
  };

  const handlePointsActionSubmit = async () => {
    setLoading(true);
    setMessage({ text: '', type: '' });

    const finalAmount = pointsAction === 'add' ? amount : -amount;

    const res = await fetch('/api/admin/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: student.id,
        amount: finalAmount,
        reason: reason,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setMessage({
        text: `操作成功！社員 ${data.memberName} 的新餘額為: ${data.newPoints} 點`,
        type: 'success',
      });
      setStudent(null);
      setManualUsername('');
      setStep('scan_or_search');
    } else {
      setMessage({ text: data.error || '交易更新失敗', type: 'error' });
    }
  };

  const handleRedeemAudit = async (requestId: number, action: 'approve' | 'reject') => {
    setLoading(true);
    const res = await fetch('/api/admin/redeem-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId, action }),
    });
    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setMessage({ text: data.message || '操作成功', type: 'success' });
      fetchRedeemRequests();
    } else {
      setMessage({ text: data.error || '操作失敗', type: 'error' });
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  return (
    <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '24px 16px', boxSizing: 'border-box' }}>
      <div className="content-wrapper" style={{ maxWidth: '500px' }}>
        
        {/* 標題欄 */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #CBD5E1', paddingBottom: '16px' }}>
          <div style={{ flexGrow: 1 }}>
            <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#1E293B' }}>
              Hello! {adminName}
            </span>
          </div>
          <button onClick={handleLogout} className="custom-btn-logout">
            登出
          </button>
        </header>

        {/* 訊息提示 */}
        {message.text && (
          <div style={{ padding: '16px', borderRadius: '16px', border: '1px solid', marginBottom: '24px', textAlign: 'center', fontSize: '14px', backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEF2F2', borderColor: message.type === 'success' ? '#10B981' : '#F87171', color: message.type === 'success' ? '#047857' : '#B91C1C' }}>
            {message.text}
          </div>
        )}

        {/* 三分頁導覽 */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button 
            onClick={() => { setActiveTab('scan'); setStep('scan_or_search'); setMessage({ text: '', type: '' }); }} 
            className={activeTab === 'scan' ? 'custom-btn-primary' : 'custom-btn-secondary'} 
            style={{ flex: 1, padding: '10px 4px', fontSize: '13px' }}
          >
            掃描條碼
          </button>
          <button 
            onClick={() => { setActiveTab('manual'); setStep('scan_or_search'); setMessage({ text: '', type: '' }); }} 
            className={activeTab === 'manual' ? 'custom-btn-primary' : 'custom-btn-secondary'} 
            style={{ flex: 1, padding: '10px 4px', fontSize: '13px' }}
          >
            輸入帳號
          </button>
          <button 
            onClick={() => { setActiveTab('requests'); setMessage({ text: '', type: '' }); }} 
            className={activeTab === 'requests' ? 'custom-btn-primary' : 'custom-btn-secondary'} 
            style={{ flex: 1, padding: '10px 4px', fontSize: '13px' }}
          >
            審核申請
          </button>
        </div>

        {/* 頁籤一與頁籤二的流程 */}
        {activeTab !== 'requests' && (
          <div>
            {step === 'scan_or_search' && (
              <div>
                {/* 💡 掃描條碼區塊：始終保留在 DOM 中，但用 display 控制隱現，徹底根除 html5-qrcode 殘留與飄移 Bug */}
                <div 
                  className="custom-card" 
                  style={{ 
                    maxWidth: '100%', 
                    textAlign: 'center', 
                    display: activeTab === 'scan' ? 'block' : 'none',
                    marginTop: '0px',
                    marginBottom: '24px'
                  }}
                >
                  <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>請允許相機權限，將社員 QR Code 放置於鏡頭前</p>
                  <div id="reader" style={{ borderRadius: '16px', overflow: 'hidden', border: '2px solid #CBD5E1' }}></div>
                </div>

                {/* 💡 手動輸入帳號區塊：始終保留在 DOM 中，但用 display 控制隱現。與相機模組絕對乾淨切割！ */}
                <div 
                  className="custom-card" 
                  style={{ 
                    maxWidth: '100%', 
                    display: activeTab === 'manual' ? 'block' : 'none',
                    marginTop: '0px',
                    marginBottom: '24px'
                  }}
                >
                  <h3 className="custom-h2" style={{ fontSize: '18px', textAlign: 'center' }}>手動查詢社員</h3>
                  <div>
                    <label className="custom-field-label">社員登入帳號 (帳號)</label>
                    <input type="text" placeholder="例如 123" value={manualUsername} onChange={e => setManualUsername(e.target.value)} className="custom-input" />
                    <button onClick={() => handleFetchStudent({ username: manualUsername })} disabled={loading || !manualUsername} className="custom-btn-primary" style={{ width: '100%' }}>
                      {loading ? '查詢中...' : '查詢社員資料'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 步驟 2：確認社員資訊 */}
            {step === 'student_confirm' && student && (
              <div className="custom-card" style={{ maxWidth: '100%' }}>
                <h3 className="custom-h2" style={{ fontSize: '20px', textAlign: 'center', marginBottom: '24px' }}>確認社員資訊</h3>
                
                <div style={{ backgroundColor: '#FAF3E8', padding: '16px', borderRadius: '16px', border: '1px solid #CBD5E1', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '13px', color: '#64748B' }}>姓名</span>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1E293B', marginTop: '2px' }}>{student.name}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '13px', color: '#64748B' }}>登入帳號 (帳號)</span>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1E293B', marginTop: '2px' }}>{student.username}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '13px', color: '#64748B' }}>目前餘額</span>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0097B2', marginTop: '2px' }}>{student.points} 點</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <button 
                    onClick={() => { setStudent(null); setStep('scan_or_search'); }} 
                    className="custom-btn-secondary" 
                    style={{ flex: 1 }}
                  >
                    取消
                  </button>
                  <button 
                    onClick={() => setStep('points_adjust')} 
                    className="custom-btn-primary" 
                    style={{ flex: 1 }}
                  >
                    確認
                  </button>
                </div>
              </div>
            )}

            {/* 步驟 3：設定加扣點與提交 */}
            {step === 'points_adjust' && student && (
              <div className="custom-card" style={{ maxWidth: '100%' }}>
                <h3 className="custom-h2" style={{ fontSize: '20px', textAlign: 'center', marginBottom: '4px' }}>設定點數變更</h3>
                <p className="custom-p" style={{ fontSize: '14px', marginBottom: '24px' }}>
                  對象: {student.name} (目前 {student.points} 點)
                </p>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                  <button 
                    onClick={() => setPointsAction('add')} 
                    className={pointsAction === 'add' ? 'custom-btn-primary' : 'custom-btn-secondary'} 
                    style={{ flex: 1, padding: '10px' }}
                  >
                    加點
                  </button>
                  <button 
                    onClick={() => setPointsAction('deduct')} 
                    className={pointsAction === 'deduct' ? 'custom-btn-primary' : 'custom-btn-secondary'} 
                    style={{ flex: 1, padding: '10px' }}
                  >
                    扣點
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>
                    <label className="custom-field-label">變更點數值 (正數)</label>
                    <input type="number" min="1" value={amount} onChange={e => setAmount(Math.max(1, Number(e.target.value)))} className="custom-input" />
                  </div>
                  <div>
                    <label className="custom-field-label">變更事由</label>
                    <input type="text" value={reason} onChange={e => setReason(e.target.value)} className="custom-input" />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                  <button 
                    onClick={() => setStep('student_confirm')} 
                    className="custom-btn-secondary" 
                    style={{ flex: 1 }}
                  >
                    上一步
                  </button>
                  <button 
                    onClick={handlePointsActionSubmit} 
                    disabled={loading}
                    className="custom-btn-primary" 
                    style={{ flex: 1 }}
                  >
                    {loading ? '提交中...' : '確認提交'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 頁籤三：審核學生線上兌換申請 */}
        {activeTab === 'requests' && (
          <div>
            <h2 className="custom-h2" style={{ paddingLeft: '8px' }}>待審核兌換要求</h2>
            {loading && <p style={{ textAlign: 'center', color: '#64748B' }}>資料讀取中...</p>}
            
            {!loading && redeemRequests.length === 0 ? (
              <div className="custom-card" style={{ maxWidth: '100%', textAlign: 'center' }}>
                <p style={{ color: '#64748B', margin: 0 }}>目前沒有待處理的兌換要求</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {redeemRequests.map((req) => (
                  <div key={req.id} className="custom-card" style={{ maxWidth: '100%', padding: '24px' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '12px', color: '#0097B2', fontWeight: 'bold' }}>申請社員</span>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1E293B', marginTop: '2px' }}>
                        {req.student_name} ({req.student_username})
                      </div>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>申請獎品</span>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1E293B', marginTop: '2px' }}>
                        {req.reward_title}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#FAF3E8', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '13px' }}>
                      <div>所需點數: <strong>{req.points_required} 點</strong></div>
                      <div>目前餘額: <strong>{req.student_points} 點</strong></div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                      <button
                        onClick={() => handleRedeemAudit(req.id, 'reject')}
                        disabled={loading}
                        className="custom-btn-secondary"
                        style={{ flex: 1, padding: '10px' }}
                      >
                        拒絕
                      </button>
                      <button
                        onClick={() => handleRedeemAudit(req.id, 'approve')}
                        disabled={loading || req.student_points < req.points_required}
                        className="custom-btn-primary"
                        style={{ 
                          flex: 1, 
                          padding: '10px',
                          backgroundColor: req.student_points >= req.points_required ? '#0097B2' : '#CBD5E1',
                          cursor: req.student_points >= req.points_required ? 'pointer' : 'not-allowed',
                          boxShadow: 'none'
                        }}
                      >
                        核准扣點
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
