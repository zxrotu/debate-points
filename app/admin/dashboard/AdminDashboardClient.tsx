'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface AdminDashboardClientProps {
  adminName: string;
  initialRewards: any[];
}

export default function AdminDashboardClient({ adminName, initialRewards }: AdminDashboardClientProps) {
  const router = useRouter();
  
  // 頁籤切換: 'scan' / 'manual' / 'students' / 'add_reward' / 'batch_add'
  const [activeTab, setActiveTab] = useState<'scan' | 'manual' | 'students' | 'add_reward' | 'batch_add'>('scan');
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

  // 批次加點專用狀態
  const [batchAmount, setBatchAmount] = useState<number>(5);
  const [batchReason, setBatchReason] = useState('參與社課加點');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const [manualUsername, setManualUsername] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  // 初始化相機
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

  // 切換到「學員名單」或「批次加點」時，撈取最新學員名冊
  useEffect(() => {
    if (activeTab === 'students' || activeTab === 'batch_add') {
      fetchStudents();
    }
  }, [activeTab]);

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

  // 提交批次加點
  const handleBatchPointsSubmit = async () => {
    if (selectedStudentIds.length === 0) {
      alert('請至少勾選一位學員！');
      return;
    }
    setLoading(true);
    setMessage({ text: '', type: '' });

    const res = await fetch('/api/admin/batch-points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_ids: selectedStudentIds,
        amount: batchAmount,
        reason: batchReason,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setMessage({ text: `批次加點成功！已順利為 ${data.count} 位社員加上 ${batchAmount} 個論點！`, type: 'success' });
      setSelectedStudentIds([]); // 清空勾選
      fetchStudents(); // 重新整理點數名冊
    } else {
      setMessage({ text: data.error || '批次加點失敗', type: 'error' });
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

  // 學生多選切換
  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // 全選 / 取消全選
  const handleToggleSelectAll = () => {
    const currentFilteredIds = filteredStudents.map(s => s.id);
    const allSelected = currentFilteredIds.every(id => selectedStudentIds.includes(id));

    if (allSelected) {
      // 取消勾選目前搜尋到的所有學生
      setSelectedStudentIds((prev) => prev.filter(id => !currentFilteredIds.includes(id)));
    } else {
      // 勾選目前搜尋到的所有學生
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...currentFilteredIds])));
    }
  };

  const filteredStudents = allStudents.filter(s => s.name.includes(searchKeyword) || s.username.includes(searchKeyword));

  return (
    <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '24px 16px', boxSizing: 'border-box' }}>
      <div className="content-wrapper" style={{ maxWidth: '500px' }}>
        
        {/* 標題欄 */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #CBD5E1', paddingBottom: '16px' }}>
          <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#1E293B' }}>Hello! {adminName}</span>
          <button onClick={handleLogout} className="custom-btn-logout">登出</button>
        </header>

        {/* 訊息提示 */}
        {message.text && (
          <div style={{ padding: '16px', borderRadius: '16px', border: '1px solid', marginBottom: '24px', textAlign: 'center', fontSize: '14px', backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEF2F2', borderColor: message.type === 'success' ? '#10B981' : '#F87171', color: message.type === 'success' ? '#047857' : '#B91C1C' }}>
            {message.text}
          </div>
        )}

        {/* 💡 五頁籤精緻自適應導覽：排列整齊美觀 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
          <button onClick={() => { setActiveTab('scan'); setStep('scan_or_search'); setMessage({ text: '', type: '' }); }} className={activeTab === 'scan' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: '1 1 30%', padding: '10px 2px', fontSize: '13px' }}>掃描條碼</button>
          <button onClick={() => { setActiveTab('manual'); setStep('scan_or_search'); setMessage({ text: '', type: '' }); }} className={activeTab === 'manual' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: '1 1 30%', padding: '10px 2px', fontSize: '13px' }}>輸入帳號</button>
          <button onClick={() => { setActiveTab('students'); setMessage({ text: '', type: '' }); }} className={activeTab === 'students' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: '1 1 30%', padding: '10px 2px', fontSize: '13px' }}>學員名單</button>
          <button onClick={() => { setActiveTab('add_reward'); setMessage({ text: '', type: '' }); }} className={activeTab === 'add_reward' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: '1 1 45%', padding: '10px 4px', fontSize: '13px' }}>新增禮品</button>
          <button onClick={() => { setActiveTab('batch_add'); setMessage({ text: '', type: '' }); }} className={activeTab === 'batch_add' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: '1 1 45%', padding: '10px 4px', fontSize: '13px' }}>批次加點</button>
        </div>

        {activeTab !== 'students' && activeTab !== 'add_reward' && activeTab !== 'batch_add' && (
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
          <div>
            <div className="custom-card" style={{ maxWidth: '100%', marginBottom: '24px' }}>
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

            <h2 className="custom-h2" style={{ paddingLeft: '8px', fontSize: '18px', marginTop: '32px' }}>目前禮品清單 (可於手機直接刪除)</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {rewardsList.map((reward) => (
                <div key={reward.id} className="custom-card" style={{ maxWidth: '100%', padding: '16px 20px', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ textAlign: 'left', paddingRight: '8px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1E293B' }}>{reward.title}</div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>所需點數: {reward.points_required} 點</div>
                  </div>
                  <button 
                    onClick={() => handleDeleteReward(reward.id)} 
                    disabled={loading}
                    className="custom-btn-logout"
                    style={{ fontSize: '12px', padding: '4px 12px', color: '#EF4444', borderColor: '#EF4444' }}
                  >
                    刪除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 💡 頁籤五：批次加點 UI */}
        {activeTab === 'batch_add' && (
          <div>
            {/* 加點參數卡片 */}
            <div className="custom-card" style={{ maxWidth: '100%', marginBottom: '24px' }}>
              <h3 className="custom-h2" style={{ fontSize: '20px', textAlign: 'center', marginBottom: '24px' }}>設定批次加點參數</h3>
              <div>
                <label className="custom-field-label">加點分數 (正數)</label>
                <input 
                  type="number" 
                  min="1" 
                  value={batchAmount} 
                  onChange={e => setBatchAmount(Math.max(1, Number(e.target.value)))} 
                  className="custom-input" 
                />
              </div>
              <div>
                <label className="custom-field-label">變更事由</label>
                <input 
                  type="text" 
                  value={batchReason} 
                  onChange={e => setBatchReason(e.target.value)} 
                  className="custom-input" 
                />
              </div>
              <button 
                onClick={handleBatchPointsSubmit} 
                disabled={loading || selectedStudentIds.length === 0}
                className="custom-btn-primary" 
                style={{ width: '100%', marginTop: '8px', backgroundColor: selectedStudentIds.length > 0 ? '#0097B2' : '#CBD5E1', cursor: selectedStudentIds.length > 0 ? 'pointer' : 'not-allowed', boxShadow: 'none' }}
              >
                {loading ? '批次提交中...' : `確認批次加點 (${selectedStudentIds.length} 人)`}
              </button>
            </div>

            {/* 學員多選列表 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 4px' }}>
              <h2 className="custom-h2" style={{ margin: 0, fontSize: '18px' }}>選擇學員名單</h2>
              <button 
                onClick={handleToggleSelectAll} 
                className="custom-btn-logout"
                style={{ fontSize: '12px', padding: '4px 12px' }}
              >
                {filteredStudents.every(id => selectedStudentIds.includes(id.id)) ? '取消全選' : '一鍵全選'}
              </button>
            </div>

            {/* 搜尋過濾 */}
            <div style={{ marginBottom: '16px' }}>
              <input 
                type="text" 
                placeholder="搜尋學員姓名或帳號..." 
                value={searchKeyword} 
                onChange={e => setSearchKeyword(e.target.value)} 
                className="custom-input" 
                style={{ marginBottom: '0px' }}
              />
            </div>

            {loading ? (
              <p style={{ textAlign: 'center', color: '#64748B' }}>學員清單載入中...</p>
            ) : filteredStudents.length === 0 ? (
              <div className="custom-card" style={{ maxWidth: '100%', textAlign: 'center' }}>
                <p style={{ color: '#64748B', margin: 0 }}>找不到符合條件的社員</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredStudents.map((s) => {
                  const isChecked = selectedStudentIds.includes(s.id);
                  return (
                    <div 
                      key={s.id} 
                      onClick={() => handleToggleSelectStudent(s.id)}
                      className="custom-card" 
                      style={{ 
                        maxWidth: '100%', 
                        padding: '16px 20px', 
                        margin: 0, 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: '16px',
                        cursor: 'pointer',
                        border: isChecked ? '2px solid #0097B2' : '2px solid #CBD5E1',
                        backgroundColor: isChecked ? '#F1FAFC' : '#FFFFFF'
                      }}
                    >
                      {/* 自訂高對比大複選框 */}
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => {}} // 點擊卡片本體處理切換
                        style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#0097B2' }}
                      />
                      <div style={{ textAlign: 'left', flexGrow: 1 }}>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1E293B' }}>{s.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>帳號: {s.username} | 目前: {s.points} 點</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
