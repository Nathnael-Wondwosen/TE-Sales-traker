'use client';

import { SessionProvider } from 'next-auth/react';
import Navigation from '@/components/Navigation';
import NotificationComponent from '@/components/Notification';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { usePathname } from 'next/navigation';

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <SessionProvider 
      basePath="/api/auth"
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true}
    >
      <ThemeProvider>
        {!isLoginPage && <Navigation />}
        <main className="w-full">{children}</main>
        <NotificationComponent />
      </ThemeProvider>
    </SessionProvider>
  );
}