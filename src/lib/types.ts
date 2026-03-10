// Types for the Approval Workflow System

export type Role = 'maker' | 'approver';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  name: string;
  role: Role;
}

export interface ApprovalRequest {
  id: string;
  title: string;
  description: string;
  amount: number;
  status: RequestStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  comment?: string;
}

// WebSocket Message Types
export type WSMessageType =
  | 'connection'
  | 'new-request'
  | 'request-created'
  | 'approve-request'
  | 'reject-request'
  | 'request-updated'
  | 'notification'
  | 'requests-list';

export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
}

export interface WSConnectionPayload {
  userId: string;
  userName: string;
  role: Role;
}

export interface WSNewRequestPayload {
  title: string;
  description: string;
  amount: number;
  createdBy: string;
}

export interface WSApproveRejectPayload {
  requestId: string;
  approvedBy: string;
  comment?: string;
}

export interface WSNotificationPayload {
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  requestId?: string;
}
