'use client';

import { SessionProvider } from 'next-auth/react';
import Navigation from '@/components/Navigation';
import NotificationComponent from '@/components/Notification';
import { ThemeProvider } from '@/contexts/ThemeContext';

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <Navigation />
        <main className="w-full">{children}</main>
        <NotificationComponent />
      </ThemeProvider>
    </SessionProvider>
  );
}