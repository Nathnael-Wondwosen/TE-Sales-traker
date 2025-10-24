'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardPath } from '@/lib/rbac';
import Image from 'next/image';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only run redirect logic when not loading
    if (status !== 'loading') {
      if (!session) {
        router.push('/login');
      } else {
        try {
          // Redirect to appropriate dashboard based on role
          const userRole = (session.user as any).role;
          const dashboardPath = getDashboardPath(userRole as any);
          router.push(dashboardPath);
        } catch (err) {
          console.error('Redirect error:', err);
          setError('Failed to redirect to dashboard. Please try again.');
        }
      }
    }
  }, [session, status, router]);

  // Show loading state only when actually loading
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

  // If there's an error, show it
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="text-center max-w-md px-4">
          <div className="text-4xl font-bold mb-4 text-primary tracking-tight">TE-Sales Tracker</div>
          <div className="alert alert-error mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="btn btn-primary"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // If not loading and no session, redirect to login (this should happen via useEffect)
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="text-center max-w-md px-4">
          <div className="text-4xl font-bold mb-4 text-primary tracking-tight">TE-Sales Tracker</div>
          <p className="text-gray-600 mb-8">Redirecting to login...</p>
          <div className="flex justify-center mb-8">
            <Image src="/logo.jpg" alt="TE-Sales Tracker" width={80} height={80} className="rounded-lg shadow" />
          </div>
        </div>
      </div>
    );
  }

  // If we have a session but haven't redirected yet, show a simple redirect message
  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg p-4">
      <div className="text-center max-w-md w-full">
        <div className="inline-flex items-center justify-center w-20 h-20 mb-6 animate-fade-in">
          <Image src="/logo.jpg" alt="TE-Sales Tracker" width={80} height={80} className="rounded-2xl shadow-lg" />
        </div>
        <h1 className="text-4xl font-bold mb-4 text-gray-900 tracking-tight animate-fade-in">TE-Sales Tracker</h1>
        <p className="text-gray-600 mb-8 animate-fade-in delay-100">Redirecting to your dashboard...</p>
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