'use client';

import { ApprovalRequest } from '@/lib/types';

interface RequestCardProps {
  request: ApprovalRequest;
  showActions?: boolean;
  onApprove?: (id: string, comment: string) => void;
  onReject?: (id: string, comment: string) => void;
}

const statusConfig = {
  pending: {
    label: 'Pending',
    className: 'status-pending',
    icon: '⏳',
  },
  approved: {
    label: 'Approved',
    className: 'status-approved',
    icon: '✅',
  },
  rejected: {
    label: 'Rejected',
    className: 'status-rejected',
    icon: '❌',
  },
};

export default function RequestCard({
  request,
  showActions = false,
  onApprove,
  onReject,
}: RequestCardProps) {
  const status = statusConfig[request.status];

  const handleAction = (action: 'approve' | 'reject') => {
    const comment = prompt(
      `${action === 'approve' ? 'Approve' : 'Reject'} comment (optional):`
    );
    if (comment === null) return; // User cancelled
    if (action === 'approve' && onApprove) {
      onApprove(request.id, comment);
    } else if (action === 'reject' && onReject) {
      onReject(request.id, comment);
    }
  };

  return (
    <div className={`request-card ${request.status}`}>
      <div className="request-card-header">
        <h3 className="request-title">{request.title}</h3>
        <span className={`status-badge ${status.className}`}>
          {status.icon} {status.label}
        </span>
      </div>

      <p className="request-description" style={{ whiteSpace: 'pre-wrap' }}>
        {request.description}
      </p>

      <div className="request-meta">
        <div className="meta-item">
          <span className="meta-label">Amount</span>
          <span className="meta-value amount">
            ฿{Number(request.amount).toLocaleString()}
          </span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Created by</span>
          <span className="meta-value">{request.createdBy}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Date</span>
          <span className="meta-value">
            {new Date(request.createdAt).toLocaleString('th-TH')}
          </span>
        </div>
      </div>

      {request.approvedBy && (
        <div className="request-review">
          <span className="review-by">
            {request.status === 'approved' ? '✅ Approved' : '❌ Rejected'} by{' '}
            <strong>{request.approvedBy}</strong>
          </span>
          {request.comment && (
            <p className="review-comment">&ldquo;{request.comment}&rdquo;</p>
          )}
        </div>
      )}

      {showActions && request.status === 'pending' && (
        <div className="request-actions">
          <button
            className="btn btn-approve"
            onClick={() => handleAction('approve')}
          >
            ✅ Approve
          </button>
          <button
            className="btn btn-reject"
            onClick={() => handleAction('reject')}
          >
            ❌ Reject
          </button>
        </div>
      )}
    </div>
  );
}
