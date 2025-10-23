'use client';

import { useState } from 'react';
import { Interaction } from '@/lib/models';

export default function AddInteractionForm({ customerId, onInteractionAdded }: { 
  customerId: string; 
  onInteractionAdded: () => void;
}) {
  const [callDuration, setCallDuration] = useState(0);
  const [followUpStatus, setFollowUpStatus] = useState<'pending' | 'in-progress' | 'completed' | 'closed'>('pending');
  const [note, setNote] = useState('');
  const [callStatus, setCallStatus] = useState<'called' | 'not-reached' | 'busy' | 'voicemail' | 'scheduled'>('called');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          callDuration,
          followUpStatus,
          note,
          callStatus,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to add interaction');
      }

      setSuccess(true);
      // Reset form
      setCallDuration(0);
      setFollowUpStatus('pending');
      setNote('');
      setCallStatus('called');
      
      // Notify parent component
      onInteractionAdded();
      
      // Reset success message after delay
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Clear error after delay
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card card-hover shadow-lg">
      <div className="card-header bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-xl">
        <h3 className="text-lg font-semibold flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Add New Interaction
        </h3>
      </div>
      
      <div className="card-body">
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg flex items-center animate-fade-in shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <span className="font-medium">Success!</span> Interaction added successfully!
            </div>
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center animate-fade-in shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <span className="font-medium">Error:</span> {error}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="form-label flex items-center font-medium text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Call Duration (seconds)
              </label>
              <input
                type="number"
                value={callDuration}
                onChange={(e) => setCallDuration(Number(e.target.value))}
                className="form-input input-3d w-full py-3 px-4 text-base"
                min="0"
                placeholder="300"
              />
            </div>
            
            <div className="space-y-2">
              <label className="form-label flex items-center font-medium text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call Status
              </label>
              <select
                value={callStatus}
                onChange={(e) => setCallStatus(e.target.value as any)}
                className="form-input input-3d w-full py-3 px-4 text-base"
              >
                <option value="called">Called</option>
                <option value="not-reached">Not Reached</option>
                <option value="busy">Busy</option>
                <option value="voicemail">Voicemail</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="form-label flex items-center font-medium text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Follow-up Status
              </label>
              <select
                value={followUpStatus}
                onChange={(e) => setFollowUpStatus(e.target.value as any)}
                className="form-input input-3d w-full py-3 px-4 text-base"
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="form-label flex items-center font-medium text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Notes
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="form-input input-3d w-full py-3 px-4 text-base"
              rows={4}
              placeholder="Add details about the interaction..."
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full flex items-center justify-center space-x-2 py-3 px-6 text-base font-medium rounded-lg transition-all duration-200 hover:shadow-lg btn-3d"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Adding Interaction...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Add Interaction</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}