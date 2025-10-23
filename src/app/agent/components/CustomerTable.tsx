'use client';

import { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import { useSession } from 'next-auth/react';
import { Customer, Interaction } from '@/lib/models';

interface CustomerWithInteractions extends Customer {
  interactions: Interaction[];
}

export default function CustomerTable({ agentIdOverride }: { agentIdOverride?: string } = {}) {
  const { data: session } = useSession();
  const isAgent = (session?.user?.role === 'agent');
  const canEditSupervisor = !isAgent;
  const [customers, setCustomers] = useState<CustomerWithInteractions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Customer>>({});
  const [newCustomer, setNewCustomer] = useState<Partial<Customer> | null>(null);
  const [showAddRow, setShowAddRow] = useState(false);
  const [addingInteractionForCustomer, setAddingInteractionForCustomer] = useState<string | null>(null);
  const [interactionFormData, setInteractionFormData] = useState<Partial<Interaction>>({
    callDuration: 0,
    followUpStatus: 'pending',
    callStatus: 'called',
    note: '',
    supervisorComment: ''
  });
  // Timer for call duration in add/interaction rows
  const durationTimerRef = useRef<number | null>(null);
  const startDurationTimer = () => {
    if (durationTimerRef.current != null) return;
    durationTimerRef.current = window.setInterval(() => {
      setInteractionFormData(prev => ({ ...(prev || {}), callDuration: (prev?.callDuration || 0) + 1 }));
    }, 1000);
  };

  // Safely parse JSON responses; if not JSON, return text for diagnostics
  const parseResponse = async (res: Response) => {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      return { kind: 'json' as const, body: await res.json() };
    }
    return { kind: 'text' as const, body: await res.text() };
  };
  const stopDurationTimer = () => {
    if (durationTimerRef.current != null) {
      window.clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  };
  // Notion/HubSpot-style controls
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'new'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'lastInteraction'>('lastInteraction');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const deferredQuery = useDeferredValue(query);
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'last7' | 'last30' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'monthPick' | 'weekPick' | 'custom'>('all');
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [monthValue, setMonthValue] = useState<string>(''); // YYYY-MM
  const [weekValue, setWeekValue] = useState<string>('');   // YYYY-Www
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
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.entries(selected).filter(([, v]) => v).map(([k]) => k), [selected]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const formRef = useRef<HTMLFormElement>(null);
  const [newDuration, setNewDuration] = useState(0);
  const newDurationTimerRef = useRef<number | null>(null);
  // Row recording state (one at a time for simplicity)
  const [recordingCustomerId, setRecordingCustomerId] = useState<string | null>(null);
  const [recordingStartMs, setRecordingStartMs] = useState<number | null>(null);
  const [recordingElapsedSec, setRecordingElapsedSec] = useState(0);
  const recordingTimerRef = useRef<number | null>(null);
  // Excel-like focus target for edit mode
  const [editFocusField, setEditFocusField] = useState<
    'phone' | 'callTitle' | 'name' | 'email' | 'callStatus' | 'followUp' | 'notes' | 'supervisorComment' | null
  >(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const callTitleRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const callStatusRef = useRef<HTMLSelectElement>(null);
  const followUpRef = useRef<HTMLSelectElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);
  const supervisorCommentRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Do NOT auto-start timer when showing Add Row.
    // Only clear/reset when Add Row closes.
    if (!showAddRow) {
      if (newDurationTimerRef.current != null) {
        window.clearInterval(newDurationTimerRef.current);
        newDurationTimerRef.current = null;
      }
      setNewDuration(0);
    }
    return () => {
      if (newDurationTimerRef.current != null) {
        window.clearInterval(newDurationTimerRef.current);
        newDurationTimerRef.current = null;
      }
    };
  }, [showAddRow]);

  // Manage per-row recording timer
  useEffect(() => {
    if (recordingCustomerId && recordingStartMs != null) {
      if (recordingTimerRef.current == null) {
        recordingTimerRef.current = window.setInterval(() => {
          setRecordingElapsedSec(Math.floor((Date.now() - recordingStartMs) / 1000));
        }, 1000);
      }
    } else {
      if (recordingTimerRef.current != null) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingElapsedSec(0);
    }
    return () => {
      if (recordingTimerRef.current != null) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
  }, [recordingCustomerId, recordingStartMs]);

  const toggleRowRecording = async (customerId: string, customer: CustomerWithInteractions) => {
    if (recordingCustomerId === customerId) {
      // Stop recording and write into interaction form (remain in edit mode)
      const duration = recordingElapsedSec;
      setInteractionFormData(prev => ({ ...(prev || {}), callDuration: duration }));
      setRecordingCustomerId(null);
      setRecordingStartMs(null);
      // Auto-save interaction regardless of edit mode
      try {
        const payload: any = {
          customerId,
          agentId: session?.user?.id,
          date: new Date().toISOString(),
          callDuration: duration,
          callStatus: interactionFormData.callStatus || 'called',
          followUpStatus: interactionFormData.followUpStatus || 'pending',
          note: interactionFormData.note || '',
        };
        if (canEditSupervisor && interactionFormData.supervisorComment) {
          payload.supervisorComment = interactionFormData.supervisorComment;
        }
        const ires = await fetch('/api/interactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (ires.ok) {
          try {
            const ij = await ires.json();
            const newIx = ij.data || ij;
            setCustomers(prev => prev.map(c => {
              if ((c._id?.toString() || '') !== customerId) return c;
              return { ...c, interactions: newIx ? [newIx] : c.interactions };
            }));
          } catch {}
        }
      } catch {}
    } else {
      // Start recording without entering edit mode
      // reset duration in form to avoid stale values
      setInteractionFormData(prev => ({ ...(prev || {}), callDuration: 0 }));
      setRecordingCustomerId(customerId);
      setRecordingStartMs(Date.now());
      setRecordingElapsedSec(0);
    }
  };

  // Focus the intended field when entering edit mode
  useEffect(() => {
    if (!editingCustomerId || !editFocusField) return;
    const map: Record<string, HTMLElement | null | undefined> = {
      phone: phoneRef.current,
      callTitle: callTitleRef.current,
      name: nameRef.current,
      email: emailRef.current,
      callStatus: callStatusRef.current,
      followUp: followUpRef.current,
      notes: notesRef.current,
      supervisorComment: supervisorCommentRef.current,
    };
    const el = map[editFocusField];
    if (el && 'focus' in el) {
      (el as HTMLInputElement | HTMLSelectElement).focus();
    }
  }, [editingCustomerId, editFocusField]);

  useEffect(() => {
    fetchCustomers();
  }, [agentIdOverride ?? '']);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const qs = new URLSearchParams({ withLatest: 'true' });
      if (!isAgent && agentIdOverride) qs.set('agentId', agentIdOverride);
      const res = await fetch(`/api/customers?${qs.toString()}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch customers');
      }

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

  const handleNewCustomerChange = <K extends keyof Customer>(field: K, value: any) => {
    setNewCustomer(prev => ({ ...(prev || {}), [field]: value }));
  };

  const handleSaveNewCustomer = async (overrideInteraction?: Partial<Interaction>) => {
    try {
      if (!newCustomer || !newCustomer.name) return;
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer),
      });
      const parsed = await parseResponse(res);
      if (!res.ok) {
        const msg = parsed.kind === 'json' ? (parsed.body.message || JSON.stringify(parsed.body)) : parsed.body;
        throw new Error(`Create customer failed (${res.status}): ${msg}`);
      }
      const data = parsed.kind === 'json' ? parsed.body : { success: false } as any;
      if (!data.success) throw new Error(data.message || 'Failed to create customer');
      // Try to create an initial interaction tied to this customer
      try {
        const created = data.data || data.customer || {};
        const customerId = created._id || created.id || created.insertedId;
        if (customerId) {
          const createdAtIso = (created.createdAt && typeof created.createdAt === 'string')
            ? created.createdAt
            : (created.createdAt ? new Date(created.createdAt).toISOString() : new Date().toISOString());
          const interactionPayload: any = {
            ...interactionFormData,
            ...(overrideInteraction || {}),
            customerId,
            agentId: session?.user?.id,
            date: createdAtIso,
          };
          if (!canEditSupervisor) delete interactionPayload.supervisorComment;
          const ires = await fetch('/api/interactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(interactionPayload),
          });
          if (!ires.ok) {
            // Non-blocking: log but continue
            console.warn('Create interaction failed', ires.status);
          }
        }
      } catch {
        // ignore interaction creation failure to not block customer creation
      }
      stopDurationTimer();
      setShowAddRow(false);
      setNewCustomer(null);
      setInteractionFormData({
        callDuration: 0,
        followUpStatus: 'pending',
        callStatus: 'called',
        note: '',
        supervisorComment: ''
      });
      await fetchCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleCancelAdd = () => {
    stopDurationTimer();
    setShowAddRow(false);
    setNewCustomer(null);
    setInteractionFormData({
      callDuration: 0,
      followUpStatus: 'pending',
      callStatus: 'called',
      note: '',
      supervisorComment: ''
    });
  };

  const handleEditClick = (customer: CustomerWithInteractions, focusField?: typeof editFocusField) => {
    const { interactions, ...rest } = customer as any;
    setEditingCustomerId(customer._id?.toString() || null);
    setEditFormData(rest as Partial<Customer>);
    const latest = customer.interactions[0];
    setInteractionFormData({
      callDuration: latest?.callDuration || 0,
      followUpStatus: latest?.followUpStatus || 'pending',
      callStatus: latest?.callStatus || 'called',
      note: latest?.note || '',
      supervisorComment: latest?.supervisorComment || ''
    });
    setEditFocusField(focusField ?? null);
  };

  const handleInputChange = <K extends keyof Customer>(field: K, value: any) => {
    setEditFormData(prev => ({ ...(prev || {}), [field]: value }));
  };

  const handleSaveEdit = async (overrideInteraction?: Partial<Interaction>) => {
    try {
      if (!editingCustomerId) return;
      const res = await fetch(`/api/customers/${editingCustomerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });
      const parsed = await parseResponse(res);
      if (!res.ok) {
        const msg = parsed.kind === 'json' ? (parsed.body.message || JSON.stringify(parsed.body)) : parsed.body;
        throw new Error(`Update customer failed (${res.status}): ${msg}`);
      }
      const data = parsed.kind === 'json' ? parsed.body : { success: false } as any;
      if (!data.success) throw new Error(data.message || 'Failed to update customer');
      // also create a new interaction snapshot based on edited interaction fields
      try {
        const interactionPayload: any = {
          ...interactionFormData,
          ...(overrideInteraction || {}),
          customerId: editingCustomerId,
          agentId: session?.user?.id,
          date: new Date().toISOString(),
        };
        if (!canEditSupervisor) delete interactionPayload.supervisorComment;
        const ires = await fetch('/api/interactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(interactionPayload),
        });
        if (!ires.ok) {
          console.warn('Create interaction (on edit) failed', ires.status);
        }
        else {
          try {
            const ij = await ires.json();
            const newIx = ij.data || ij;
            setCustomers(prev => prev.map(c => {
              if ((c._id?.toString() || '') !== editingCustomerId) return c;
              return { ...c, interactions: newIx ? [newIx] : c.interactions };
            }));
          } catch {}
        }
      } catch {}
      // Optimistically update local state for immediate UI feedback
      setCustomers(prev => prev.map(c => {
        if ((c._id?.toString() || '') !== editingCustomerId) return c;
        return {
          ...c,
          name: editFormData.name ?? c.name,
          contactTitle: editFormData.contactTitle ?? c.contactTitle,
          email: editFormData.email ?? c.email,
          phone: editFormData.phone ?? c.phone,
        };
      }));
      setEditingCustomerId(null);
      setEditFormData({});
      // Re-fetch to ensure interactions and any server-side changes are reflected
      await fetchCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleCancelEdit = () => {
    setEditingCustomerId(null);
    setEditFormData({});
    setEditFocusField(null);
  };

  const handleAddInteractionClick = (customerId: string) => {
    setAddingInteractionForCustomer(customerId);
  };

  const handleInteractionChange = <K extends keyof Interaction>(field: K, value: any) => {
    setInteractionFormData(prev => ({ ...(prev || {}), [field]: value }));
  };

  const handleCancelInteraction = () => {
    setAddingInteractionForCustomer(null);
  };

  const handleSaveInteraction = async () => {
    try {
      if (!addingInteractionForCustomer) return;
      const payload = {
        ...interactionFormData,
        customerId: addingInteractionForCustomer,
        date: (interactionFormData as any).date || new Date().toISOString(),
      } as any;
      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to create interaction');
      setAddingInteractionForCustomer(null);
      setInteractionFormData({
        callDuration: 0,
        followUpStatus: 'pending',
        callStatus: 'called',
        note: ''
      });
      await fetchCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
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

    const q = deferredQuery.trim().toLowerCase();
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
      const day = now.getDay(); // 0 Sun..6 Sat
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
      // monthValue format: YYYY-MM
      const [yStr, mStr] = monthValue.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10) - 1;
      const s = new Date(y, m, 1);
      const e = new Date(y, m + 1, 1);
      startMs = s.getTime(); endMs = e.getTime();
    } else if (datePreset === 'weekPick' && weekValue) {
      // weekValue format: YYYY-Www
      const [yStr, wStr] = weekValue.split('-W');
      const y = parseInt(yStr, 10);
      const w = parseInt(wStr, 10);
      // ISO week: Thursday of the week is in the week-numbering year
      // Compute Monday of ISO week w
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
      // include end date day fully
      e.setDate(e.getDate() + 1);
      startMs = s.getTime(); endMs = e.getTime();
    }

    const dateFiltered = searched.filter(c => {
      if (startMs == null || endMs == null) return true;
      if (!c.lastInteractionAt) return false; // no interaction, exclude from date filter window
      return c.lastInteractionAt >= startMs && c.lastInteractionAt < endMs;
    });

    // Status filters on latest interaction
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
  }, [customers, deferredQuery, filterStatus, sortBy, sortDir, page, pageSize, datePreset, dateStart, dateEnd, monthValue, weekValue, callStatusFilter, followUpFilter]);

  const allVisibleSelected = useMemo(() => paged.length > 0 && paged.every(c => selected[c._id?.toString() || ''] ), [paged, selected]);
  const anySelected = useMemo(() => Object.values(selected).some(Boolean), [selected]);

  // Reset to first page when filters or search change
  useEffect(() => {
    setPage(1);
  }, [deferredQuery, filterStatus, datePreset, dateStart, dateEnd, monthValue, weekValue, callStatusFilter, followUpFilter]);

  // Export CSV for current filtered rows
  const handleExportCsv = () => {
    const rows = filteredAll.map(c => {
      const latest = c.interactions[0];
      return {
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
    const headers = Object.keys(rows[0] || { Name: '', Phone: '', Email: '', ContactTitle: '', LastInteractionDate: '', CallStatus: '', FollowUpStatus: '', DurationSeconds: '', Note: '' });
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => {
      const val = (r as any)[h] ?? '';
      const s = String(val).replace(/"/g, '""');
      return `"${s}` + `"`;
    }).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBulkLoading(true);
      await Promise.all(selectedIds.map(async (id) => {
        const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          try {
            const msg = (await res.json()).message || `Failed ${res.status}`;
            console.warn('Delete failed for', id, msg);
          } catch {}
        }
      }));
      setCustomers(prev => prev.filter(c => !selectedIds.includes(c._id?.toString() || '')));
      setSelected(prev => {
        const next = { ...prev };
        selectedIds.forEach(id => { delete next[id]; });
        return next;
      });
      await fetchCustomers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk delete failed');
    } finally {
      setBulkLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 flex justify-center items-center h-64">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-lg text-gray-500 dark:text-gray-400">Loading customers...</p>
      </div>
    </div>;
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
    <div className="rounded-xl border border-card-border dark:border-gray-700 overflow-hidden shadow-md bg-white dark:bg-gray-800 w-full">
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
            {anySelected && (
              <button className="btn btn-outline text-sm">Bulk Actions ({Object.values(selected).filter(Boolean).length})</button>
            )}
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
            {!showAddRow && (
              <button
                onClick={() => setShowAddRow(true)}
                className="btn btn-primary text-sm flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
                New
              </button>
            )}
          </div>
        </div>
  
        {/* Filters row: horizontal toolbar with presets and inline selects (HubSpot-like) */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-800 overflow-x-auto whitespace-nowrap">
          <div className="flex items-center gap-2">
            {/* Date Range */}

            {/* Date Select and conditional inputs */}
            <select
              className="form-input !w-auto min-w-[8rem] h-8 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded shrink-0"
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as any)}
              title="Date range"
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
                <span className="text-xs text-gray-500 dark:text-gray-400">to</span>
                <input type="date" className="form-input !w-auto min-w-[8rem] h-8 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded shrink-0" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
              </>
            )}
            {datePreset === 'monthPick' && (
              <input type="month" className="form-input !w-auto min-w-[8rem] h-8 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded shrink-0" value={monthValue} onChange={(e) => setMonthValue(e.target.value)} />
            )}
            {datePreset === 'weekPick' && (
              <input type="week" className="form-input !w-auto min-w-[8rem] h-8 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded shrink-0" value={weekValue} onChange={(e) => setWeekValue(e.target.value)} />
            )}

            <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-600 inline-block align-middle" />

            {/* Status Filters */}
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

            <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-600 inline-block align-middle" />

            {/* Customer & Sort */}
            <select
              className="form-input !w-auto min-w-[8rem] h-8 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded shrink-0"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              title="Customer status"
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

            <div className="ml-auto flex items-center gap-2 shrink-0">
              <button
                className="inline-flex items-center gap-1 h-8 text-xs px-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm"
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
                className="inline-flex items-center gap-1 h-8 text-xs px-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm"
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

      {anySelected && (
        <div className="mb-2 flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded px-3 py-2">
          <div className="text-xs text-amber-800 dark:text-amber-200">{selectedIds.length} selected</div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDelete}
              disabled={bulkLoading}
              className="btn btn-error btn-xs"
              title="Delete selected"
            >
              {bulkLoading ? 'Deleting...' : 'Delete Selected'}
            </button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto w-full">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50/50 dark:bg-gray-700/50 sticky top-0 z-0">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--table-header-text-color)] dark:text-gray-400 uppercase tracking-wider">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allVisibleSelected}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const next: Record<string, boolean> = { ...selected };
                    paged.forEach(c => { const id = c._id?.toString() || ''; if (id) next[id] = checked; });
                    setSelected(next);
                  }}
                  className="rounded text-primary focus:ring-primary"
                />
              </th>
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
            {showAddRow && (
              <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors duration-150">
                <td className="px-3 py-2 whitespace-nowrap">{/* select */}</td>
                {visibleCols.agent && (<td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{session?.user?.name || '-'}</td>)}
                {visibleCols.phone && (<td className="px-3 py-2"><input type="text" value={newCustomer?.phone || ''} onChange={(e) => handleNewCustomerChange('phone', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNewCustomer(); if (e.key === 'Escape') handleCancelAdd(); }} className="form-input text-xs h-8 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Phone" /></td>)}
                {visibleCols.callTitle && (<td className="px-3 py-2"><input type="text" value={newCustomer?.contactTitle || ''} onChange={(e) => handleNewCustomerChange('contactTitle', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNewCustomer(); if (e.key === 'Escape') handleCancelAdd(); }} className="form-input text-xs h-8 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Call title" /></td>)}
                {visibleCols.customer && (<td className="px-3 py-2"><input type="text" value={newCustomer?.name || ''} onChange={(e) => handleNewCustomerChange('name', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNewCustomer(); if (e.key === 'Escape') handleCancelAdd(); }} className="form-input text-xs h-8 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Customer name" required /></td>)}
                {visibleCols.date && (<td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">{new Date().toLocaleDateString()}</td>)}
                {visibleCols.duration && (
                  <td className="px-3 py-2 whitespace-nowrap text-xs font-mono flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Record duration"
                      onClick={() => {
                        if (newDurationTimerRef.current == null) {
                          // start
                          newDurationTimerRef.current = window.setInterval(() => setNewDuration(d => d + 1), 1000);
                        } else {
                          // stop
                          window.clearInterval(newDurationTimerRef.current);
                          newDurationTimerRef.current = null;
                          setInteractionFormData(prev => ({ ...(prev || {}), callDuration: newDuration }));
                          // Auto-save new row if minimally valid
                          if ((newCustomer?.name || '').trim()) {
                            void handleSaveNewCustomer({ callDuration: newDuration });
                            setNewDuration(0);
                          }
                        }
                      }}
                      className={`h-3 w-3 rounded-full ${newDurationTimerRef.current ? 'bg-red-500 animate-pulse' : 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500'}`}
                    />
                    {(newDurationTimerRef.current != null || newDuration > 0) && (
                      <span className="text-gray-700 dark:text-gray-300">{String(Math.floor(newDuration/60)).padStart(2,'0')}:{String(newDuration%60).padStart(2,'0')}</span>
                    )}
                  </td>
                )}
                {visibleCols.callStatus && (<td className="px-3 py-2"><select className="form-input text-xs h-8 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={interactionFormData.callStatus || 'called'} onChange={(e) => handleInteractionChange('callStatus', e.target.value)}><option value="scheduled">Scheduled</option><option value="called">Completed</option><option value="not-reached">Not Reached</option><option value="busy">Busy</option><option value="voicemail">Voicemail</option></select></td>)}
                {visibleCols.followUp && (<td className="px-3 py-2"><select className="form-input text-xs h-8 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={interactionFormData.followUpStatus || 'pending'} onChange={(e) => handleInteractionChange('followUpStatus', e.target.value)}><option value="pending">Needs Follow-up</option><option value="in-progress">In Progress</option><option value="completed">Completed</option><option value="closed">Canceled</option></select></td>)}
                {visibleCols.notes && (<td className="px-3 py-2"><input type="text" value={interactionFormData.note || ''} onChange={(e) => handleInteractionChange('note', e.target.value)} className="form-input text-xs h-8 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Notes" /></td>)}
                {visibleCols.email && (<td className="px-3 py-2"><input type="email" value={newCustomer?.email || ''} onChange={(e) => handleNewCustomerChange('email', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNewCustomer(); if (e.key === 'Escape') handleCancelAdd(); }} className="form-input text-xs h-8 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Email" /></td>)}
                {visibleCols.supervisorComment && (
                  canEditSupervisor
                    ? (<td className="px-3 py-2"><input type="text" value={interactionFormData.supervisorComment || ''} onChange={(e) => handleInteractionChange('supervisorComment', e.target.value)} className="form-input text-xs h-8 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Supervisor comment" /></td>)
                    : (<td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{interactionFormData.supervisorComment || '-'}</td>)
                )}
                {visibleCols.actions && (<td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right"><button onClick={() => { handleSaveNewCustomer(); }} className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-primary text-white hover:opacity-90" aria-label="Save"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button></td>)}
              </tr>
            )}

            {paged.map((customer) => (
              <tr key={customer._id?.toString()} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors duration-150">
                <td className="px-3 py-2 whitespace-nowrap"><input type="checkbox" checked={!!selected[customer._id?.toString() || '']} onChange={(e) => setSelected(prev => ({ ...prev, [customer._id?.toString() || '']: e.target.checked }))} className="rounded text-primary focus:ring-primary" /></td>
                {editingCustomerId === customer._id?.toString() ? (
                  <>
                    {visibleCols.agent && (<td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{session?.user?.name || '-'}</td>)}
                    {visibleCols.phone && (<td className="px-3 py-2"><input ref={phoneRef} type="text" value={editFormData.phone || ''} onChange={(e) => handleInputChange('phone', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit(); }} className="form-input text-xs h-8 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Phone" /></td>)}
                    {visibleCols.callTitle && (<td className="px-3 py-2"><input ref={callTitleRef} type="text" value={editFormData.contactTitle || ''} onChange={(e) => handleInputChange('contactTitle', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit(); }} className="form-input text-xs h-8 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Call title" /></td>)}
                    {visibleCols.customer && (<td className="px-3 py-2"><input ref={nameRef} type="text" value={editFormData.name || ''} onChange={(e) => handleInputChange('name', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit(); }} className="form-input text-xs h-8 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Customer name" required /></td>)}
                    {visibleCols.date && (<td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">{getLastInteractionDate(customer.interactions)}</td>)}
                    {visibleCols.duration && (
                      <td className="px-3 py-2 whitespace-nowrap text-xs font-mono flex items-center gap-2">
                        <button
                          type="button"
                          aria-label="Record duration"
                          onClick={() => toggleRowRecording(customer._id?.toString() || '', customer)}
                          className={`h-3 w-3 rounded-full ${recordingCustomerId === (customer._id?.toString() || '') ? 'bg-red-500 animate-pulse' : 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500'}`}
                        />
                        {(recordingCustomerId === (customer._id?.toString() || '') || (customer.interactions[0]?.callDuration||0) > 0) && (
                          <span className="text-gray-700 dark:text-gray-300">
                            {recordingCustomerId === (customer._id?.toString() || '')
                              ? `${String(Math.floor(recordingElapsedSec/60)).padStart(2,'0')}:${String(recordingElapsedSec%60).padStart(2,'0')}`
                              : `${String(Math.floor((customer.interactions[0]?.callDuration||0)/60)).padStart(2,'0')}:${String((customer.interactions[0]?.callDuration||0)%60).padStart(2,'0')}`}
                          </span>
                        )}
                      </td>
                    )}
                    {visibleCols.callStatus && (<td className="px-3 py-2"><select ref={callStatusRef} className="form-input text-xs h-8 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={interactionFormData.callStatus || 'called'} onChange={(e) => handleInteractionChange('callStatus', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit(); }}><option value="scheduled">Scheduled</option><option value="called">Completed</option><option value="not-reached">Not Reached</option><option value="busy">Busy</option><option value="voicemail">Voicemail</option></select></td>)}
                    {visibleCols.followUp && (<td className="px-3 py-2"><select ref={followUpRef} className="form-input text-xs h-8 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={interactionFormData.followUpStatus || 'pending'} onChange={(e) => handleInteractionChange('followUpStatus', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit(); }}><option value="pending">Needs Follow-up</option><option value="in-progress">In Progress</option><option value="completed">Completed</option><option value="closed">Canceled</option></select></td>)}
                    {visibleCols.notes && (<td className="px-3 py-2"><input ref={notesRef} type="text" value={interactionFormData.note || ''} onChange={(e) => handleInteractionChange('note', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit(); }} className="form-input text-xs h-8 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Notes" /></td>)}
                    {visibleCols.email && (<td className="px-3 py-2"><input ref={emailRef} type="email" value={editFormData.email || ''} onChange={(e) => handleInputChange('email', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit(); }} className="form-input text-xs h-8 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Email" /></td>)}
                    {visibleCols.supervisorComment && (
                      canEditSupervisor
                        ? (<td className="px-3 py-2"><input ref={supervisorCommentRef} type="text" value={interactionFormData.supervisorComment || ''} onChange={(e) => handleInteractionChange('supervisorComment', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit(); }} className="form-input text-xs h-8 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Supervisor comment" /></td>)
                        : (<td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{customer.interactions[0]?.supervisorComment || '-'}</td>)
                    )}
                    {visibleCols.actions && (<td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right"><button onClick={() => { handleSaveEdit(); }} className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-primary text-white hover:opacity-90" aria-label="Save"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button></td>)}
                  </>
                ) : (
                  <>
                    {visibleCols.agent && (<td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{session?.user?.name || '-'}</td>)}
                    {visibleCols.phone && (<td onClick={() => handleEditClick(customer, 'phone')} className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">{customer.phone || '-'}</td>)}
                    {visibleCols.callTitle && (<td onClick={() => handleEditClick(customer, 'callTitle')} className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">{customer.contactTitle || '-'}</td>)}
                    {visibleCols.customer && (<td onClick={() => handleEditClick(customer, 'name')} className="px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"><div className="flex items-center gap-2"><div className="text-sm font-medium text-gray-900 dark:text-white">{customer.name}</div></div></td>)}
                    {visibleCols.date && (<td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">{getLastInteractionDate(customer.interactions)}</td>)}
                    {visibleCols.duration && (
                      <td className="px-3 py-2 whitespace-nowrap text-xs font-mono flex items-center gap-2">
                        <button
                          type="button"
                          aria-label="Record duration"
                          onClick={() => toggleRowRecording(customer._id?.toString() || '', customer)}
                          className={`h-3 w-3 rounded-full ${recordingCustomerId === (customer._id?.toString() || '') ? 'bg-red-500 animate-pulse' : 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500'}`}
                        />
                        {(recordingCustomerId === (customer._id?.toString() || '') || (customer.interactions[0]?.callDuration||0) > 0) && (
                          <span className="text-gray-700 dark:text-gray-300">
                            {recordingCustomerId === (customer._id?.toString() || '')
                              ? `${String(Math.floor(recordingElapsedSec/60)).padStart(2,'0')}:${String(recordingElapsedSec%60).padStart(2,'0')}`
                              : `${String(Math.floor((customer.interactions[0]?.callDuration||0)/60)).padStart(2,'0')}:${String((customer.interactions[0]?.callDuration||0)%60).padStart(2,'0')}`}
                          </span>
                        )}
                      </td>
                    )}
                    {visibleCols.callStatus && (<td onClick={() => handleEditClick(customer, 'callStatus')} className="px-3 py-2 whitespace-nowrap cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">{getCallStatusBadge(customer.interactions[0]?.callStatus)}</td>)}
                    {visibleCols.followUp && (<td onClick={() => handleEditClick(customer, 'followUp')} className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">{customer.interactions[0]?.followUpStatus || '-'}</td>)}
                    {visibleCols.notes && (<td onClick={() => handleEditClick(customer, 'notes')} className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300 truncate max-w-[200px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">{customer.interactions[0]?.note || '-'}</td>)}
                    {visibleCols.email && (<td onClick={() => handleEditClick(customer, 'email')} className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">{customer.email || '-'}</td>)}
                    {visibleCols.supervisorComment && (
                      canEditSupervisor
                        ? (<td onClick={() => handleEditClick(customer, 'supervisorComment')} className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300 truncate max-w-[200px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">{customer.interactions[0]?.supervisorComment || '-'}</td>)
                        : (<td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{customer.interactions[0]?.supervisorComment || '-'}</td>)
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