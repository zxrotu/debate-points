'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QRCodeSVG } from 'qrcode.react';
import { Telescope, Megaphone } from 'lucide-react';

interface AdminDashboardClientProps {
  adminName: string;
  initialRewards: any[];
  transactions: any[];
  announcement: string;
  initialRedeemRequests: any[];
}

export default function AdminDashboardClient({ 
  adminName, 
  initialRewards, 
  transactions, 
  announcement,
  initialRedeemRequests
}: AdminDashboardClientProps) {
  const router = useRouter();
  
  // 頁籤控制
  const [activeTab, setActiveTab] = useState<'scan' | 'manual' | 'students' | 'add_reward' | 'batch_add' | 'group_add' | 'redeem_requests'>('scan');
  const [step, setStep] = useState<'scan_or_search' | 'student_confirm' | 'points_adjust'>('scan_or_search');
  const [student, setStudent] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  // 公告編輯狀態
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annContent, setAnnContent] = useState(announcement);
  const [editAnnContent, setEditAnnContent] = useState(announcement);

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

  // 勾選加點專用狀態
  const [batchAmount, setBatchAmount] = useState<number>(5);
  const [batchReason, setBatchReason] = useState('參與社課加點');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // 即時加點專用狀態
  const [groupTitle, setGroupTitle] = useState('社課出席加點');
  const [groupPoints, setGroupPoints] = useState<number>(5);
  const [groupDuration, setGroupDuration] = useState<number>(5);
  const [claimId, setClaimId] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [countdownText, setCountdownText] = useState('');

  const [manualUsername, setManualUsername] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  // 待審核線上申請狀態
  const [redeemRequests, setRedeemRequests] = useState<any[]>(initialRedeemRequests);

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
    if (activeTab === 'students' || activeTab === 'batch_add') {
      fetchStudents();
    }
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

  const handleBatchPointsSubmit = async () => {
    if (selectedStudentIds.length === 0) {
      alert('請至少勾選一位社員！');
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
      setMessage({ text: `勾選加點成功！已順利為 ${data.count} 位社員加上 ${batchAmount} 個論點！`, type: 'success' });
      setSelectedStudentIds([]);
      fetchStudents();
    } else {
      setMessage({ text: data.error || '一次加點失敗', type: 'error' });
    }
  };

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
      setMessage({ text: `成功新增獎品: ${newRewardTitle}`, type: 'success' });
      setRewardsList((prev) => [...prev, data.reward].sort((a, b) => a.points_required - b.points_required));
      if (!selectedRewardId) setSelectedRewardId(data.reward.id);
      setNewRewardTitle('');
      setNewRewardPoints(20);
      setNewRewardDesc('');
    } else {
      setMessage({ text: data.error || '新增獎品失敗', type: 'error' });
    }
  };

  const handleDeleteReward = async (rewardId: number) => {
    if (!confirm('您確定要刪除這項獎品嗎？此操作無法還原。')) return;
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
        setMessage({ text: data.message || '已成功刪除該獎品', type: 'success' });
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

  const handleUpdateAnnouncement = async () => {
    if (editAnnContent.trim() === '') {
      alert('請輸入公告內容！');
      return;
    }
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await fetch('/api/admin/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editAnnContent }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: '公告已成功更新！', type: 'success' });
        setAnnContent(editAnnContent);
        setShowAnnModal(false);
      } else {
        setMessage({ text: data.error || '公告更新失敗', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: '連線異常，更新失敗', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 線上兌換申請審核（核准或拒絕）
  const handleRedeemRequestAction = async (requestId: number, action: 'approve' | 'reject') => {
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await fetch('/api/admin/redeem-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        setMessage({ 
          text: action === 'approve' ? '已核准兌換並扣除對應點數。' : '已拒絕該線上兌換申請。', 
          type: 'success' 
        });
        setRedeemRequests(prev => prev.filter(req => req.id !== requestId));
      } else {
        setMessage({ text: data.error || '操作失敗', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setMessage({ text: '連線異常，審核操作失敗', type: 'error' });
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const currentFilteredIds = filteredStudents.map(s => s.id);
    const allSelected = currentFilteredIds.every(id => selectedStudentIds.includes(id));

    if (allSelected) {
      setSelectedStudentIds((prev) => prev.filter(id => !currentFilteredIds.includes(id)));
    } else {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...currentFilteredIds])));
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const datePart = dateStr.substring(0, 10);
      const timePart = dateStr.substring(11, 16);
      return `${datePart} ${timePart}`;
    } catch (err) {
      return dateStr;
    }
  };

  const filteredStudents = allStudents.filter(s => s.name.includes(searchKeyword) || s.username.includes(searchKeyword));

  return (
    <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '16px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
      <div className="content-wrapper" style={{ width: '100%', maxWidth: '500px' }}>
        
        {/* 標題欄 */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #CBD5E1', paddingBottom: '16px' }}>
          <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#1E293B' }}>Hello! {adminName}</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              onClick={() => { setShowHistory(!showHistory); setShowAnnModal(false); }} 
              className="custom-btn-logout"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '8px',
                backgroundColor: showHistory ? '#0097B2' : '#FFFFFF',
                color: showHistory ? '#FFFFFF' : '#0097B2',
                borderColor: '#0097B2'
              }}
              title="歷史紀錄"
            >
              <Telescope size={16} />
            </button>
            <button 
              onClick={() => { setShowAnnModal(!showAnnModal); setShowHistory(false); }} 
              className="custom-btn-logout"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '8px',
                backgroundColor: showAnnModal ? '#0097B2' : '#FFFFFF',
                color: showAnnModal ? '#FFFFFF' : '#0097B2',
                borderColor: '#0097B2'
              }}
              title="發布公告"
            >
              <Megaphone size={16} />
            </button>
            <button onClick={handleLogout} className="custom-btn-logout">登出</button>
          </div>
        </header>

        {/* 公告欄：若無設定公告內容，自動完全隱藏 */}
        {annContent && annContent.trim() !== '' && (
          <div className="custom-marquee-container">
            <div className="custom-marquee-icon">
              <Megaphone size={16} />
            </div>
            <div className="custom-marquee-text-wrapper">
              <span className="custom-marquee-text">{annContent}</span>
            </div>
          </div>
        )}

        {/* 訊息提示 */}
        {message.text && (
          <div style={{ padding: '16px', borderRadius: '16px', border: '1px solid', marginBottom: '24px', textAlign: 'center', fontSize: '14px', backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEF2F2', borderColor: message.type === 'success' ? '#10B981' : '#F87171', color: message.type === 'success' ? '#047857' : '#B91C1C' }}>
            {message.text}
          </div>
        )}

        {/* 公告編輯面板 */}
        {showAnnModal && (
          <div className="custom-card" style={{ maxWidth: '100%', marginBottom: '24px', padding: '24px' }}>
            <h3 className="custom-h2" style={{ fontSize: '18px', textAlign: 'center' }}>發布即時公告</h3>
            <div>
              <label className="custom-field-label">公告內容</label>
              <input 
                type="text" 
                value={editAnnContent} 
                onChange={e => setEditAnnContent(e.target.value)} 
                className="custom-input" 
                placeholder="輸入公告內容（如：今日社課地點改至 302 教室）..." 
              />
              <div style={{ display: 'flex', gap: '16px' }}>
                <button onClick={() => setShowAnnModal(false)} className="custom-btn-secondary" style={{ flex: 1 }}>
                  取消
                </button>
                <button onClick={handleUpdateAnnouncement} disabled={loading} className="custom-btn-primary" style={{ flex: 1 }}>
                  {loading ? '發布中...' : '確認發布'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 歷史紀錄獨立面板 */}
        {showHistory ? (
          <div className="custom-card" style={{ maxWidth: '100%', marginBottom: '24px', padding: '24px' }}>
            <h3 className="custom-h2" style={{ fontSize: '18px', textAlign: 'center', marginBottom: '16px' }}>論點異動查詢</h3>
            {transactions.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#64748B', fontSize: '14px', margin: '24px 0' }}>資料庫目前尚無任何交易日誌</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', marginBottom: '24px' }}>
                {transactions.map((t, index) => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 4px', borderBottom: index === transactions.length - 1 ? 'none' : '1px solid #E2E8F0', fontSize: '13px' }}>
                    <div style={{ textAlign: 'left', paddingRight: '8px' }}>
                      <div style={{ fontWeight: 'bold', color: '#1E293B' }}>{t.student_name} ({t.student_username})</div>
                      <div style={{ color: '#475569', fontSize: '12px', marginTop: '2px' }}>{t.reason}</div>
                      <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>{formatDate(t.created_at)}</div>
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '15px', color: t.amount > 0 ? '#10B981' : '#EF4444', whiteSpace: 'nowrap' }}>
                      {t.amount > 0 ? `+${t.amount}` : t.amount}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowHistory(false)} className="custom-btn-primary" style={{ width: '100%' }}>
              返回首頁
            </button>
          </div>
        ) : (
          /* 主主控台畫面 */
          <div>
            {/* 第一排按鈕 */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button onClick={() => { setActiveTab('scan'); setStep('scan_or_search'); setMessage({ text: '', type: '' }); }} className={activeTab === 'scan' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '10px 2px', fontSize: '12px', whiteSpace: 'nowrap' }}>掃描條碼</button>
              <button onClick={() => { setActiveTab('manual'); setStep('scan_or_search'); setMessage({ text: '', type: '' }); }} className={activeTab === 'manual' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '10px 2px', fontSize: '12px', whiteSpace: 'nowrap' }}>輸入帳號</button>
              <button onClick={() => { setActiveTab('students'); setMessage({ text: '', type: '' }); }} className={activeTab === 'students' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '10px 2px', fontSize: '12px', whiteSpace: 'nowrap' }}>社員名冊</button>
            </div>

            {/* 第二排按鈕 */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button onClick={() => { setActiveTab('add_reward'); setMessage({ text: '', type: '' }); }} className={activeTab === 'add_reward' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '10px 2px', fontSize: '12px', whiteSpace: 'nowrap' }}>新增獎品</button>
              <button onClick={() => { setActiveTab('batch_add'); setMessage({ text: '', type: '' }); }} className={activeTab === 'batch_add' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '10px 2px', fontSize: '12px', whiteSpace: 'nowrap' }}>勾選加點</button>
              <button onClick={() => { setActiveTab('group_add'); setMessage({ text: '', type: '' }); }} className={activeTab === 'group_add' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '10px 2px', fontSize: '12px', whiteSpace: 'nowrap' }}>掃碼加點</button>
            </div>

            {/* 第三排按鈕（滿版寬度審核按鈕，顯示待審核數量，保障弱視與行動端大範圍高準度點擊） */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button 
                onClick={() => { setActiveTab('redeem_requests'); setMessage({ text: '', type: '' }); }} 
                className={activeTab === 'redeem_requests' ? 'custom-btn-primary' : 'custom-btn-secondary'} 
                style={{ flex: 1, padding: '10px 12px', fontSize: '13px', whiteSpace: 'nowrap' }}
              >
                審核申請 {redeemRequests.length > 0 ? `(${redeemRequests.length})` : ''}
              </button>
            </div>

            {/* 掃描與輸入主區：使用 display 控制顯示，避免相機節點被條件卸載而引發記憶體洩漏與功能飄移 */}
            <div style={{ display: (activeTab === 'scan' && step === 'scan_or_search') ? 'block' : 'none' }}>
              <div className="custom-card" style={{ maxWidth: '100%', textAlign: 'center', marginTop: '0px', marginBottom: '24px' }}>
                <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>請允許相機權限，將社員 QR Code 放置於鏡頭前</p>
                <div id="reader" style={{ borderRadius: '16px', overflow: 'hidden', border: '2px solid #CBD5E1' }}></div>
              </div>
            </div>

            <div style={{ display: (activeTab === 'manual' && step === 'scan_or_search') ? 'block' : 'none' }}>
              <div className="custom-card" style={{ maxWidth: '100%', marginTop: '0px', marginBottom: '24px' }}>
                <h3 className="custom-h2" style={{ fontSize: '18px', textAlign: 'center' }}>手動查詢社員</h3>
                <div>
                  <label className="custom-field-label">社員登入帳號 (帳號)</label>
                  <input type="text" placeholder="例如 123" value={manualUsername} onChange={e => setManualUsername(e.target.value)} className="custom-input" />
                  <button onClick={() => handleFetchStudent({ username: manualUsername })} disabled={loading || !manualUsername} className="custom-btn-primary" style={{ width: '100%' }}>{loading ? '查詢中...' : '查詢社員資料'}</button>
                </div>
              </div>
            </div>

            {/* 以下確認與設定階段（不包含相機元件）採用條件渲染 */}
            {(activeTab === 'scan' || activeTab === 'manual') && step === 'student_confirm' && student && (
              <div className="custom-card" style={{ maxWidth: '100%', marginBottom: '24px', marginTop: '0px' }}>
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

            {(activeTab === 'scan' || activeTab === 'manual') && step === 'points_adjust' && student && (
              <div className="custom-card" style={{ maxWidth: '100%', marginBottom: '24px', marginTop: '0px' }}>
                <h3 className="custom-h2" style={{ fontSize: '20px', textAlign: 'center', marginBottom: '4px' }}>設定點數變更</h3>
                <p className="custom-p" style={{ fontSize: '14px', marginBottom: '20px' }}>對象: {student.name} (目前 {student.points} 點)</p>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                  <button onClick={() => { setAdjustMode('general'); setPointsAction('add'); setAmount(5); setReason('參與社課加點'); }} className={adjustMode === 'general' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}>一般加扣點</button>
                  <button onClick={() => { setAdjustMode('redeem'); if (rewardsList.length > 0) { setSelectedRewardId(rewardsList[0].id); } }} className={adjustMode === 'redeem' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}>兌換獎品</button>
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
                      <p style={{ textAlign: 'center', color: '#64748B', fontSize: '14px', marginBottom: '24px' }}>目前資料庫內尚無獎品，請先去「新增獎品」頁籤建立！</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>
                          <label className="custom-field-label">選擇兌換獎品</label>
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
              <input type="text" placeholder="搜尋社員姓名或帳號..." value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} className="custom-input" style={{ marginBottom: '0px' }} />
            </div>
            {loading ? (
              <p style={{ textAlign: 'center', color: '#64748B' }}>名單加載中...</p>
            ) : filteredStudents.length === 0 ? (
              <div className="custom-card" style={{ maxWidth: '100%', textAlign: 'center' }}>
                <p style={{ color: '#64748B', margin: 0 }}>找不到符合條件的社員</p>
              </div>
            ) : (
              /* 統一改用極簡單卡片、細灰色線條分割排版 */
              <div className="custom-card" style={{ maxWidth: '100%', padding: '24px' }}>
                {filteredStudents.map((s, index) => (
                  <div 
                    key={s.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '14px 0', 
                      borderBottom: index === filteredStudents.length - 1 ? 'none' : '1px solid #E2E8F0' 
                    }}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1E293B' }}>{s.name}</div>
                      <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>帳號: {s.username}</div>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#0097B2' }}>
                      {s.points} <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#475569' }}>點</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'add_reward' && (
          <div>
            <div className="custom-card" style={{ maxWidth: '100%', marginBottom: '24px' }}>
              <h3 className="custom-h2" style={{ fontSize: '20px', textAlign: 'center', marginBottom: '24px' }}>新增社團獎品</h3>
              <form onSubmit={handleAddRewardSubmit}>
                <div>
                  <label className="custom-field-label">獎品名稱</label>
                  <input type="text" required placeholder="例如 辯論社專屬徽章" value={newRewardTitle} onChange={e => setNewRewardTitle(e.target.value)} className="custom-input" />
                </div>
                <div>
                  <label className="custom-field-label">所需「論點」點數</label>
                  <input type="number" min="1" required value={newRewardPoints} onChange={e => setNewRewardPoints(Math.max(1, Number(e.target.value)))} className="custom-input" />
                </div>
                <div>
                  <label className="custom-field-label">獎品描述 (選填)</label>
                  <input type="text" placeholder="簡短描述這項獎品..." value={newRewardDesc} onChange={e => setNewRewardDesc(e.target.value)} className="custom-input" />
                </div>
                <button type="submit" disabled={loading} className="custom-btn-primary" style={{ width: '100%', marginTop: '8px' }}>{loading ? '新增中...' : '確認新增'}</button>
              </form>
            </div>

            <h2 className="custom-h2" style={{ paddingLeft: '8px', fontSize: '18px', marginTop: '32px' }}>目前獎品清單 (可於手機直接刪除)</h2>
            {rewardsList.length === 0 ? (
              <div className="custom-card" style={{ maxWidth: '100%', textAlign: 'center' }}>
                <p style={{ color: '#64748B', margin: 0 }}>目前資料庫內尚無獎品</p>
              </div>
            ) : (
              /* 統一改用極簡單卡片、細灰色線條分割排版 */
              <div className="custom-card" style={{ maxWidth: '100%', padding: '24px' }}>
                {rewardsList.map((reward, index) => (
                  <div 
                    key={reward.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '16px 0', 
                      borderBottom: index === rewardsList.length - 1 ? 'none' : '1px solid #E2E8F0' 
                    }}
                  >
                    <div style={{ textAlign: 'left', paddingRight: '12px' }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1E293B' }}>{reward.title}</div>
                      {reward.description && <div style={{ fontSize: '14px', color: '#475569', marginTop: '4px' }}>{reward.description}</div>}
                      <div style={{ fontSize: '14px', color: '#64748B', marginTop: '6px' }}>
                        所需點數: <strong style={{ fontSize: '16px', color: '#0097B2', fontWeight: 'bold' }}>{reward.points_required}</strong> 點
                      </div>
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
            )}
          </div>
        )}

        {/* 一次加點 UI */}
        {activeTab === 'batch_add' && (
          <div>
            <div className="custom-card" style={{ maxWidth: '100%', marginBottom: '24px' }}>
              <h3 className="custom-h2" style={{ fontSize: '20px', textAlign: 'center', marginBottom: '24px' }}>設定勾選加點參數</h3>
              <div>
                <label className="custom-field-label">加點分數 (正數)</label>
                <input type="number" min="1" value={batchAmount} onChange={e => setBatchAmount(Math.max(1, Number(e.target.value)))} className="custom-input" />
              </div>
              <div>
                <label className="custom-field-label">變更事由</label>
                <input type="text" value={batchReason} onChange={e => setBatchReason(e.target.value)} className="custom-input" />
              </div>
              <button 
                onClick={handleBatchPointsSubmit} 
                disabled={loading || selectedStudentIds.length === 0}
                className="custom-btn-primary" 
                style={{ width: '100%', marginTop: '8px', backgroundColor: selectedStudentIds.length > 0 ? '#0097B2' : '#CBD5E1', cursor: selectedStudentIds.length > 0 ? 'pointer' : 'not-allowed', boxShadow: 'none' }}
              >
                {loading ? '勾選加點中...' : `確認勾選加點 (${selectedStudentIds.length} 人)`}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '0 4px' }}>
              <h2 className="custom-h2" style={{ margin: 0, fontSize: '18px' }}>選擇社員名單</h2>
              <button onClick={handleToggleSelectAll} className="custom-btn-logout" style={{ fontSize: '12px', padding: '4px 12px' }}>
                {filteredStudents.every(id => selectedStudentIds.includes(id.id)) ? '取消全選' : '一鍵全選'}
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <input type="text" placeholder="搜尋社員姓名或帳號..." value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} className="custom-input" style={{ marginBottom: '0px' }} />
            </div>

            {loading ? (
              <p style={{ textAlign: 'center', color: '#64748B' }}>社員清單載入中...</p>
            ) : filteredStudents.length === 0 ? (
              <div className="custom-card" style={{ maxWidth: '100%', textAlign: 'center' }}>
                <p style={{ color: '#64748B', margin: 0 }}>找不到符合條件的社員</p>
              </div>
            ) : (
              /* 一體化單張大卡片：社員勾選清單 (已改名為「勾選加點」) */
              <div className="custom-card" style={{ maxWidth: '100%', padding: '24px' }}>
                {filteredStudents.map((s, index) => {
                  const isChecked = selectedStudentIds.includes(s.id);
                  return (
                    <div 
                      key={s.id} 
                      onClick={() => handleToggleSelectStudent(s.id)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: '16px',
                        padding: '14px 0',
                        cursor: 'pointer',
                        borderBottom: index === filteredStudents.length - 1 ? 'none' : '1px solid #E2E8F0',
                        color: isChecked ? '#0097B2' : '#000000',
                        fontWeight: isChecked ? 'bold' : 'normal'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#0097B2' }}
                      />
                      <div style={{ textAlign: 'left', flexGrow: 1 }}>
                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{s.name}</div>
                        <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>帳號: {s.username} | 目前: {s.points} 點</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 即時出席加點 QR Code 產生器 (內文已修正為「即時」) */}
        {activeTab === 'group_add' && (
          <div>
            {!claimId ? (
              <div className="custom-card" style={{ maxWidth: '100%', marginBottom: '24px' }}>
                <h3 className="custom-h2" style={{ fontSize: '20px', textAlign: 'center', marginBottom: '24px' }}>即時加點QR Code</h3>
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
                  產生即時加點安全碼
                </button>
              </div>
            ) : (
              <div className="custom-card" style={{ maxWidth: '100%', textAlign: 'center', marginBottom: '24px' }}>
                <h3 className="custom-h2" style={{ fontSize: '20px', color: '#1E293B' }}>{groupTitle}</h3>
                <p style={{ fontSize: '15px', color: '#0097B2', fontWeight: 'bold', margin: '4px 0 16px 0' }}>即時加點QR Code (獲得 {groupPoints} 個論點)</p>
                
                <div style={{ fontSize: '14px', color: '#EF4444', fontWeight: 'bold', marginBottom: '20px', backgroundColor: '#FEF2F2', padding: '10px', borderRadius: '12px', border: '1px solid #FCA5A5' }}>
                  {countdownText}
                </div>

                <div style={{ display: 'inline-block', backgroundColor: '#FFFFFF', padding: '16px', border: '1px solid #CBD5E1', borderRadius: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.03)', marginBottom: '24px' }}>
                  <QRCodeSVG value={`${window.location.origin}/claim?id=${claimId}`} size={220} />
                </div>
                
                <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.5', marginBottom: '24px', padding: '0 8px' }}>
                  請投影至大螢幕，社員可直接打開「網頁中的掃描」或「手機自帶相機」掃描此條碼。限每位社員僅限掃描領取一次。
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

        {/* 線上審核兌換申請 */}
        {activeTab === 'redeem_requests' && (
          <div>
            <h2 className="custom-h2" style={{ paddingLeft: '8px' }}>線上兌換審核</h2>
            {redeemRequests.length === 0 ? (
              <div className="custom-card" style={{ maxWidth: '100%', textAlign: 'center' }}>
                <p style={{ color: '#64748B', margin: 0 }}>目前沒有待處理的兌換申請</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {redeemRequests.map((req) => {
                  const hasEnoughPoints = req.student_points >= req.points_required;
                  return (
                    <div 
                      key={req.id} 
                      className="custom-card" 
                      style={{ maxWidth: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
                    >
                      {/* 學生姓名與其餘額 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1E293B' }}>{req.student_name}</div>
                          <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>帳號: {req.student_username}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '13px', color: '#64748B' }}>目前餘額</div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0097B2', marginTop: '2px' }}>{req.student_points} 點</div>
                        </div>
                      </div>

                      {/* 申請之獎品內容 */}
                      <div style={{ textAlign: 'left' }}>
                        <span style={{ fontSize: '13px', color: '#64748B' }}>申請兌換獎品</span>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1E293B', marginTop: '4px' }}>{req.reward_title}</div>
                        <div style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
                          扣除點數: <strong style={{ color: '#EF4444' }}>-{req.points_required}</strong> 點
                        </div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '8px' }}>
                          申請時間: {formatDate(req.created_at)}
                        </div>
                      </div>

                      {/* 審核操作按鈕 */}
                      <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                        <button 
                          onClick={() => handleRedeemRequestAction(req.id, 'reject')} 
                          disabled={loading}
                          className="custom-btn-secondary" 
                          style={{ flex: 1, padding: '10px 12px', fontSize: '13px', borderColor: '#EF4444', color: '#EF4444' }}
                        >
                          拒絕申請
                        </button>
                        <button 
                          onClick={() => handleRedeemRequestAction(req.id, 'approve')} 
                          disabled={loading || !hasEnoughPoints}
                          className="custom-btn-primary" 
                          style={{ 
                            flex: 1, 
                            padding: '10px 12px', 
                            fontSize: '13px',
                            backgroundColor: hasEnoughPoints ? '#0097B2' : '#CBD5E1',
                            color: '#FFFFFF',
                            cursor: hasEnoughPoints ? 'pointer' : 'not-allowed',
                            border: 'none'
                          }}
                        >
                          {hasEnoughPoints ? '核准兌換' : '點數不足'}
                        </button>
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
