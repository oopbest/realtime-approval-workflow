'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { Role } from '@/lib/types';

export default function LoginPage() {
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const { login } = useUser();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedRole) return;

    login(name.trim(), selectedRole);
    router.push(`/${selectedRole}`);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>⚡ Approval Flow</h1>
          <p>Real-time Approval Workflow System</p>
        </div>

        <div className="login-card">
          <h2>เข้าสู่ระบบ</h2>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="userName">ชื่อผู้ใช้</label>
              <input
                id="userName"
                type="text"
                className="form-input"
                placeholder="กรอกชื่อของคุณ"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>เลือก Role</label>
              <div className="role-selector">
                <div
                  className={`role-option ${selectedRole === 'maker' ? 'selected' : ''}`}
                  onClick={() => setSelectedRole('maker')}
                >
                  <span className="role-icon">✏️</span>
                  <span className="role-label">Maker</span>
                  <span className="role-desc">สร้างคำขออนุมัติ</span>
                </div>
                <div
                  className={`role-option ${selectedRole === 'approver' ? 'selected approver-option' : ''}`}
                  onClick={() => setSelectedRole('approver')}
                >
                  <span className="role-icon">🔍</span>
                  <span className="role-label">Approver</span>
                  <span className="role-desc">อนุมัติ / ปฏิเสธคำขอ</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={!name.trim() || !selectedRole}
              style={{ width: '100%', padding: '14px' }}
            >
              เข้าสู่ระบบ
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
