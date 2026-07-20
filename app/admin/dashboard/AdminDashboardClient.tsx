'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QRCodeSVG } from 'qrcode.react';
import { Telescope, Megaphone, Gift } from 'lucide-react';

interface AdminDashboardClientProps {
  adminName: string;
  initialRewards: any[];
  transactions: any[];
  announcement: string;
  initialRedeemRequests: any[];
}

export default function AdminDashboardClient({ adminName, initialRewards, transactions, announcement, initialRedeemRequests }: AdminDashboardClientProps) {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'scan' | 'manual' | 'students' | 'add_reward' | 'batch_add' | 'group_add'>('scan');
  const [step, setStep] = useState<'scan_or_search' | 'student_confirm' | 'points_adjust'>('scan_or_search');
  const [student, setStudent] = useState<any>(null);
  
  const [showHistory, setShowHistory] = useState(false);
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  
  const [annContent, setAnnContent] = useState(announcement);
  const [editAnnContent, setEditAnnContent] = useState(announcement);

  const [adjustMode, setAdjustMode] = useState<'general' | 'redeem'>('general');
  const [pointsAction, setPointsAction] = useState<'add' | 'deduct'>('add');
  const [amount, setAmount] = useState<number>(5);
  const [reason, setReason] = useState('參與社課加點');
  
  const [rewardsList, setRewardsList] = useState<any[]>(initialRewards);
  const [selectedRewardId, setSelectedRewardId] = useState<number>(initialRewards[0]?.id || 0);
  const [redeemQuantity, setRedeemQuantity] = useState<number>(1);
  const [redeemRequests, setRedeemRequests] = useState<any[]>(initialRedeemRequests);

  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [newRewardTitle, setNewRewardTitle] = useState('');
  const [newRewardPoints, setNewRewardPoints] = useState<number>(20);
  const [newRewardDesc, setNewRewardDesc] = useState('');

  const [batchAmount, setBatchAmount] = useState<number>(5);
  const [batchReason, setBatchReason] = useState('參與社課加點');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const [groupTitle, setGroupTitle] = useState('社課出席加點');
  const [groupPoints, setGroupPoints] = useState<number>(5);
  const [groupDuration, setGroupDuration] = useState<number>(5);
  const [claimId, setClaimId] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [countdownText, setCountdownText] = useState('');

  const [manualUsername, setManualUsername] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (step === 'scan_or_search' && activeTab === 'scan' && !showHistory && !showAnnModal && !showRedeemModal) {
      scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: { width: 250, height: 250 }, supportedScanTypes: [0], videoConstraints: { facingMode: "environment" } }, false);
      scanner.render(async (text) => {
        if (scanner) scanner.clear().catch(err => console.error(err));
        await handleFetchStudent({ qr_token: text });
      }, () => {});
    }
    return () => { if (scanner) scanner.clear().catch(err => console.error(err)); };
  }, [step, activeTab, showHistory, showAnnModal, showRedeemModal]);

  useEffect(() => {
    if (activeTab === 'students' || activeTab === 'batch_add') fetchStudents();
  }, [activeTab]);

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

  const fetchRedeemRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/redeem-requests');
      const data = await res.json();
      if (res.ok) setRedeemRequests(data.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchStudent = async (payload: { qr_token?: string; username?: string }) => {
    setLoading(true); setMessage({ text: '', type: '' });
    const res = await fetch('/api/admin/student-info', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    setLoading(false);
    if (res.ok) { setStudent(data.student); setStep('student_confirm'); setAdjustMode('general'); setPointsAction('add'); setAmount(5); setReason('參與社課加點'); } 
    else setMessage({ text: data.error || '找不到該社員', type: 'error' });
  };

  const handlePointsActionSubmit = async () => {
    setLoading(true); setMessage({ text: '', type: '' });
    const finalAmount = pointsAction === 'add' ? amount : -amount;
    const res = await fetch('/api/admin/points', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id: student.id, username: student.username, qr_token: student.qr_token, amount: finalAmount, reason }) });
    const data = await res.json();
    setLoading(false);
    if (res.ok) { setMessage({ text: `操作成功！新餘額為: ${data.newPoints} 點`, type: 'success' }); setStudent(null); setManualUsername(''); setStep('scan_or_search'); } 
    else setMessage({ text: data.error || '交易更新失敗', type: 'error' });
  };

  const handleBatchPointsSubmit = async () => {
    if (selectedStudentIds.length === 0) return alert('請至少勾選一位社員！');
    setLoading(true); setMessage({ text: '', type: '' });
    const res = await fetch('/api/admin/batch-points', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_ids: selectedStudentIds, amount: batchAmount, reason: batchReason }) });
    const data = await res.json();
    setLoading(false);
    if (res.ok) { setMessage({ text: `一次加點成功！`, type: 'success' }); setSelectedStudentIds([]); fetchStudents(); } 
    else setMessage({ text: data.error || '加點失敗', type: 'error' });
  };

  const handleCreateGroupClaim = async () => {
    setLoading(true); setMessage({ text: '', type: '' });
    const res = await fetch('/api/admin/create-claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: groupTitle, points: groupPoints, duration_minutes: groupDuration }) });
    const data = await res.json();
    setLoading(false);
    if (res.ok) { setClaimId(data.claim.id); setExpiresAt(data.claim.expires_at); setCountdownText(`距離失效還有 ${groupDuration} 分鐘`); } 
    else setMessage({ text: data.error || '創建活動失敗', type: 'error' });
  };

  const handleAddRewardSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMessage({ text: '', type: '' });
    const res = await fetch('/api/admin/rewards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newRewardTitle, points_required: newRewardPoints, description: newRewardDesc }) });
    const data = await res.json();
    setLoading(false);
    if (res.ok) { setMessage({ text: `成功新增獎品`, type: 'success' }); setRewardsList(prev => [...prev, data.reward].sort((a,b)=>a.points_required-b.points_required)); setNewRewardTitle(''); setNewRewardDesc(''); } 
    else setMessage({ text: data.error || '新增失敗', type: 'error' });
  };

  const handleDeleteReward = async (rewardId: number) => {
    if (!confirm('您確定要刪除這項獎品嗎？')) return;
    setLoading(true); setMessage({ text: '', type: '' });
    const res = await fetch('/api/admin/rewards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id: rewardId }) });
    const data = await res.json();
    setLoading(false);
    if (res.ok) { setMessage({ text: '已成功刪除', type: 'success' }); setRewardsList(prev => prev.filter(r => r.id !== rewardId)); } 
    else setMessage({ text: data.error || '刪除失敗', type: 'error' });
  };

  const handleRedeemAudit = async (requestId: number, action: 'approve' | 'reject') => {
    setLoading(true); setMessage({ text: '', type: '' });
    const res = await fetch('/api/admin/redeem-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request_id: requestId, action }) });
    const data = await res.json();
    setLoading(false);
    if (res.ok) { setMessage({ text: data.message || '操作成功', type: 'success' }); fetchRedeemRequests(); } 
    else setMessage({ text: data.error || '操作失敗', type: 'error' });
  };

  const handleUpdateAnnouncement = async () => {
    if (editAnnContent.trim() === '') return alert('請輸入內容！');
    setLoading(true); setMessage({ text: '', type: '' });
    const res = await fetch('/api/admin/announcement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: editAnnContent }) });
    const data = await res.json();
    setLoading(false);
    if (res.ok) { setMessage({ text: '公告更新成功！', type: 'success' }); setAnnContent(editAnnContent); setShowAnnModal(false); } 
    else setMessage({ text: data.error || '更新失敗', type: 'error' });
  };

  const handleLogout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/'); };

  const handleToggleSelectStudent = (id: string) => setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const handleToggleSelectAll = () => {
    const currentFilteredIds = filteredStudents.map(s => s.id);
    const allSelected = currentFilteredIds.every(id => selectedStudentIds.includes(id));
    if (allSelected) setSelectedStudentIds(prev => prev.filter(id => !currentFilteredIds.includes(id)));
    else setSelectedStudentIds(prev => Array.from(new Set([...prev, ...currentFilteredIds])));
  };

  const formatDate = (dateStr: string) => dateStr.substring(0, 16).replace('T', ' ');
  const filteredStudents = allStudents.filter(s => s.name.includes(searchKeyword) || s.username.includes(searchKeyword));

  return (
    <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '16px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="content-wrapper" style={{ width: '100%', maxWidth: '500px' }}>
        
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #CBD5E1', paddingBottom: '16px' }}>
          <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#1E293B' }}>Hello! {adminName}</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => { setShowRedeemModal(!showRedeemModal); setShowHistory(false); setShowAnnModal(false); }} className="custom-btn-circle"><Gift size={16} /></button>
            <button onClick={() => { setShowHistory(!showHistory); setShowAnnModal(false); setShowRedeemModal(false); }} className="custom-btn-circle"><Telescope size={16} /></button>
            <button onClick={() => { setShowAnnModal(!showAnnModal); setShowHistory(false); setShowRedeemModal(false); }} className="custom-btn-circle"><Megaphone size={16} /></button>
            <button onClick={handleLogout} className="custom-btn-logout">登出</button>
          </div>
        </header>

        {annContent && annContent.trim() !== '' && !showHistory && !showRedeemModal && (
          <div className="custom-marquee-container"><div className="custom-marquee-icon"><Megaphone size={16} /></div><div className="custom-marquee-text-wrapper"><span className="custom-marquee-text">{annContent}</span></div></div>
        )}

        {message.text && (
          <div style={{ padding: '16px', borderRadius: '16px', border: '1px solid', marginBottom: '24px', textAlign: 'center', fontSize: '14px', backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEF2F2', borderColor: message.type === 'success' ? '#10B981' : '#F87171', color: message.type === 'success' ? '#047857' : '#B91C1C' }}>
            {message.text}
          </div>
        )}

        {showAnnModal && (
          <div className="custom-card" style={{ marginBottom: '24px' }}>
            <h3 className="custom-h2">發布公告</h3>
            <input type="text" value={editAnnContent} onChange={e => setEditAnnContent(e.target.value)} className="custom-input" />
            <div style={{ display: 'flex', gap: '16px' }}>
              <button onClick={() => setShowAnnModal(false)} className="custom-btn-secondary" style={{ flex: 1 }}>取消</button>
              <button onClick={handleUpdateAnnouncement} disabled={loading} className="custom-btn-primary" style={{ flex: 1 }}>確認發布</button>
            </div>
          </div>
        )}

        {showRedeemModal ? (
          <div className="custom-card" style={{ marginBottom: '24px' }}>
            <h3 className="custom-h2">獎品兌換申請</h3>
            {redeemRequests.length === 0 ? <p style={{ textAlign: 'center', color: '#64748B' }}>目前沒有待處理的申請</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '350px', overflowY: 'auto', marginBottom: '24px' }}>
                {redeemRequests.map(req => (
                  <div key={req.id} style={{ padding: '16px 0', borderBottom: '1px solid #E2E8F0' }}>
                    <div style={{ fontWeight: 'bold' }}>{req.student_name} ({req.student_username})</div>
                    <div style={{ color: '#475569', fontSize: '14px', marginBottom: '8px' }}>申請兌換: {req.reward_title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#FAF3E8', padding: '10px', borderRadius: '8px', fontSize: '12px', marginBottom: '12px' }}>
                      <span>所需: {req.points_required}點</span><span>餘額: {req.student_points}點</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleRedeemAudit(req.id, 'reject')} disabled={loading} className="custom-btn-secondary" style={{ flex: 1, padding: '6px' }}>拒絕</button>
                      <button onClick={() => handleRedeemAudit(req.id, 'approve')} disabled={loading || req.student_points < req.points_required} className="custom-btn-primary" style={{ flex: 1, padding: '6px' }}>同意兌換</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowRedeemModal(false)} className="custom-btn-primary" style={{ width: '100%' }}>返回首頁</button>
          </div>
        ) : showHistory ? (
          <div className="custom-card" style={{ marginBottom: '24px' }}>
            <h3 className="custom-h2">論點異動查詢</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', marginBottom: '24px' }}>
              {transactions.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 4px', borderBottom: '1px solid #E2E8F0' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{t.student_name}</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>{t.reason}</div>
                    <div style={{ fontSize: '10px', color: '#64748B' }}>{formatDate(t.created_at)}</div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: t.amount > 0 ? '#10B981' : '#EF4444' }}>{t.amount > 0 ? `+${t.amount}` : t.amount}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowHistory(false)} className="custom-btn-primary" style={{ width: '100%' }}>返回首頁</button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button onClick={() => { setActiveTab('scan'); setStep('scan_or_search'); }} className={activeTab === 'scan' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '10px 2px', fontSize: '12px' }}>掃描條碼</button>
              <button onClick={() => { setActiveTab('manual'); setStep('scan_or_search'); }} className={activeTab === 'manual' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '10px 2px', fontSize: '12px' }}>輸入帳號</button>
              <button onClick={() => { setActiveTab('students'); }} className={activeTab === 'students' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '10px 2px', fontSize: '12px' }}>帳號一覽</button>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              <button onClick={() => { setActiveTab('add_reward'); }} className={activeTab === 'add_reward' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '10px 2px', fontSize: '12px' }}>新增獎品</button>
              <button onClick={() => { setActiveTab('batch_add'); }} className={activeTab === 'batch_add' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '10px 2px', fontSize: '12px' }}>勾選加點</button>
              <button onClick={() => { setActiveTab('group_add'); }} className={activeTab === 'group_add' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '10px 2px', fontSize: '12px' }}>即時加點</button>
            </div>

            {activeTab !== 'students' && activeTab !== 'add_reward' && activeTab !== 'batch_add' && activeTab !== 'group_add' && (
              <div>
                {step === 'scan_or_search' && (
                  <div>
                    <div className="custom-card" style={{ display: activeTab === 'scan' ? 'block' : 'none', marginBottom: '24px' }}>
                      <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>請對準社員 QR Code</p>
                      <div id="reader" style={{ borderRadius: '16px', overflow: 'hidden' }}></div>
                    </div>
                    <div className="custom-card" style={{ display: activeTab === 'manual' ? 'block' : 'none', marginBottom: '24px' }}>
                      <h3 className="custom-h2">手動查詢社員</h3>
                      <input type="text" placeholder="例如 123" value={manualUsername} onChange={e => setManualUsername(e.target.value)} className="custom-input" />
                      <button onClick={() => handleFetchStudent({ username: manualUsername })} disabled={loading || !manualUsername} className="custom-btn-primary" style={{ width: '100%' }}>查詢社員</button>
                    </div>
                  </div>
                )}
                {step === 'student_confirm' && student && (
                  <div className="custom-card" style={{ marginBottom: '24px' }}>
                    <h3 className="custom-h2">確認社員資訊</h3>
                    <div style={{ backgroundColor: '#FAF3E8', padding: '16px', borderRadius: '16px', marginBottom: '24px' }}>
                      <div>姓名: {student.name}</div>
                      <div>帳號: {student.username}</div>
                      <div style={{ color: '#0097B2', fontWeight: 'bold' }}>餘額: {student.points} 點</div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <button onClick={() => { setStudent(null); setStep('scan_or_search'); }} className="custom-btn-secondary" style={{ flex: 1 }}>取消</button>
                      <button onClick={() => setStep('points_adjust')} className="custom-btn-primary" style={{ flex: 1 }}>確認</button>
                    </div>
                  </div>
                )}
                {step === 'points_adjust' && student && (
                  <div className="custom-card" style={{ marginBottom: '24px' }}>
                    <h3 className="custom-h2">點數變更 ({student.name})</h3>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                      <button onClick={() => { setAdjustMode('general'); setPointsAction('add'); }} className={adjustMode === 'general' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '8px' }}>一般加扣</button>
                      <button onClick={() => { setAdjustMode('redeem'); if(rewardsList[0]) setSelectedRewardId(rewardsList[0].id); }} className={adjustMode === 'redeem' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '8px' }}>兌換獎品</button>
                    </div>
                    {adjustMode === 'general' ? (
                      <div>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                          <button onClick={() => setPointsAction('add')} className={pointsAction === 'add' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1 }}>加點</button>
                          <button onClick={() => setPointsAction('deduct')} className={pointsAction === 'deduct' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1 }}>扣點</button>
                        </div>
                        <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="custom-input" />
                        <input type="text" value={reason} onChange={e => setReason(e.target.value)} className="custom-input" />
                      </div>
                    ) : (
                      <div>
                        <select value={selectedRewardId} onChange={e => setSelectedRewardId(Number(e.target.value))} className="custom-input">
                          {rewardsList.map(r => (<option key={r.id} value={r.id}>{r.title}</option>))}
                        </select>
                        <input type="number" min="1" value={redeemQuantity} onChange={e => setRedeemQuantity(Number(e.target.value))} className="custom-input" />
                        <div style={{ marginBottom: '16px' }}>自動變更: -{amount}點</div>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <button onClick={() => setStep('student_confirm')} className="custom-btn-secondary" style={{ flex: 1 }}>上一步</button>
                      <button onClick={handlePointsActionSubmit} disabled={loading} className="custom-btn-primary" style={{ flex: 1 }}>確認提交</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'students' && (
              <div>
                <h2 className="custom-h2" style={{ paddingLeft: '8px' }}>帳號一覽</h2>
                <input type="text" placeholder="搜尋..." value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} className="custom-input" />
                <div className="custom-card" style={{ padding: '24px' }}>
                  {filteredStudents.map((s, index) => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: index === filteredStudents.length - 1 ? 'none' : '1px solid #E2E8F0' }}>
                      <div><div style={{ fontWeight: 'bold' }}>{s.name}</div><div style={{ fontSize: '12px', color: '#64748B' }}>{s.username}</div></div>
                      <div style={{ fontWeight: 'bold', color: '#0097B2' }}>{s.points} 點</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'add_reward' && (
              <div>
                <div className="custom-card" style={{ marginBottom: '24px' }}>
                  <h3 className="custom-h2">新增獎品</h3>
                  <form onSubmit={handleAddRewardSubmit}>
                    <input type="text" required placeholder="名稱" value={newRewardTitle} onChange={e => setNewRewardTitle(e.target.value)} className="custom-input" />
                    <input type="number" required placeholder="點數" value={newRewardPoints} onChange={e => setNewRewardPoints(Number(e.target.value))} className="custom-input" />
                    <input type="text" placeholder="描述" value={newRewardDesc} onChange={e => setNewRewardDesc(e.target.value)} className="custom-input" />
                    <button type="submit" disabled={loading} className="custom-btn-primary">確認新增</button>
                  </form>
                </div>
                <h2 className="custom-h2">獎品清單</h2>
                <div className="custom-card" style={{ padding: '24px' }}>
                  {rewardsList.map((reward, index) => (
                    <div key={reward.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: index === rewardsList.length - 1 ? 'none' : '1px solid #E2E8F0' }}>
                      <div><div style={{ fontWeight: 'bold' }}>{reward.title}</div><div style={{ fontSize: '12px' }}>{reward.points_required} 點</div></div>
                      <button onClick={() => handleDeleteReward(reward.id)} className="custom-btn-logout" style={{ color: '#EF4444', borderColor: '#EF4444' }}>刪除</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'batch_add' && (
              <div>
                <div className="custom-card" style={{ marginBottom: '24px' }}>
                  <h3 className="custom-h2">勾選加點參數</h3>
                  <input type="number" value={batchAmount} onChange={e => setBatchAmount(Number(e.target.value))} className="custom-input" />
                  <input type="text" value={batchReason} onChange={e => setBatchReason(e.target.value)} className="custom-input" />
                  <button onClick={handleBatchPointsSubmit} disabled={loading || selectedStudentIds.length === 0} className="custom-btn-primary">確認勾選加點 ({selectedStudentIds.length} 人)</button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h2 className="custom-h2" style={{ margin: 0 }}>選擇名單</h2>
                  <button onClick={handleToggleSelectAll} className="custom-btn-logout">{filteredStudents.every(id => selectedStudentIds.includes(id.id)) ? '取消全選' : '一鍵全選'}</button>
                </div>
                <input type="text" placeholder="搜尋..." value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} className="custom-input" />
                <div className="custom-card" style={{ padding: '24px' }}>
                  {filteredStudents.map((s, index) => {
                    const isChecked = selectedStudentIds.includes(s.id);
                    return (
                      <div key={s.id} onClick={() => handleToggleSelectStudent(s.id)} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 0', cursor: 'pointer', borderBottom: index === filteredStudents.length - 1 ? 'none' : '1px solid #E2E8F0' }}>
                        <input type="checkbox" checked={isChecked} onChange={() => {}} style={{ width: '20px', height: '20px' }} />
                        <div><div style={{ fontWeight: 'bold' }}>{s.name}</div><div style={{ fontSize: '12px' }}>{s.username}</div></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'group_add' && (
              <div className="custom-card" style={{ textAlign: 'center' }}>
                {!claimId ? (
                  <>
                    <h3 className="custom-h2">產生即時加點</h3>
                    <input type="text" value={groupTitle} onChange={e => setGroupTitle(e.target.value)} className="custom-input" />
                    <input type="number" value={groupPoints} onChange={e => setGroupPoints(Number(e.target.value))} className="custom-input" />
                    <input type="number" value={groupDuration} onChange={e => setGroupDuration(Number(e.target.value))} className="custom-input" />
                    <button onClick={handleCreateGroupClaim} disabled={loading} className="custom-btn-primary">產生即時加點安全碼</button>
                  </>
                ) : (
                  <>
                    <h3 className="custom-h2">{groupTitle}</h3>
                    <div style={{ color: '#EF4444', fontWeight: 'bold', marginBottom: '20px' }}>{countdownText}</div>
                    <QRCodeSVG value={`${window.location.origin}/claim?id=${claimId}`} size={220} />
                    <button onClick={() => { setClaimId(''); setExpiresAt(null); }} className="custom-btn-secondary" style={{ width: '100%', marginTop: '20px' }}>結束活動</button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
