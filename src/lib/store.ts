// In-memory data store for approval requests
import { ApprovalRequest } from './types';

const requests: ApprovalRequest[] = [];

export function getRequests(): ApprovalRequest[] {
  return [...requests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getRequestById(id: string): ApprovalRequest | undefined {
  return requests.find((r) => r.id === id);
}

export function addRequest(request: ApprovalRequest): ApprovalRequest {
  requests.push(request);
  return request;
}

export function updateRequest(
  id: string,
  updates: Partial<ApprovalRequest>
): ApprovalRequest | null {
  const index = requests.findIndex((r) => r.id === id);
  if (index === -1) return null;

  requests[index] = {
    ...requests[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return requests[index];
}
