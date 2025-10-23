'use client';

import { useState, useEffect } from 'react';

interface InteractionWithDetails {
  _id?: string;
  customerId: string;
  agentId: string;
  callDuration?: number;
  followUpStatus: string;
  note?: string;
  supervisorComment?: string;
  callStatus: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  agentName: string;
  customerContactTitle: string;
  customerEmail: string;
}

export default function InteractionTable({ agentId }: { agentId?: string }) {
  const [interactions, setInteractions] = useState<InteractionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    fetchInteractions();
  }, []);

  const fetchInteractions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/interactions');
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch interactions');
      }
      // Deduplicate by _id if present, otherwise by a composite key
      const unique = new Map<string, InteractionWithDetails>();
      (data.data as InteractionWithDetails[]).forEach((it) => {
        const key = it._id || `${it.customerId}_${it.date}_${it.callStatus}_${it.followUpStatus}`;
        if (!unique.has(key)) unique.set(key, it);
      });
      setInteractions(Array.from(unique.values()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEditComment = (interactionId: string, currentComment: string) => {
    setEditingCommentId(interactionId);
    setCommentText(currentComment || '');
  };

  const handleSaveComment = async (interactionId: string) => {
    try {
      const res = await fetch('/api/interactions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: interactionId,
          supervisorComment: commentText,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to update comment');
      }

      // Update the interaction in the state
      setInteractions(prev => 
        prev.map(interaction => 
          interaction._id === interactionId 
            ? { ...interaction, supervisorComment: commentText } 
            : interaction
        )
      );

      // Exit edit mode
      setEditingCommentId(null);
      setCommentText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setCommentText('');
  };

  if (loading) {
    return <div className="p-6">Loading interactions...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500 dark:text-red-400">Error: {error}</div>;
  }

  const visible = agentId ? interactions.filter(i => i.agentId === agentId) : interactions;

  return (
    <div className="space-y-4">
      {/* Desktop/tablet table */}
      <div className="overflow-x-auto hidden md:block">
        <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th className="py-2 px-4 border-b border-gray-200 dark:border-gray-600 text-left text-gray-700 dark:text-gray-300">Date</th>
              <th className="py-2 px-4 border-b border-gray-200 dark:border-gray-600 text-left text-gray-700 dark:text-gray-300">Agent</th>
              <th className="py-2 px-4 border-b border-gray-200 dark:border-gray-600 text-left text-gray-700 dark:text-gray-300">Customer</th>
              <th className="py-2 px-4 border-b border-gray-200 dark:border-gray-600 text-left text-gray-700 dark:text-gray-300 hidden lg:table-cell">Contact Title</th>
              <th className="py-2 px-4 border-b border-gray-200 dark:border-gray-600 text-left text-gray-700 dark:text-gray-300">Call Status</th>
              <th className="py-2 px-4 border-b border-gray-200 dark:border-gray-600 text-left text-gray-700 dark:text-gray-300 hidden lg:table-cell">Duration</th>
              <th className="py-2 px-4 border-b border-gray-200 dark:border-gray-600 text-left text-gray-700 dark:text-gray-300">Follow-up</th>
              <th className="py-2 px-4 border-b border-gray-200 dark:border-gray-600 text-left text-gray-700 dark:text-gray-300 hidden lg:table-cell">Note</th>
              <th className="py-2 px-4 border-b border-gray-200 dark:border-gray-600 text-left text-gray-700 dark:text-gray-300">Supervisor Comment</th>
              <th className="py-2 px-4 border-b border-gray-200 dark:border-gray-600 text-left text-gray-700 dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((interaction) => (
              <tr key={interaction._id || `${interaction.customerId}_${interaction.date}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="py-2 px-4 border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                  {new Date(interaction.date).toLocaleDateString()}
                </td>
                <td className="py-2 px-4 border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">{interaction.agentName}</td>
                <td className="py-2 px-4 border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">{interaction.customerName}</td>
                <td className="py-2 px-4 border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hidden lg:table-cell">{interaction.customerContactTitle || '-'}</td>
                <td className="py-2 px-4 border-b border-gray-200 dark:border-gray-700">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    interaction.callStatus === 'called' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                    interaction.callStatus === 'not-reached' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                    interaction.callStatus === 'busy' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                    interaction.callStatus === 'voicemail' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                    'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                  }`}>
                    {interaction.callStatus}
                  </span>
                </td>
                <td className="py-2 px-4 border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hidden lg:table-cell">
                  {interaction.callDuration ? `${interaction.callDuration}s` : '-'}
                </td>
                <td className="py-2 px-4 border-b border-gray-200 dark:border-gray-700">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    interaction.followUpStatus === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                    interaction.followUpStatus === 'in-progress' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                    interaction.followUpStatus === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                    'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                  }`}>
                    {interaction.followUpStatus}
                  </span>
                </td>
                <td className="py-2 px-4 border-b border-gray-200 dark:border-gray-700 max-w-xs truncate hidden lg:table-cell text-gray-700 dark:text-gray-300">
                  {interaction.note || '-'}
                </td>
                <td className="py-2 px-4 border-b border-gray-200 dark:border-gray-700">
                  {editingCommentId === interaction._id ? (
                    <div className="flex flex-col space-y-2">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        rows={2}
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleSaveComment(interaction._id!)}
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
                  ) : (
                    <div>
                      {interaction.supervisorComment || '-'}
                      <button
                        onClick={() => handleEditComment(interaction._id!, interaction.supervisorComment || '')}
                        className="block mt-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        {interaction.supervisorComment ? 'Edit' : 'Add Comment'}
                      </button>
                    </div>
                  )}
                </td>
                <td className="py-2 px-4 border-b border-gray-200 dark:border-gray-700">
                  <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm cursor-not-allowed opacity-50" disabled>
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {visible.map((i) => (
          <div key={i._id || `${i.customerId}_${i.date}`} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-900 dark:text-white">{i.customerName}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(i.date).toLocaleDateString()}</div>
            </div>
            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">Agent: {i.agentName}</div>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded-full ${
                i.callStatus === 'called' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                i.callStatus === 'not-reached' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                i.callStatus === 'busy' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                i.callStatus === 'voicemail' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
              }`}>{i.callStatus}</span>
              <span className={`px-2 py-0.5 rounded-full ${
                i.followUpStatus === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                i.followUpStatus === 'in-progress' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                i.followUpStatus === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
              }`}>{i.followUpStatus}</span>
            </div>
            {i.note && <div className="mt-1 text-xs text-gray-700 dark:text-gray-300 line-clamp-2">{i.note}</div>}
            <div className="mt-2">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Supervisor Comment</div>
              {editingCommentId === i._id ? (
                <div className="space-y-2">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveComment(i._id!)} className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 dark:hover:bg-green-700">Save</button>
                    <button onClick={handleCancelEdit} className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600 dark:hover:bg-gray-700">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-700 dark:text-gray-300">
                  <div className="min-h-[2rem]">{i.supervisorComment || '-'}</div>
                  <button onClick={() => handleEditComment(i._id!, i.supervisorComment || '')} className="mt-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                    {i.supervisorComment ? 'Edit Comment' : 'Add Comment'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}