'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import UserManagement from './components/UserManagement';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Interaction {
  _id: string;
  customerId: string;
  agentId: string;
  callDuration: number;
  followUpStatus: string;
  note: string;
  callStatus: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  contactTitle: string;
  createdAt: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [analyticsData, setAnalyticsData] = useState({
    totalUsers: 0,
    pendingFollowUps: 0,
    completedFollowUps: 0,
    totalProspects: 0,
    activeAgents: 0,
    recentCustomers: 0
  });
  const [loading, setLoading] = useState(true);
  const [followupTrendData, setFollowupTrendData] = useState<{ month: string; pending: number; completed: number }[]>([]);
  const [agentPerformanceData, setAgentPerformanceData] = useState<{ agentId: string; agentName: string; calls: number; avgDurationSec: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch users
        const usersRes = await fetch('/api/users');
        const usersData: { success: boolean; data: User[] } = await usersRes.json();
        
        // Fetch customers for prospect data
        const customersRes = await fetch('/api/customers');
        const customersData: { success: boolean; data: Customer[] } = await customersRes.json();
        
        // Fetch interactions for follow-up data
        const interactionsRes = await fetch('/api/interactions');
        const interactionsData: { success: boolean; data: Interaction[] } = await interactionsRes.json();
        
        // Process the data
        let pendingFollowUps = 0;
        let completedFollowUps = 0;
        let totalProspects = 0;
        let recentCustomers = 0;
        
        // Count unique customers with pending and completed follow-ups
        const customersWithPending = new Set<string>();
        const customersWithCompleted = new Set<string>();
        const recentCustomerIds = new Set<string>();
        
        if (interactionsData.success && Array.isArray(interactionsData.data)) {
          const interactions = interactionsData.data;
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          
          interactions.forEach((interaction: Interaction) => {
            // Track customers with pending follow-ups
            if (interaction.followUpStatus === 'pending' || interaction.followUpStatus === 'in-progress') {
              customersWithPending.add(interaction.customerId);
            } 
            // Track customers with completed follow-ups
            else if (interaction.followUpStatus === 'completed') {
              customersWithCompleted.add(interaction.customerId);
            }
            
            // Track recent customers (interactions in the last week)
            if (new Date(interaction.date) > oneWeekAgo) {
              recentCustomerIds.add(interaction.customerId);
            }
          });
          
          pendingFollowUps = customersWithPending.size;
          completedFollowUps = customersWithCompleted.size;
          recentCustomers = recentCustomerIds.size;
          
          // Build last 6 months follow-up trends (by interaction.date)
          const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
          const monthLabel = (d: Date) => d.toLocaleString(undefined, { month: 'short' });
          const now = new Date();
          const months: string[] = [];
          const monthDates: Date[] = [];
          for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(monthKey(d));
            monthDates.push(d);
          }
          const monthAgg: Record<string, { pending: number; completed: number }> = Object.fromEntries(months.map(m => [m, { pending: 0, completed: 0 }]));
          for (const ix of interactions) {
            const d = new Date(ix.date);
            const key = monthKey(new Date(d.getFullYear(), d.getMonth(), 1));
            if (monthAgg[key]) {
              if (ix.followUpStatus === 'pending' || ix.followUpStatus === 'in-progress') monthAgg[key].pending++;
              if (ix.followUpStatus === 'completed') monthAgg[key].completed++;
            }
          }
          setFollowupTrendData(monthDates.map(d => ({ month: monthLabel(d), pending: monthAgg[monthKey(d)].pending, completed: monthAgg[monthKey(d)].completed })));
          
          // Build agent performance: calls count and average duration
          const agentMap: Record<string, { calls: number; totalDuration: number }> = {};
          for (const ix of interactions) {
            const a = ix.agentId;
            if (!agentMap[a]) agentMap[a] = { calls: 0, totalDuration: 0 };
            agentMap[a].calls += 1;
            agentMap[a].totalDuration += (ix.callDuration || 0);
          }
          const agentsOnly = (usersData.success ? usersData.data.filter(u => u.role === 'agent') : []) as User[];
          const nameById = Object.fromEntries(agentsOnly.map(u => [u._id, u.name]));
          const perf = Object.entries(agentMap).map(([agentId, v]) => ({
            agentId,
            agentName: nameById[agentId] || agentId.slice(0, 6),
            calls: v.calls,
            avgDurationSec: v.calls > 0 ? Math.round(v.totalDuration / v.calls) : 0,
          })).sort((a,b) => b.calls - a.calls).slice(0, 8);
          setAgentPerformanceData(perf);
        }
        
        // Count total prospects (customers created in the last week)
        if (customersData.success && Array.isArray(customersData.data)) {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          
          totalProspects = customersData.data.filter((customer: Customer) => {
            const customerDate = new Date(customer.createdAt);
            return customerDate > oneWeekAgo;
          }).length;
        }
        
        // Count active agents (users with agent role)
        let activeAgents = 0;
        if (usersData.success && Array.isArray(usersData.data)) {
          activeAgents = usersData.data.filter((user: User) => user.role === 'agent').length;
        }
        
        setAnalyticsData({
          totalUsers: usersData.success && Array.isArray(usersData.data) ? usersData.data.length : 0,
          pendingFollowUps,
          completedFollowUps,
          totalProspects,
          activeAgents,
          recentCustomers
        });
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (status === 'loading') {
    return <div className="p-6 flex justify-center items-center h-64">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-lg text-gray-500">Loading dashboard...</p>
      </div>
    </div>;
  }

  if (!session) {
    return <div className="p-6">
      <div className="alert alert-error">You must be signed in to view this page.</div>
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
          <h1 className="text-3xl font-bold drop-shadow-lg text-white tracking-tight">Admin Dashboard</h1>
          <div className="mt-2 h-1 w-36 rounded-full bg-gradient-to-r from-white via-blue-200 to-transparent"></div>
          <p className="mt-3 text-lg text-white/90 drop-shadow">Welcome back, <span className="font-semibold">{session?.user?.name}</span></p>
          <div className="mt-2 h-0.5 w-28 rounded-full bg-gradient-to-r from-white/80 to-transparent"></div>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">System Analytics</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card card-hover animate-pulse">
                <div className="card-body">
                  <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-gray-200 dark:bg-gray-700 mr-4 h-12 w-12"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="card card-hover">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/50 mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.totalUsers}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="card card-hover">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/50 mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Customers Needing Follow-up</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.pendingFollowUps}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="card card-hover">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/50 mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Customers With Completed Follow-ups</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.completedFollowUps}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="card card-hover">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/50 mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Active Agents</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.activeAgents}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="card card-hover">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">New Prospects (7 days)</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.totalProspects}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="card card-hover">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Recent Customer Interactions</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.recentCustomers}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Charts Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Sales Performance</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card card-hover">
            <div className="card-header">
              <h3 className="font-medium">Monthly Follow-up Trends</h3>
            </div>
            <div className="card-body">
              <div className="h-64 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 flex flex-col">
                <div className="flex-1 flex items-end gap-3">
                  {followupTrendData.map((m, idx) => {
                    const maxVal = Math.max(1, ...followupTrendData.map(v => Math.max(v.pending, v.completed)));
                    const barPending = Math.round((m.pending / maxVal) * 100);
                    const barCompleted = Math.round((m.completed / maxVal) * 100);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center">
                        <div className="flex items-end gap-1 w-full">
                          <div className="flex-1 bg-amber-400/70 hover:bg-amber-400 transition rounded-t-sm" style={{ height: `${barPending}%` }} title={`Pending: ${m.pending}`}></div>
                          <div className="flex-1 bg-green-500/70 hover:bg-green-500 transition rounded-t-sm" style={{ height: `${barCompleted}%` }} title={`Completed: ${m.completed}`}></div>
                        </div>
                        <div className="mt-2 text-[11px] text-gray-600 dark:text-gray-300">{m.month}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-1"><span className="inline-block h-2 w-2 bg-amber-400 rounded-sm"></span> Pending</div>
                  <div className="flex items-center gap-1"><span className="inline-block h-2 w-2 bg-green-500 rounded-sm"></span> Completed</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="card card-hover">
            <div className="card-header">
              <h3 className="font-medium">Agent Performance</h3>
            </div>
            <div className="card-body">
              <div className="h-64 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 flex flex-col">
                <div className="flex-1 flex items-end gap-3 overflow-x-auto">
                  {agentPerformanceData.map((a, idx) => {
                    const maxCalls = Math.max(1, ...agentPerformanceData.map(v => v.calls));
                    const h = Math.round((a.calls / maxCalls) * 100);
                    return (
                      <div key={idx} className="min-w-[48px] flex flex-col items-center">
                        <div className="w-8 bg-blue-500/70 hover:bg-blue-500 transition rounded-t-sm" style={{ height: `${h}%` }} title={`${a.agentName}: ${a.calls} calls, avg ${Math.floor(a.avgDurationSec/60)}m ${(a.avgDurationSec%60).toString().padStart(2,'0')}s`}></div>
                        <div className="mt-2 text-[11px] text-gray-600 dark:text-gray-300 truncate w-10 text-center" title={a.agentName}>{a.agentName.split(' ')[0]}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 text-xs text-gray-600 dark:text-gray-300">Bar height = total calls; tooltip shows avg call duration.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Management Section */}
      <div className="card mb-6 card-hover">
        <div className="card-header">
          <h2 className="text-xl font-semibold">User Management</h2>
        </div>
        <div className="card-body">
          <UserManagement />
        </div>
      </div>

      {/* System Status */}
      <div className="card card-hover">
        <div className="card-header">
          <h2 className="text-xl font-semibold">System Status</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="mr-3 p-2 bg-green-100 dark:bg-green-900/50 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Database</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Operational</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="mr-3 p-2 bg-green-100 dark:bg-green-900/50 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">API Services</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">All Systems Go</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="mr-3 p-2 bg-green-100 dark:bg-green-900/50 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Authentication</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Secure</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}