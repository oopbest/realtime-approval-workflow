'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import Header from '@/components/Header';
import RequestCard from '@/components/RequestCard';
import Notification from '@/components/Notification';
import { WSNotificationPayload } from '@/lib/types';

export default function ApproverPage() {
  const { userName, userId, role, isLoggedIn } = useUser();
  const router = useRouter();

  const [notification, setNotification] = useState<WSNotificationPayload | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const handleNotification = useCallback((n: WSNotificationPayload) => {
    setNotification(n);
  }, []);

  const { isConnected, requests, sendMessage } = useWebSocket({
    userId,
    userName,
    role: role || 'approver',
    onNotification: handleNotification,
  });

  useEffect(() => {
    if (!isLoggedIn || role !== 'approver') {
      router.push('/');
    }
  }, [isLoggedIn, role, router]);

  if (!isLoggedIn || role !== 'approver') return null;

  const handleApprove = (requestId: string, comment: string) => {
    sendMessage({
      type: 'approve-request',
      payload: {
        requestId,
        approvedBy: userName,
        comment,
      },
    });
  };

  const handleReject = (requestId: string, comment: string) => {
    sendMessage({
      type: 'reject-request',
      payload: {
        requestId,
        approvedBy: userName,
        comment,
      },
    });
  };

  const filteredRequests =
    filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
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
          <h2>🔍 Approver Dashboard</h2>
          <p>
            ตรวจสอบและอนุมัติคำขอแบบ Real-time{' '}
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
            <div className="stat-label">Pending Review</div>
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

        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>
            📋 คำขอทั้งหมด ({filteredRequests.length})
          </h3>

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
                <p>
                  {filter === 'pending'
                    ? 'ไม่มีคำขอที่รอการอนุมัติ'
                    : 'ไม่มีคำขอในหมวดนี้'}
                </p>
              </div>
            ) : (
              filteredRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  showActions={true}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
