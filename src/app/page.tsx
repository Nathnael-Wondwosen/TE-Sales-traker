'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardPath } from '@/lib/rbac';
import Image from 'next/image';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
    } else {
      // Redirect to appropriate dashboard based on role
      const dashboardPath = getDashboardPath((session.user as any).role);
      router.push(dashboardPath);
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="text-center max-w-md px-4">
          <div className="text-4xl font-bold mb-4 text-primary tracking-tight">TE-Sales Tracker</div>
          <p className="text-gray-600 mb-8">Loading your personalized dashboard...</p>
          <div className="flex justify-center mb-8">
            <Image src="/logo.jpg" alt="TE-Sales Tracker" width={80} height={80} className="rounded-lg shadow" />
          </div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded-full dark:bg-gray-700 w-3/4 mx-auto skeleton"></div>
            <div className="h-4 bg-gray-200 rounded-full dark:bg-gray-700 w-1/2 mx-auto skeleton"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg p-4">
      <div className="text-center max-w-md w-full">
        <div className="inline-flex items-center justify-center w-20 h-20 mb-6 animate-fade-in">
          <Image src="/logo.jpg" alt="TE-Sales Tracker" width={80} height={80} className="rounded-2xl shadow-lg" />
        </div>
        <h1 className="text-4xl font-bold mb-4 text-gray-900 tracking-tight animate-fade-in">TE-Sales Tracker</h1>
        <p className="text-gray-600 mb-8 animate-fade-in delay-100">Professional sales management platform</p>
        <div className="flex justify-center mb-8 animate-fade-in delay-200">
          <div className="relative w-20 h-20 flex items-center justify-center"></div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/50 animate-fade-in delay-300">
          <p className="text-gray-700 mb-4">Redirecting to your dashboard...</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-primary h-2 rounded-full animate-progress-fill" style={{ width: '70%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
