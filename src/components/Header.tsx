'use client';

import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { userName, role, logout } = useUser();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="header-logo">
            <span className="logo-icon">⚡</span>
            Approval Flow
          </h1>
          <span className="header-subtitle">Real-time Workflow</span>
        </div>

        <div className="header-right">
          <div className="ws-indicator connected" id="ws-status">
            <span className="ws-dot"></span>
            <span className="ws-text">Live</span>
          </div>
          <div className="user-info">
            <span className="user-name">{userName}</span>
            <span className={`role-badge role-${role}`}>
              {role === 'maker' ? '✏️ Maker' : '🔍 Approver'}
            </span>
          </div>
          <button className="btn btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
