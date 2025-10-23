'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import CustomerTable from './components/CustomerTable';
import Image from 'next/image';

export default function AgentPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return null;
  }

  if (!session) {
    return <div className="p-6">
      <div className="alert alert-error flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        You must be signed in to view this page.
      </div>
    </div>;
  }

  return (
    <div className="w-full px-2 sm:px-4 py-6 lg:py-8">
      <div className="mb-3 sm:mb-4 rounded-xl p-4 sm:p-5 shadow-lg relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--header-gradient-from), var(--header-gradient-via), var(--header-gradient-to))',
        }}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJ3YXZlIiB3aWR0aD0iNjAiIGhlaWdodD0iMjAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxwYXRoIGQ9Ik0wIDEwQzE1IDE1LCAzMCA1LCA2MCAxMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI3dhdmUpIi8+PC9zdmc+')]"></div>
        </div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold drop-shadow-lg text-white">Agent Dashboard</h1>
          <div className="mt-2 h-1 w-32 rounded-full bg-gradient-to-r from-white via-blue-200 to-transparent"></div>
          <p className="mt-3 text-white/90 drop-shadow">Manage your customers and track interactions</p>
          <div className="mt-2 h-0.5 w-24 rounded-full bg-gradient-to-r from-white/80 to-transparent"></div>
        </div>
      </div>
      <CustomerTable />
    </div>
  );
}