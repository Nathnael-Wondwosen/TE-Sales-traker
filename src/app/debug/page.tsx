'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function DebugPage() {
  const { data: session, status } = useSession();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    setDebugInfo({
      status,
      session: session ? {
        email: session.user?.email,
        name: session.user?.name,
        role: (session.user as any)?.role,
      } : null,
      windowLocation: typeof window !== 'undefined' ? window.location.href : 'Not in browser',
      processEnv: {
        nodeEnv: process.env.NODE_ENV,
        nextAuthUrl: process.env.NEXTAUTH_URL ? 'SET' : 'NOT SET',
      }
    });
  }, [session, status]);

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">Debug Information</h1>
      
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Session Status</h2>
        <p><strong>Status:</strong> {status}</p>
        <p><strong>Session:</strong> {session ? 'Available' : 'Not available'}</p>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Session Details</h2>
        {session ? (
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        ) : (
          <p>No session data available</p>
        )}
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Debug Info</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Troubleshooting Steps</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Check that all environment variables are set correctly in Vercel</li>
          <li>Verify that NEXTAUTH_URL matches your deployment URL exactly</li>
          <li>Check Vercel function logs for any errors</li>
          <li>Try clearing your browser cache and cookies</li>
          <li>Visit /api/health to check if the backend is working</li>
          <li>Visit /api/test-auth to check authentication</li>
        </ol>
      </div>
    </div>
  );
}