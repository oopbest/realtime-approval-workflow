'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import Header from '@/components/Header';
import RequestCard from '@/components/RequestCard';
import Notification from '@/components/Notification';
import { WSNotificationPayload } from '@/lib/types';

export default function MakerPage() {
  const { userName, userId, role, isLoggedIn } = useUser();
  const router = useRouter();

  const [notification, setNotification] = useState<WSNotificationPayload | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const handleNotification = useCallback((n: WSNotificationPayload) => {
    setNotification(n);
  }, []);

  const { isConnected, requests, sendMessage } = useWebSocket({
    userId,
    userName,
    role: role || 'maker',
    onNotification: handleNotification,
  });

  useEffect(() => {
    if (!isLoggedIn || role !== 'maker') {
      router.push('/');
    }
  }, [isLoggedIn, role, router]);

  if (!isLoggedIn || role !== 'maker') return null;

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !amount) return;

    sendMessage({
      type: 'new-request',
      payload: {
        title: title.trim(),
        description: description.trim(),
        amount: parseFloat(amount),
        createdBy: userName,
      },
    });

    // Reset form
    setTitle('');
    setDescription('');
    setAmount('');
  };

  // Filter requests created by this maker
  const myRequests = requests.filter((r) => r.createdBy === userName);
  const filteredRequests =
    filter === 'all' ? myRequests : myRequests.filter((r) => r.status === filter);

  const stats = {
    total: myRequests.length,
    pending: myRequests.filter((r) => r.status === 'pending').length,
    approved: myRequests.filter((r) => r.status === 'approved').length,
    rejected: myRequests.filter((r) => r.status === 'rejected').length,
  };

  return (
    <>
      <Header />
      <Notification
        notification={notification}
        onDismiss={() => setNotification(null)}
      />

      <div className="dashboard">
        <div className="dashboard-header">
          <h2>✏️ Maker Dashboard</h2>
          <p>
            สร้างคำขออนุมัติและติดตามสถานะแบบ Real-time{' '}
            <span style={{ color: isConnected ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {isConnected ? '● Connected' : '○ Disconnected'}
            </span>
          </p>
        </div>

        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-label">Total Requests</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending</div>
            <div className="stat-value pending">{stats.pending}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Approved</div>
            <div className="stat-value approved">{stats.approved}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Rejected</div>
            <div className="stat-value rejected">{stats.rejected}</div>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Create Request Form */}
          <div className="create-form">
            <h3>📝 สร้างคำขอใหม่</h3>
            <form onSubmit={handleCreateRequest}>
              <div className="form-group">
                <label htmlFor="requestTitle">หัวข้อ</label>
                <input
                  id="requestTitle"
                  type="text"
                  className="form-input"
                  placeholder="ระบุหัวข้อคำขอ"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="requestDescription">รายละเอียด</label>
                <textarea
                  id="requestDescription"
                  className="form-input form-textarea"
                  placeholder="อธิบายรายละเอียดคำขอ"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="requestAmount">จำนวนเงิน (฿)</label>
                <input
                  id="requestAmount"
                  type="number"
                  className="form-input"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px' }}
                disabled={!title.trim() || !description.trim() || !amount}
              >
                📤 ส่งคำขออนุมัติ
              </button>
            </form>
          </div>

          {/* Requests List */}
          <div className="requests-section">
            <h3>📋 คำขอของฉัน ({filteredRequests.length})</h3>

            <div className="filter-tabs">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                <button
                  key={f}
                  className={`filter-tab ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' && `ทั้งหมด (${stats.total})`}
                  {f === 'pending' && `⏳ Pending (${stats.pending})`}
                  {f === 'approved' && `✅ Approved (${stats.approved})`}
                  {f === 'rejected' && `❌ Rejected (${stats.rejected})`}
                </button>
              ))}
            </div>

            <div className="requests-list">
              {filteredRequests.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <p>ยังไม่มีคำขอ<br />สร้างคำขอใหม่จากฟอร์มด้านซ้าย</p>
                </div>
              ) : (
                filteredRequests.map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
