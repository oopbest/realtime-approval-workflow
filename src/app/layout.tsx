import type { Metadata } from 'next';
import { UserProvider } from '@/context/UserContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Approval Flow — Real-time Workflow System',
  description:
    'Real-time Approval Workflow System with Maker/Approver roles using WebSocket',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
