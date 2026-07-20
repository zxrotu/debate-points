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
  const [rewardsList, setRewardsList] = useState<any[]>(initialRewards);
  const [redeemRequests, setRedeemRequests] = useState<any[]>(initialRedeemRequests);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // 封裝後的登出與處理函數
  const handleLogout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/'); };
  const fetchRedeemRequests = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/redeem-requests');
    const data = await res.json();
    setLoading(false);
    if (res.ok) setRedeemRequests(data.requests);
  };

  const handleRedeemAudit = async (requestId: number, action: 'approve' | 'reject') => {
    setLoading(true);
    await fetch('/api/admin/redeem-requests', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ request_id: requestId, action }) });
    setLoading(false);
    fetchRedeemRequests();
  };

  return (
    <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '16px', boxSizing: 'border-box' }}>
      <div className="content-wrapper" style={{ maxWidth: '500px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #CBD5E1', paddingBottom: '16px' }}>
          <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#1E293B' }}>Hello! {adminName}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setShowRedeemModal(!showRedeemModal); setShowHistory(false); setShowAnnModal(false); }} className="custom-btn-circle"><Gift size={16} /></button>
            <button onClick={() => { setShowHistory(!showHistory); setShowAnnModal(false); setShowRedeemModal(false); }} className="custom-btn-circle"><Telescope size={16} /></button>
            <button onClick={() => { setShowAnnModal(!showAnnModal); setShowHistory(false); setShowRedeemModal(false); }} className="custom-btn-circle"><Megaphone size={16} /></button>
            <button onClick={handleLogout} className="custom-btn-logout">登出</button>
          </div>
        </header>

        {/* 頁籤按鈕 (保持 3+3 排列) */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <button onClick={() => setActiveTab('scan')} className={activeTab === 'scan' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '10px 2px', fontSize: '12px' }}>掃描條碼</button>
          <button onClick={() => setActiveTab('manual')} className={activeTab === 'manual' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '10px 2px', fontSize: '12px' }}>輸入帳號</button>
          <button onClick={() => setActiveTab('students')} className={activeTab === 'students' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '10px 2px', fontSize: '12px' }}>帳號一覽</button>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button onClick={() => setActiveTab('add_reward')} className={activeTab === 'add_reward' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '10px 2px', fontSize: '12px' }}>新增獎品</button>
          <button onClick={() => setActiveTab('batch_add')} className={activeTab === 'batch_add' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '10px 2px', fontSize: '12px' }}>勾選加點</button>
          <button onClick={() => setActiveTab('group_add')} className={activeTab === 'group_add' ? 'custom-btn-primary' : 'custom-btn-secondary'} style={{ flex: 1, padding: '10px 2px', fontSize: '12px' }}>即時加點</button>
        </div>

        {/* 審核頁面區塊 */}
        {showRedeemModal && (
          <div className="custom-card" style={{ marginBottom: '24px' }}>
             <h2 className="custom-h2">獎品兌換申請</h2>
             {redeemRequests.map(req => (
               <div key={req.id} style={{ borderBottom: '1px solid #E2E8F0', padding: '12px 0' }}>
                 <div>{req.student_name} 申請 {req.reward_title}</div>
                 <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                   <button onClick={() => handleRedeemAudit(req.id, 'approve')} className="custom-btn-primary" style={{ padding: '4px 8px' }}>同意</button>
                   <button onClick={() => handleRedeemAudit(req.id, 'reject')} className="custom-btn-secondary" style={{ padding: '4px 8px' }}>拒絕</button>
                 </div>
               </div>
             ))}
             <button onClick={() => setShowRedeemModal(false)} className="custom-btn-primary" style={{ marginTop: '16px' }}>返回首頁</button>
          </div>
        )}
      </div>
    </div>
  );
}
