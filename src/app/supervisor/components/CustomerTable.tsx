'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Customer, Interaction } from '@/lib/models';

interface CustomerWithInteractions extends Customer {
  interactions: Interaction[];
  agentName?: string; // Add agent name to the customer data
  latestInteraction?: Interaction; // Add latest interaction property
}

export default function SupervisorCustomerTable({ agentIdOverride }: { agentIdOverride?: string } = {}) {
  const { data: session } = useSession();
  const [customers, setCustomers] = useState<CustomerWithInteractions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{ supervisorComment?: string }>({});
  // Notion/HubSpot-style controls
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'new'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'lastInteraction'>('lastInteraction');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'last7' | 'last30' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'monthPick' | 'weekPick' | 'custom'>('all');
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [monthValue, setMonthValue] = useState<string>('');
  const [weekValue, setWeekValue] = useState<string>('');
  const [callStatusFilter, setCallStatusFilter] = useState<'all' | 'scheduled' | 'called' | 'not-reached' | 'busy' | 'voicemail'>('all');
  const [followUpFilter, setFollowUpFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed' | 'closed'>('all');
  const [visibleCols, setVisibleCols] = useState({
    agent: true,
    phone: true,
    callTitle: true,
    customer: true,
    date: true,
    duration: true,
    callStatus: true,
    followUp: true,
    notes: true,
    email: true,
    supervisorComment: true,
    actions: true,
  });

  useEffect(() => {
    fetchCustomers();
  }, [agentIdOverride ?? '']);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const qs = new URLSearchParams({ withLatest: 'true' });
      if (agentIdOverride) qs.set('agentId', agentIdOverride);
      const res = await fetch(`/api/customers?${qs.toString()}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch customers');
      }

      // Map the customers data to include interactions properly
      const customersWithInteractions: CustomerWithInteractions[] = data.data.map((c: any) => ({
        ...c,
        interactions: c.latestInteraction ? [c.latestInteraction] : [],
      }));

      setCustomers(customersWithInteractions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (customer: CustomerWithInteractions) => {
    const latest = customer.interactions[0];
    setEditingCustomerId(customer._id?.toString() || null);
    setEditFormData({
      supervisorComment: latest?.supervisorComment || ''
    });
  };

  const handleInputChange = (value: string) => {
    setEditFormData({ supervisorComment: value });
  };

  const handleSaveEdit = async () => {
    try {
      if (!editingCustomerId) return;
      
      const target = customers.find(c => (c._id?.toString() || '') === editingCustomerId);
      const latest = target?.interactions?.[0];
      let ok = false;
      if (latest && (latest as any)._id) {
        // Supervisors/Admins update existing interaction via PUT
        const res = await fetch('/api/interactions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: (latest as any)._id, supervisorComment: editFormData.supervisorComment || '' }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update comment');
        ok = true;
      } else {
        // No existing interaction; only admin/agent can create a new one
        if (session?.user?.role === 'admin') {
          const payload = {
            customerId: editingCustomerId,
            agentId: (target as any)?.agentId || session?.user?.id,
            date: new Date().toISOString(),
            supervisorComment: editFormData.supervisorComment || '',
            callDuration: 0,
            followUpStatus: 'pending',
            callStatus: 'called',
            note: ''
          };
          const res = await fetch('/api/interactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data.message || 'Failed to create interaction');
          ok = true;
        } else {
          throw new Error('No prior interaction to comment on. Ask an agent/admin to record an interaction first.');
        }
      }

      // Update the customer's interaction in the local state
      setCustomers(prev => prev.map(c => {
        if ((c._id?.toString() || '') !== editingCustomerId) return c;
        return { 
          ...c, 
          interactions: [{ 
            ...c.interactions[0], 
            supervisorComment: editFormData.supervisorComment || '' 
          }] 
        };
      }));
      
      setEditingCustomerId(null);
      setEditFormData({});
      // Re-fetch to ensure the latest interaction (with supervisor comment and server-side fields) is reflected
      await fetchCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleCancelEdit = () => {
    setEditingCustomerId(null);
    setEditFormData({});
  };

  const getLastInteractionDate = (interactions: Interaction[]) => {
    if (interactions.length === 0) return 'No interactions';
    return new Date(interactions[0].date).toLocaleDateString();
  };

  const getStatusBadge = (interactions: Interaction[]) => {
    const hasInteractions = interactions.length > 0;
    return (
      <span className={`badge ${hasInteractions ? 'badge-success' : 'badge-warning'}`}>
        {hasInteractions ? 'Active' : 'New'}
      </span>
    );
  };

  const getCallStatusBadge = (status?: Interaction['callStatus']) => {
    const map: Record<string, string> = {
      'called': 'badge-success',
      'scheduled': 'badge-info',
      'not-reached': 'badge-warning',
      'busy': 'badge-warning',
      'voicemail': 'badge-secondary',
    };
    const labelMap: Record<string, string> = {
      'called': 'Completed',
      'scheduled': 'Scheduled',
      'not-reached': 'Not Reached',
      'busy': 'Busy',
      'voicemail': 'Voicemail',
    };
    if (!status) return <span className="badge badge-secondary">-</span>;
    return <span className={`badge ${map[status] || 'badge-secondary'}`}>{labelMap[status] || status}</span>;
  };

  // Derived: filter, search, sort, and paginate
  const { paged, total, totalPages, currentPage, filteredAll } = useMemo(() => {
    const normalized = customers.map(c => ({
      ...c,
      lastInteractionAt: c.interactions[0]?.date ? new Date(c.interactions[0].date).getTime() : 0,
      isActive: c.interactions.length > 0,
    }));

    const q = query.trim().toLowerCase();
    const searched = q
      ? normalized.filter(c =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q) ||
          (c.contactTitle || '').toLowerCase().includes(q)
        )
      : normalized;

    // Date range filter based on latest interaction date
    const now = new Date();
    let startMs: number | null = null;
    let endMs: number | null = null;
    if (datePreset === 'today') {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const e = new Date(s); e.setDate(e.getDate() + 1);
      startMs = s.getTime(); endMs = e.getTime();
    } else if (datePreset === 'last7') {
      const e = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const s = new Date(e); s.setDate(s.getDate() - 7);
      startMs = s.getTime(); endMs = e.getTime();
    } else if (datePreset === 'last30') {
      const e = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const s = new Date(e); s.setDate(s.getDate() - 30);
      startMs = s.getTime(); endMs = e.getTime();
    } else if (datePreset === 'thisWeek') {
      const day = now.getDay();
      const diff = (day + 6) % 7; // start Monday
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      s.setDate(s.getDate() - diff);
      const e = new Date(s); e.setDate(e.getDate() + 7);
      startMs = s.getTime(); endMs = e.getTime();
    } else if (datePreset === 'thisMonth') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      startMs = s.getTime(); endMs = e.getTime();
    } else if (datePreset === 'thisYear') {
      const s = new Date(now.getFullYear(), 0, 1);
      const e = new Date(now.getFullYear() + 1, 0, 1);
      startMs = s.getTime(); endMs = e.getTime();
    } else if (datePreset === 'monthPick' && monthValue) {
      const [yStr, mStr] = monthValue.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10) - 1;
      const s = new Date(y, m, 1);
      const e = new Date(y, m + 1, 1);
      startMs = s.getTime(); endMs = e.getTime();
    } else if (datePreset === 'weekPick' && weekValue) {
      const [yStr, wStr] = weekValue.split('-W');
      const y = parseInt(yStr, 10);
      const w = parseInt(wStr, 10);
      const simple = new Date(y, 0, 1 + (w - 1) * 7);
      const dow = (simple.getDay() + 6) % 7; // 0=Mon..6=Sun
      const monday = new Date(simple);
      monday.setDate(simple.getDate() - dow);
      const nextMonday = new Date(monday);
      nextMonday.setDate(monday.getDate() + 7);
      startMs = monday.getTime(); endMs = nextMonday.getTime();
    } else if (datePreset === 'custom' && dateStart && dateEnd) {
      const s = new Date(dateStart);
      const e = new Date(dateEnd);
      e.setDate(e.getDate() + 1);
      startMs = s.getTime(); endMs = e.getTime();
    }

    const dateFiltered = searched.filter(c => {
      if (startMs == null || endMs == null) return true;
      if (!c.lastInteractionAt) return false;
      return c.lastInteractionAt >= startMs && c.lastInteractionAt < endMs;
    });

    // Latest interaction status filters
    const statusFiltered = dateFiltered.filter(c => {
      const latest = c.interactions[0];
      if (callStatusFilter !== 'all') {
        if (!latest || latest.callStatus !== callStatusFilter) return false;
      }
      if (followUpFilter !== 'all') {
        if (!latest || latest.followUpStatus !== followUpFilter) return false;
      }
      return true;
    });

    const filtered = statusFiltered.filter(c => {
      if (filterStatus === 'all') return true;
      return filterStatus === 'active' ? c.isActive : !c.isActive;
    });

    const sortedArr = filtered.sort((a, b) => {
      if (sortBy === 'name') {
        const av = (a.name || '').toLowerCase();
        const bv = (b.name || '').toLowerCase();
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const av = a.lastInteractionAt;
      const bv = b.lastInteractionAt;
      return sortDir === 'asc' ? av - bv : bv - av;
    });

    const total = sortedArr.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const paged = sortedArr.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    return { paged, total, totalPages, currentPage, filteredAll: sortedArr };
  }, [customers, query, filterStatus, sortBy, sortDir, page, pageSize, datePreset, dateStart, dateEnd, monthValue, weekValue, callStatusFilter, followUpFilter]);

  const handleExportCsv = () => {
    const rows = (filteredAll || []).map(c => {
      const latest = c.interactions[0];
      return {
        Agent: c.agentName || '',
        Name: c.name || '',
        Phone: c.phone || '',
        Email: c.email || '',
        ContactTitle: c.contactTitle || '',
        LastInteractionDate: latest?.date ? new Date(latest.date).toISOString() : '',
        CallStatus: latest?.callStatus || '',
        FollowUpStatus: latest?.followUpStatus || '',
        DurationSeconds: latest?.callDuration ?? '',
        Note: latest?.note || '',
      };
    });
    const headers = Object.keys(rows[0] || { Agent:'', Name: '', Phone: '', Email: '', ContactTitle: '', LastInteractionDate: '', CallStatus: '', FollowUpStatus: '', DurationSeconds: '', Note: '' });
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => {
      const val = (r as any)[h] ?? '';
      const s = String(val).replace(/"/g, '""');
      return '"' + s + '"';
    }).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'supervisor_customers.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Reset to first page when filters or search change
  useEffect(() => {
    setPage(1);
  }, [query, filterStatus, datePreset, dateStart, dateEnd, monthValue, weekValue, callStatusFilter, followUpFilter]);

  if (loading) {
    return <div className="p-6">Loading customers...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="alert alert-error flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-card-border dark:border-gray-700 bg-card-bg dark:bg-gray-800 shadow-sm w-full">
      {/* Toolbar */}
      <div className="px-4 py-3 bg-gray-50/70 dark:bg-gray-700/50 border-b border-card-border dark:border-gray-700 flex flex-col gap-3">
        {/* Top row: Search (left) and actions (right) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-auto max-w-xs sm:max-w-sm">
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search customers, email, phone..."
              className="form-input w-full h-9 text-sm pl-9 pr-3 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <svg className="absolute left-3 top-2 h-4 w-4 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <details className="group">
                <summary className="btn btn-outline text-sm cursor-pointer select-none">Columns</summary>
                <div className="absolute mt-2 right-0 w-64 bg-card-bg dark:bg-gray-800 border border-card-border dark:border-gray-700 rounded-lg shadow-lg p-2 z-10">
                  {(
                    [
                      ['agent','Agent'],
                      ['phone','Phone'],
                      ['callTitle','Call Title'],
                      ['customer','Customer'],
                      ['date','Date'],
                      ['duration','Duration'],
                      ['callStatus','Call Status'],
                      ['followUp','Follow-up'],
                      ['notes','Notes'],
                      ['email','Email'],
                      ['supervisorComment','Supervisor Comment'],
                      ['actions','Actions'],
                    ] as [keyof typeof visibleCols, string][]
                  ).map(([key,label]) => (
                    <label key={key} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                      <input
                        type="checkbox"
                        checked={(visibleCols as any)[key]}
                        onChange={() => setVisibleCols(prev => ({ ...prev, [key]: !(prev as any)[key] }))}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                    </label>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </div>

        {/* Advanced Filters - Single-line, horizontally scrollable (match Agent style) */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-800 overflow-x-auto whitespace-nowrap">
          <div className="flex items-center gap-2">
            {/* Date Filters Group */}
            <div className="flex items-center gap-1 shrink-0">
              <select
                className="form-input !w-auto min-w-[8rem] h-8 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded shrink-0"
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value as any)}
                title="Date filter"
              >
                <option value="all">All time</option>
                <option value="thisWeek">This week</option>
                <option value="thisMonth">This month</option>
                <option value="thisYear">This year</option>
                <option value="monthPick">Pick month…</option>
                <option value="weekPick">Pick week…</option>
                <option value="custom">Custom…</option>
              </select>
              {datePreset === 'custom' && (
                <>
                  <input type="date" className="form-input !w-auto min-w-[8rem] h-8 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded shrink-0" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">to</span>
                  <input type="date" className="form-input !w-auto min-w-[8rem] h-8 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded shrink-0" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
                </>
              )}
              {datePreset === 'monthPick' && (
                <input
                  type="month"
                  className="form-input !w-auto min-w-[8rem] h-8 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded shrink-0"
                  value={monthValue}
                  onChange={(e) => setMonthValue(e.target.value)}
                />
              )}
              {datePreset === 'weekPick' && (
                <input
                  type="week"
                  className="form-input !w-auto min-w-[8rem] h-8 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded shrink-0"
                  value={weekValue}
                  onChange={(e) => setWeekValue(e.target.value)}
                />
              )}
            </div>

            {/* Status Filters */}
            <div className="flex items-center gap-1 shrink-0">
              <select
                className="form-input !w-auto min-w-[9rem] h-8 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded shrink-0"
                value={callStatusFilter}
                onChange={(e) => setCallStatusFilter(e.target.value as any)}
                title="Call status"
              >
                <option value="all">All calls</option>
                <option value="scheduled">Scheduled</option>
                <option value="called">Completed</option>
                <option value="not-reached">Not Reached</option>
                <option value="busy">Busy</option>
                <option value="voicemail">Voicemail</option>
              </select>
              <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-600 inline-block align-middle" />
              <select
                className="form-input !w-auto min-w-[10rem] h-8 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded shrink-0"
                value={followUpFilter}
                onChange={(e) => setFollowUpFilter(e.target.value as any)}
                title="Follow-up status"
              >
                <option value="all">All follow-ups</option>
                <option value="pending">Needs</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="closed">Canceled</option>
              </select>
            </div>

            {/* Customer Status and Sort Controls */}
            <div className="flex items-center gap-1 shrink-0">
              <select
                className="form-input !w-auto min-w-[8rem] h-8 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded shrink-0"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
              >
                <option value="all">All customers</option>
                <option value="active">Active</option>
                <option value="new">New</option>
              </select>
              <select
                className="form-input !w-auto min-w-[10rem] h-8 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded shrink-0"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                title="Sort by"
              >
                <option value="lastInteraction">Last Interaction</option>
                <option value="name">Name</option>
              </select>
              <button
                className="btn btn-outline btn-xs px-1 h-8 rounded shrink-0"
                onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
                title="Toggle sort direction"
                aria-label="Toggle sort direction"
              >
                {sortDir === 'asc' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M3 7l7-7 7 7H3z"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M17 13l-7 7-7-7h14z"/></svg>
                )}
              </button>
            </div>
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-600 inline-block align-middle" />
              <button
                className="inline-flex items-center gap-1 h-8 text-xs px-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm whitespace-nowrap shrink-0"
                onClick={() => {
                  setDatePreset('all');
                  setDateStart('');
                  setDateEnd('');
                  setMonthValue('');
                  setWeekValue('');
                  setCallStatusFilter('all');
                  setFollowUpFilter('all');
                  setFilterStatus('all');
                  setPage(1);
                }}
                title="Reset filters"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a8 8 0 111.172 11.657l1.414-1.414A6 6 0 1010 4V1L6 5l4 4V6a4 4 0 11-2.828 6.828l-1.414 1.414A6 6 0 1010 2a8 8 0 00-6 2z" clipRule="evenodd"/></svg>
                Reset
              </button>
              <button
                className="inline-flex items-center gap-1 h-8 text-xs px-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm whitespace-nowrap shrink-0"
                onClick={handleExportCsv}
                title="Export filtered as CSV"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H9a2 2 0 00-2 2v12a2 2 0 002 2zm6-9h2a2 2 0 012 2v3a2 2 0 01-2 2H9a2 2 0 01-2-2v-3a2 2 0 012-2h2a2 2 0 012 2v3a2 2 0 01-2 2H9a2 2 0 01-2-2v-3a2 2 0 012-2h2zM11 8h2v3h-2V8zm-4 0h2v3H7V8zm-4 0h2v3H3V8z" /></svg>
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50/50 dark:bg-gray-700/50 sticky top-0 z-0">
            <tr>
              {visibleCols.agent && (<th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--table-header-text-color)] dark:text-gray-400 uppercase tracking-wider">Agent</th>)}
              {visibleCols.phone && (<th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--table-header-text-color)] dark:text-gray-400 uppercase tracking-wider">Phone</th>)}
              {visibleCols.callTitle && (<th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--table-header-text-color)] dark:text-gray-400 uppercase tracking-wider">Call Title</th>)}
              {visibleCols.customer && (<th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--table-header-text-color)] dark:text-gray-400 uppercase tracking-wider">Customer</th>)}
              {visibleCols.date && (<th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--table-header-text-color)] dark:text-gray-400 uppercase tracking-wider">Date</th>)}
              {visibleCols.duration && (<th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--table-header-text-color)] dark:text-gray-400 uppercase tracking-wider">Duration</th>)}
              {visibleCols.callStatus && (<th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--table-header-text-color)] dark:text-gray-400 uppercase tracking-wider">Call Status</th>)}
              {visibleCols.followUp && (<th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--table-header-text-color)] dark:text-gray-400 uppercase tracking-wider">Follow-up</th>)}
              {visibleCols.notes && (<th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--table-header-text-color)] dark:text-gray-400 uppercase tracking-wider">Notes</th>)}
              {visibleCols.email && (<th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--table-header-text-color)] dark:text-gray-400 uppercase tracking-wider">Email</th>)}
              {visibleCols.supervisorComment && (<th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--table-header-text-color)] dark:text-gray-400 uppercase tracking-wider">Supervisor Comment</th>)}
              {visibleCols.actions && (<th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--table-header-text-color)] dark:text-gray-400 uppercase tracking-wider">Actions</th>)}
            </tr>
          </thead>
          <tbody className="bg-card-bg dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {paged.map((customer) => (
              <tr key={customer._id?.toString() || `customer-${Math.random()}`} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors duration-150">
                {editingCustomerId === (customer._id?.toString() || '') ? (
                  <>
                    {visibleCols.agent && (<td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{customer.agentName || 'Unknown Agent'}</td>)}
                    {visibleCols.phone && (<td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{customer.phone || '-'}</td>)}
                    {visibleCols.callTitle && (<td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{customer.contactTitle || '-'}</td>)}
                    {visibleCols.customer && (<td className="px-3 py-2"><div className="flex items-center gap-2"><div className="text-sm font-medium text-gray-900 dark:text-white">{customer.name}</div></div></td>)}
                    {visibleCols.date && (<td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">{getLastInteractionDate(customer.interactions)}</td>)}
                    {visibleCols.duration && (<td className="px-3 py-2 whitespace-nowrap text-xs font-mono text-gray-700 dark:text-gray-300">{customer.interactions[0]?.callDuration ? `${Math.floor(customer.interactions[0].callDuration / 60)}:${(customer.interactions[0].callDuration % 60).toString().padStart(2, '0')}` : '-'}</td>)}
                    {visibleCols.callStatus && (<td className="px-3 py-2 whitespace-nowrap">{getCallStatusBadge(customer.interactions[0]?.callStatus)}</td>)}
                    {visibleCols.followUp && (<td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{customer.interactions[0]?.followUpStatus || '-'}</td>)}
                    {visibleCols.notes && (<td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{customer.interactions[0]?.note || '-'}</td>)}
                    {visibleCols.email && (<td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{customer.email || '-'}</td>)}
                    {visibleCols.supervisorComment && (
                      <td className="px-3 py-2">
                        <div className="flex flex-col space-y-2">
                          <textarea
                            value={editFormData.supervisorComment || ''}
                            onChange={(e) => handleInputChange(e.target.value)}
                            className="form-input text-xs w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            rows={2}
                            placeholder="Supervisor comment"
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={handleSaveEdit}
                              className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 dark:hover:bg-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600 dark:hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    )}
                    {visibleCols.actions && (<td className="px-3 py-2 whitespace-nowrap text-xs font-medium"></td>)}
                  </>
                ) : (
                  <>
                    {visibleCols.agent && (<td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{customer.agentName || 'Unknown Agent'}</td>)}
                    {visibleCols.phone && (<td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{customer.phone || '-'}</td>)}
                    {visibleCols.callTitle && (<td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{customer.contactTitle || '-'}</td>)}
                    {visibleCols.customer && (<td className="px-3 py-2"><div className="flex items-center gap-2"><div className="text-sm font-medium text-gray-900 dark:text-white">{customer.name}</div></div></td>)}
                    {visibleCols.date && (<td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">{getLastInteractionDate(customer.interactions)}</td>)}
                    {visibleCols.duration && (<td className="px-3 py-2 whitespace-nowrap text-xs font-mono text-gray-700 dark:text-gray-300">{customer.interactions[0]?.callDuration ? `${Math.floor(customer.interactions[0].callDuration / 60)}:${(customer.interactions[0].callDuration % 60).toString().padStart(2, '0')}` : '-'}</td>)}
                    {visibleCols.callStatus && (<td className="px-3 py-2 whitespace-nowrap">{getCallStatusBadge(customer.interactions[0]?.callStatus)}</td>)}
                    {visibleCols.followUp && (<td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{customer.interactions[0]?.followUpStatus || '-'}</td>)}
                    {visibleCols.notes && (<td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{customer.interactions[0]?.note || '-'}</td>)}
                    {visibleCols.email && (<td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{customer.email || '-'}</td>)}
                    {visibleCols.supervisorComment && (
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                        <div>
                          {customer.interactions[0]?.supervisorComment || '-'}
                          <button
                            onClick={() => handleEditClick(customer)}
                            className="block mt-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          >
                            {customer.interactions[0]?.supervisorComment ? 'Edit' : 'Add Comment'}
                          </button>
                        </div>
                      </td>
                    )}
                    {visibleCols.actions && (<td className="px-3 py-2 whitespace-nowrap text-xs font-medium"></td>)}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      <div className="px-4 py-3 bg-gray-50/70 dark:bg-gray-700/50 border-t border-card-border dark:border-gray-700 flex flex-col md:flex-row gap-2 justify-between items-center">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, total)} of {total}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">Rows per page</span>
            <select
              className="form-input text-xs h-8 w-36 md:w-44 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              {[10,20,50].map(n => (<option key={n} value={n}>{n} / page</option>))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button className="btn btn-outline btn-xs px-1" disabled={currentPage === 1} onClick={() => setPage(1)}>{'<<'}</button>
            <button className="btn btn-outline btn-xs px-1" disabled={currentPage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>{'<'}</button>
            <span className="text-xs px-2 text-gray-700 dark:text-gray-300">Page {currentPage} of {totalPages}</span>
            <button className="btn btn-outline btn-xs px-1" disabled={currentPage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>{'>'}</button>
            <button className="btn btn-outline btn-xs px-1" disabled={currentPage === totalPages} onClick={() => setPage(totalPages)}>{'>>'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}