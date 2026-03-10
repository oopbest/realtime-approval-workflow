'use client';

import { useEffect, useState } from 'react';
import { WSNotificationPayload } from '@/lib/types';

interface NotificationProps {
  notification: WSNotificationPayload | null;
  onDismiss: () => void;
}

export default function Notification({
  notification,
  onDismiss,
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);

      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for fade animation
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notification, onDismiss]);

  if (!notification) return null;

  const typeConfig = {
    success: { className: 'toast-success', icon: '✅' },
    info: { className: 'toast-info', icon: '📋' },
    warning: { className: 'toast-warning', icon: '⚠️' },
    error: { className: 'toast-error', icon: '❌' },
  };

  const config = typeConfig[notification.type];

  return (
    <div className={`toast ${config.className} ${isVisible ? 'toast-enter' : 'toast-exit'}`}>
      <div className="toast-content">
        <span className="toast-icon">{config.icon}</span>
        <p className="toast-message">{notification.message}</p>
      </div>
      <button className="toast-close" onClick={() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300);
      }}>
        ✕
      </button>
    </div>
  );
}
