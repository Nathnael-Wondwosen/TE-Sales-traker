'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import InteractionTable from './components/InteractionTable';
import SupervisorCustomerTable from './components/CustomerTable';

type InteractionLite = {
  _id?: string;
  agentId: string;
  agentName: string;
  customerId: string;
  followUpStatus: string;
  callStatus: string;
  date: string;
};

type AgentStat = {
  agentId: string;
  agentName: string;
  customerCount: number;
};

type PendingFollowUpStat = {
  agentId: string;
  pendingCount: number;
};

export default function SupervisorPage() {
  const { data: session, status } = useSession();
  const [allInteractions, setAllInteractions] = useState<InteractionLite[]>([]);
  const [agentStats, setAgentStats] = useState<AgentStat[]>([]);
  const [pendingFollowUpStats, setPendingFollowUpStats] = useState<PendingFollowUpStat[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoadingAgents(true);
        const res = await fetch('/api/interactions', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        if (json?.success && Array.isArray(json.data)) {
          setAllInteractions(json.data as InteractionLite[]);
        }
      } finally {
        setLoadingAgents(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/agent-stats', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        if (json?.success && Array.isArray(json.data)) {
          setAgentStats(json.data as AgentStat[]);
        }
      } catch (error) {
        console.error('Error fetching agent stats:', error);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/pending-follow-ups', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        if (json?.success && Array.isArray(json.data)) {
          setPendingFollowUpStats(json.data as PendingFollowUpStat[]);
        }
      } catch (error) {
        console.error('Error fetching pending follow-ups stats:', error);
      }
    })();
  }, []);

  // Calculate total customers across all agents
  const totalCustomers = useMemo(() => {
    return agentStats.reduce((sum, agent) => sum + agent.customerCount, 0);
  }, [agentStats]);

  // Create a map for quick lookup of pending follow-ups by agent
  const pendingFollowUpsMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const stat of pendingFollowUpStats) {
      map.set(stat.agentId, stat.pendingCount);
    }
    return map;
  }, [pendingFollowUpStats]);

  // Calculate total pending follow-ups
  const totalPendingFollowUps = useMemo(() => {
    let total = 0;
    for (const stat of pendingFollowUpStats) {
      total += stat.pendingCount;
    }
    return total;
  }, [pendingFollowUpStats]);
  
  if (status === 'loading') {
    return <div className="p-6 flex justify-center items-center h-64">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-lg text-gray-500 dark:text-gray-400">Loading dashboard...</p>
      </div>
    </div>;
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
      <div className="mb-6 rounded-xl p-5 shadow-lg relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--header-gradient-from), var(--header-gradient-via), var(--header-gradient-to))',
        }}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJ3YXZlIiB3aWR0aD0iNjAiIGhlaWdodD0iMjAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxwYXRoIGQ9Ik0wIDEwQzE1IDE1LCAzMCA1LCA2MCAxMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI3dhdmUpIi8+PC9zdmc+')]"></div>
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold drop-shadow-lg text-white tracking-tight">Supervisor Dashboard</h1>
          <div className="mt-2 h-1 w-36 rounded-full bg-gradient-to-r from-white via-blue-200 to-transparent"></div>
          <p className="mt-3 text-lg text-white/90 drop-shadow">Welcome back, <span className="font-semibold">{session?.user?.name}</span></p>
          <div className="mt-2 h-0.5 w-28 rounded-full bg-gradient-to-r from-white/80 to-transparent"></div>
        </div>
      </div>
      
      {/* Agent cards grid */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Agents</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          <button
            key="all-agents"
            onClick={() => setSelectedAgentId(null)}
            className={`rounded-xl border border-amber-200 dark:border-amber-700 p-3 text-left bg-white dark:bg-amber-50 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden ${selectedAgentId === null ? 'ring-2 ring-amber-500 border-amber-500' : ''}`}
          >
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 opacity-10 -translate-y-8 translate-x-8"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 opacity-5 translate-y-12 -translate-x-12"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start">
                <div className="text-xs text-amber-700 dark:text-amber-800 font-medium">All Agents</div>
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-600"></div>
              </div>
              <div className="mt-2 text-xl font-bold text-amber-900 dark:text-amber-900">{totalCustomers}</div>
              <div className="mt-1 flex items-center text-xs text-amber-700 dark:text-amber-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {totalPendingFollowUps} pending
              </div>
              <div className="mt-2 h-1 w-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"></div>
            </div>
          </button>
          {agentStats.map(agent => (
            <button
              key={agent.agentId}
              onClick={() => setSelectedAgentId(agent.agentId)}
              className={`rounded-xl border border-amber-200 dark:border-amber-700 p-3 text-left bg-white dark:bg-amber-50 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden ${selectedAgentId === agent.agentId ? 'ring-2 ring-amber-500 border-amber-500' : ''}`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 opacity-10 -translate-y-8 translate-x-8"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 opacity-5 translate-y-12 -translate-x-12"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start">
                  <div className="text-xs text-amber-700 dark:text-amber-800 font-medium truncate">{agent.agentName}</div>
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-600"></div>
                </div>
                <div className="mt-2 text-xl font-bold text-amber-900 dark:text-amber-900">{agent.customerCount}</div>
                <div className="mt-1 flex items-center text-xs text-amber-700 dark:text-amber-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {pendingFollowUpsMap.get(agent.agentId) || 0} pending
                </div>
                <div className="mt-2 h-1 w-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"></div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="card mb-6 card-hover">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Customers</h2>
        </div>
        <div className="card-body">
          <SupervisorCustomerTable agentIdOverride={selectedAgentId || undefined} />
        </div>
      </div>
      
    </div>
  );
}