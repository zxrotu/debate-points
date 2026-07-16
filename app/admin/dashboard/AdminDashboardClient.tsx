'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QRCodeSVG } from 'qrcode.react';

interface AdminDashboardClientProps {
  adminName: string;
  initialRewards: any[];
}

export default function AdminDashboardClient({ adminName, initialRewards }: AdminDashboardClientProps) {
  const router = useRouter();
  
  // 頁籤切換: 'scan' / 'manual' / 'students' / 'add_reward' / 'group_add'
  const [activeTab, setActiveTab] = useState<'scan' | 'manual' | 'students' | 'add_reward' | 'group_add'>('scan');
  const [step, setStep] = useState<'scan_or_search' | 'student_confirm' | 'points_adjust'>('scan_or_search');
  const [student, setStudent] = useState<any>(null);
  
  const [adjustMode, setAdjustMode] = useState<'general' | 'redeem'>('general');
  const [pointsAction, setPointsAction] = useState<'add' | 'deduct'>('add');
  const [amount, setAmount] = useState<number>(5);
  const [reason, setReason] = useState('參與社課加點');
  
  const [rewardsList, setRewardsList] = useState<any[]>(initialRewards);
  const [selectedRewardId, setSelectedRewardId] = useState<number>(initialRewards[0]?.id || 0);
  const [redeemQuantity, setRedeemQuantity] = useState<number>(1);

  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [newRewardTitle, setNewRewardTitle] = useState('');
  const [newRewardPoints, setNewRewardPoints] = useState<number>(20);
  const [newRewardDesc, setNewRewardDesc] = useState('');

  // 💡 掃碼集體加點專用狀態
  const [groupTitle, setGroupTitle] = useState('社課出席加點');
  const [groupPoints, setGroupPoints] = useState<number>(5);
  const [groupDuration, setGroupDuration] = useState<number>(5); // 預設 5 分鐘
  const [claimId, setClaimId] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [countdownText, setCountdownText] = useState('');

  const [manualUsername, setManualUsername] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  // 初始化個人掃描相機
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (step === 'scan_or_search' && activeTab === 'scan') {
      scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: { width: 250, height: 250 }, supportedScanTypes: [0], videoConstraints: { facingMode: "environment" } }, false);
      scanner.render(async (text) => {
        if (scanner) scanner.clear().catch(err => console.error(err));
        await handleFetchStudent({ qr_token: text });
      }, () => {});
    }
    return () => {
      if (scanner) scanner.clear().catch(err => console.error("Scanner clear error", err));
    };
  }, [step, activeTab]);

  useEffect(() => {
    if (activeTab === 'students') {
      fetchStudents();
    }
  }, [activeTab]);

  // 💡 集體掃碼倒數計時計
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setCountdownText('此加點二維碼已過期失效');
        setExpiresAt(null);
        setClaimId('');
        clearInterval(interval);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setCountdownText(`距離二維碼失效還有 ${mins} 分 ${secs} 秒`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  useEffect(() => {
    if (adjustMode === 'redeem' && selectedRewardId) {
      const reward = rewardsList.find(r => r.id === selectedRewardId);
      if (reward) {
        setPointsAction('deduct');
        setAmount(reward.points_required * redeemQuantity);
        setReason(`兌換禮品-${reward.title}-${redeemQuantity}個`);
      }
    }
  }, [adjustMode, selectedRewardId, redeemQuantity, rewardsList]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/students');
      const data = await res.json();
      if (res.ok) setAllStudents(data.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
      setAdjustMode('general');
      setPointsAction('add');
      setAmount(5);
      setReason('參與社課加點');
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
      body: JSON.stringify({ student_id: student.id, username: student.username, qr_token: student.qr_token, amount: finalAmount, reason }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setMessage({ text: `操作成功！社員 ${data.memberName} 的新餘額為: ${data.newPoints} 點`, type: 'success' });
      setStudent(null);
      setManualUsername('');
      setStep('scan_or_search');
    } else {
      setMessage({ text: data.error || '交易更新失敗', type: 'error' });
    }
  };

  // 💡 發起掃碼集體加點活動
  const handleCreateGroupClaim = async () => {
    setLoading(true);
    setMessage({ text: '', type: '' });

    const res = await fetch('/api/admin/create-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: groupTitle,
        points: groupPoints,
        duration_minutes: groupDuration
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setClaimId(data.claim.id);
      setExpiresAt(data.claim.expires_at);
      setCountdownText(`距離二維碼失效還有 ${groupDuration} 分 0 秒`);
    } else {
      setMessage({ text: data.error || '創建活動失敗', type: 'error' });
    }
  };

  const handleAddRewardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });
    const res = await fetch('/api/admin/rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newRewardTitle, points_required: newRewardPoints, description: newRewardDesc }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setMessage({ text: `成功新增禮品: ${newRewardTitle}`, type: 'success' });
      setRewardsList((prev) => [...prev, data.reward].sort((a, b) => a.points_required - b.points_required));
      if (!selectedRewardId) setSelectedRewardId(data.reward.id);
      setNewRewardTitle('');
      setNewRewardPoints(20);
      setNewRewardDesc('');
    } else {
      setMessage({ text: data.error || '新增禮品失敗', type: 'error' });
    }
  };

  const handleDeleteReward = async (rewardId: number) => {
    if (!confirm('您確定要刪除這項禮品嗎？此操作無法還原。')) return;
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await fetch('/api/admin/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: rewardId }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: data.message || '已成功刪除該禮品', type: 'success' });
        setRewardsList((prev) => prev.filter(r => r.id !== rewardId));
        if (selectedRewardId === rewardId) {
          setSelectedRewardId(rewardsList.find(r => r.id !== rewardId)?.id || 0);
        }
      } else {
        setMessage({ text: data.error || '刪除失敗', type: 'error' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const filteredStudents = allStudents.filter(s => s.name.includes(searchKeyword) || s.username.includes(searchKeyword));

  return (
    <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '24px 16px', boxSizing: 'border-box' }}>
      <div className="content-wrapper" style={{ maxWidth: '500px' }}>
        
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #CBD5E1', paddingBottom: '16px' }}>
          <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#1E293B' }}>Hello! {adminName}</span>
          <button onClick={handleLogout} className="custom-btn-logout">登出</button>
        </header>

        {message.text && (
          <div style={{ padding: '16px', borderRadius: '16px', border: '1px solid', marginBottom: '24px', textAlign: 'center', fontSize: '14px', backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEF2F2', borderColor: message.type === 'success' ? '#10B981' : '#F87171', color: message.type === 'success' ? '#047857' : '#B91C1C' }}>
            {message.text}
          </div>
        )}

        {/* 💡 五頁籤整齊導覽：完全一行並排 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
          <button onClick={() => { setActiveTab('scan'); setStep('scan_or_search'); setMessage({ text: '', type: '' }); }} className={activeTab === 'scan' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: '1 1 30%', padding: '10px 2px', fontSize: '13px' }}>掃描條碼</button>
          <button onClick={() => { setActiveTab('manual'); setStep('scan_or_search'); setMessage({ text: '', type: '' }); }} className={activeTab === 'manual' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: '1 1 30%', padding: '10px 2px', fontSize: '13px' }}>輸入帳號</button>
          <button onClick={() => { setActiveTab('students'); setMessage({ text: '', type: '' }); }} className={activeTab === 'students' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: '1 1 30%', padding: '10px 2px', fontSize: '13px' }}>學員名單</button>
          <button onClick={() => { setActiveTab('add_reward'); setMessage({ text: '', type: '' }); }} className={activeTab === 'add_reward' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: '1 1 45%', padding: '10px 4px', fontSize: '13px' }}>新增禮品</button>
          <button onClick={() => { setActiveTab('group_add'); setMessage({ text: '', type: '' }); }} className={activeTab === 'group_add' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: '1 1 45%', padding: '10px 4px', fontSize: '13px' }}>掃碼加點</button>
        </div>

        {activeTab !== 'students' && activeTab !== 'add_reward' && activeTab !== 'group_add' && (
          <div>
            {step === 'scan_or_search' && (
              <div>
                <div className="custom-card" style={{ maxWidth: '100%', textAlign: 'center', display: activeTab === 'scan' ? 'block' : 'none', marginTop: '0px', marginBottom: '24px' }}>
                  <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>請允許相機權限，將社員 QR Code 放置於鏡頭前</p>
                  <div id="reader" style={{ borderRadius: '16px', overflow: 'hidden', border: '2px solid #CBD5E1' }}></div>
                </div>

                <div className="custom-card" style={{ maxWidth: '100%', display: activeTab === 'manual' ? 'block' : 'none', marginTop: '0px', marginBottom: '24px' }}>
                  <h3 className="custom-h2" style={{ fontSize: '18px', textAlign: 'center' }}>手動查詢社員</h3>
                  <div>
                    <label className="custom-field-label">社員登入帳號 (帳號)</label>
                    <input type="text" placeholder="例如 123" value={manualUsername} onChange={e => setManualUsername(e.target.value)} className="custom-input" />
                    <button onClick={() => handleFetchStudent({ username: manualUsername })} disabled={loading || !manualUsername} className="custom-btn-primary" style={{ width: '100%' }}>{loading ? '查詢中...' : '查詢社員資料'}</button>
                  </div>
                </div>
              </div>
            )}

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
                  <button onClick={() => { setStudent(null); setStep('scan_or_search'); }} className="custom-btn-secondary" style={{ flex: 1 }}>取消</button>
                  <button onClick={() => setStep('points_adjust')} className="custom-btn-primary" style={{ flex: 1 }}>確認</button>
                </div>
              </div>
            )}

            {step === 'points_adjust' && student && (
              <div className="custom-card" style={{ maxWidth: '100%' }}>
                <h3 className="custom-h2" style={{ fontSize: '20px', textAlign: 'center', marginBottom: '4px' }}>設定點數變更</h3>
                <p className="custom-p" style={{ fontSize: '14px', marginBottom: '20px' }}>對象: {student.name} (目前 {student.points} 點)</p>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                  <button onClick={() => { setAdjustMode('general'); setPointsAction('add'); setAmount(5); setReason('參與社課加點'); }} className={adjustMode === 'general' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}>一般加扣點</button>
                  <button onClick={() => { setAdjustMode('redeem'); if (rewardsList.length > 0) { setSelectedRewardId(rewardsList[0].id); } }} className={adjustMode === 'redeem' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}>兌換禮品</button>
                </div>

                {adjustMode === 'general' ? (
                  <div>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                      <button onClick={() => setPointsAction('add')} className={pointsAction === 'add' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '10px' }}>加點</button>
                      <button onClick={() => setPointsAction('deduct')} className={pointsAction === 'deduct' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '10px' }}>扣點</button>
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
                  </div>
                ) : (
                  <div>
                    {rewardsList.length === 0 ? (
                      <p style={{ textAlign: 'center', color: '#64748B', fontSize: '14px', marginBottom: '24px' }}>目前資料庫內尚無禮品，請先去「新增禮品」頁籤建立！</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>
                          <label className="custom-field-label">選擇兌換禮品</label>
                          <select value={selectedRewardId} onChange={e => setSelectedRewardId(Number(e.target.value))} className="custom-input">
                            {rewardsList.map(r => (
                              <option key={r.id} value={r.id}>{r.title} (扣除 {r.points_required} 點)</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="custom-field-label">兌換數量</label>
                          <input type="number" min="1" value={redeemQuantity} onChange={e => setRedeemQuantity(Math.max(1, Number(e.target.value)))} className="custom-input" />
                        </div>
                        <div style={{ backgroundColor: '#FAF3E8', padding: '12px', borderRadius: '12px', border: '1px solid #CBD5E1', marginBottom: '24px', fontSize: '14px' }}>
                          <div style={{ marginBottom: '6px' }}>自動變更：<strong style={{ color: '#EF4444' }}>-{amount} 點</strong></div>
                          <div>自動事由：<strong>{reason}</strong></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                  <button onClick={() => setStep('student_confirm')} className="custom-btn-secondary" style={{ flex: 1 }}>上一步</button>
                  <button onClick={handlePointsActionSubmit} disabled={loading || (adjustMode === 'redeem' && rewardsList.length === 0)} className="custom-btn-primary" style={{ flex: 1 }}>{loading ? '提交中...' : '確認提交'}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'students' && (
          <div>
            <h2 className="custom-h2" style={{ paddingLeft: '8px' }}>社員點數名冊</h2>
            <div style={{ marginBottom: '16px' }}>
              <input type="text" placeholder="搜尋姓名或帳號..." value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} className="custom-input" style={{ marginBottom: '0px' }} />
            </div>
            {loading ? (
              <p style={{ textAlign: 'center', color: '#64748B' }}>名單加載中...</p>
            ) : filteredStudents.length === 0 ? (
              <div className="custom-card" style={{ maxWidth: '100%', textAlign: 'center' }}>
                <p style={{ color: '#64748B', margin: 0 }}>找不到符合條件的社員</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredStudents.map((s) => (
                  <div key={s.id} className="custom-card" style={{ maxWidth: '100%', padding: '16px 20px', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1E293B' }}>{s.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>帳號: {s.username}</div>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#0097B2' }}>{s.points} <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#475569' }}>點</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'add_reward' && (
          <div className="custom-card" style={{ maxWidth: '100%' }}>
            <h3 className="custom-h2" style={{ fontSize: '20px', textAlign: 'center', marginBottom: '24px' }}>新增社團禮品</h3>
            <form onSubmit={handleAddRewardSubmit}>
              <div>
                <label className="custom-field-label">禮品名稱</label>
                <input type="text" required placeholder="例如 辯論社馬克杯" value={newRewardTitle} onChange={e => setNewRewardTitle(e.target.value)} className="custom-input" />
              </div>
              <div>
                <label className="custom-field-label">所需「論點」點數</label>
                <input type="number" min="1" required value={newRewardPoints} onChange={e => setNewRewardPoints(Math.max(1, Number(e.target.value)))} className="custom-input" />
              </div>
              <div>
                <label className="custom-field-label">禮品描述 (選填)</label>
                <input type="text" placeholder="簡短描述這項禮品..." value={newRewardDesc} onChange={e => setNewRewardDesc(e.target.value)} className="custom-input" />
              </div>
              <button type="submit" disabled={loading} className="custom-btn-primary" style={{ width: '100%', marginTop: '8px' }}>{loading ? '新增中...' : '確認新增'}</button>
            </form>
          </div>
        )}

        {/* 💡 頁籤五：集體掃碼加點產生器 UI */}
        {activeTab === 'group_add' && (
          <div>
            {!claimId ? (
              /* 活動設定表單 */
              <div className="custom-card" style={{ maxWidth: '100%' }}>
                <h3 className="custom-h2" style={{ fontSize: '20px', textAlign: 'center', marginBottom: '24px' }}>產生集體出席加點</h3>
                <div>
                  <label className="custom-field-label">加點活動名稱</label>
                  <input type="text" value={groupTitle} onChange={e => setGroupTitle(e.target.value)} className="custom-input" />
                </div>
                <div>
                  <label className="custom-field-label">加點分數 (正數)</label>
                  <input type="number" min="1" value={groupPoints} onChange={e => setGroupPoints(Math.max(1, Number(e.target.value)))} className="custom-input" />
                </div>
                <div>
                  <label className="custom-field-label">限時領取分鐘數</label>
                  <input type="number" min="1" value={groupDuration} onChange={e => setGroupDuration(Math.max(1, Number(e.target.value)))} className="custom-input" />
                </div>
                <button onClick={handleCreateGroupClaim} disabled={loading} className="custom-btn-primary" style={{ width: '100%', marginTop: '8px' }}>
                  {loading ? '生成中...' : '產生集體加點安全碼'}
                </button>
              </div>
            ) : (
              /* 生成大 QR Code 與計時器 */
              <div className="custom-card" style={{ maxWidth: '100%', textAlign: 'center' }}>
                <h3 className="custom-h2" style={{ fontSize: '20px', color: '#1E293B' }}>{groupTitle}</h3>
                <p style={{ fontSize: '15px', color: '#0097B2', fontWeight: 'bold', margin: '4px 0 16px 0' }}>掃描此碼獲得 {groupPoints} 個論點</p>
                
                {/* 倒數計時文字 */}
                <div style={{ fontSize: '14px', color: '#EF4444', fontWeight: 'bold', marginBottom: '20px', backgroundColor: '#FEF2F2', padding: '10px', borderRadius: '12px', border: '1px solid #FCA5A5' }}>
                  {countdownText}
                </div>

                {/* 生成 QR Code (動態抓取當下 Vercel 網址，免除本地/線上分開設定) */}
                <div style={{ display: 'inline-block', backgroundColor: '#FFFFFF', padding: '16px', border: '1px solid #CBD5E1', borderRadius: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.03)', marginBottom: '24px' }}>
                  <QRCodeSVG value={`${window.location.origin}/claim?id=${claimId}`} size={220} />
                </div>
                
                <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.5', marginBottom: '24px', padding: '0 8px' }}>
                  請投影至大螢幕，社員可直接打開「手機自帶相機」掃描此條碼。限每位社員僅限掃描領取一次。
                </p>

                <button 
                  onClick={() => { setClaimId(''); setExpiresAt(null); }} 
                  className="custom-btn-secondary" 
                  style={{ width: '100%' }}
                >
                  關閉 / 結束活動
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
