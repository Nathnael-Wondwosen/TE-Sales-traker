'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export default function TestSessionPage() {
  const { data: session, status } = useSession();

  useEffect(() => {
    console.log('Session status:', status);
    console.log('Session data:', session);
  }, [session, status]);

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Session Debug Page</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="mb-2"><strong>Status:</strong> {status}</p>
        {session ? (
          <div>
            <p className="mb-2"><strong>User:</strong> {session.user?.name}</p>
            <p className="mb-2"><strong>Email:</strong> {session.user?.email}</p>
            <p className="mb-2"><strong>Role:</strong> {(session.user as any)?.role}</p>
            <pre className="bg-gray-100 p-4 rounded mt-4">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        ) : (
          <p>No session data available</p>
        )}
      </div>
    </div>
  );
}