'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BatchUpload, BatchItem } from '../../components/BatchUpload';
import { BatchRunner } from '../../components/BatchRunner';
import { ProgressTracker } from '../../components/ProgressTracker';
import { useKitPoller } from '../../hooks/useKitPoller';
import { Sparkles, Briefcase, Link as LinkIcon, Calendar, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateKitPage() {
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  
  // Single form state
  const [jd, setJd] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeKitId, setActiveKitId] = useState<string | null>(null);

  // Batch state
  const [batchItems, setBatchItems] = useState<BatchItem[] | null>(null);

  const router = useRouter();

  // Polling for single kit
  const { kit, loading, error } = useKitPoller(activeKitId);

  React.useEffect(() => {
    if (kit && kit.status === 'completed') {
      router.push(`/kits/${kit._id}`);
    }
  }, [kit, router]);

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/kits`, { credentials: 'include',  method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd, companyUrl, days })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setActiveKitId(data.kitId);
    } catch (err) {
      alert('Failed to start kit generation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetrySingle = async () => {
    if (!activeKitId) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/kits/${activeKitId}/retry`, { credentials: 'include',  method: 'POST'
      });
      // The poller will automatically pick up the new status
    } catch (err) {
      alert('Failed to retry');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col py-12 sm:px-6 lg:px-8 relative overflow-hidden text-neutral-200 font-sans">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      <div className="max-w-3xl w-full mx-auto relative z-10 space-y-8">
        
        <div className="flex flex-col gap-4">
          <Link href="/kits" className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors w-fit">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Create PrepKit</h1>
          </div>
        </div>

        {activeKitId ? (
          kit ? (
            <ProgressTracker kit={kit} onRetry={handleRetrySingle} />
          ) : error ? (
            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
              <h3 className="text-red-400 font-semibold mb-2">Polling Error</h3>
              <p className="text-sm text-red-400/80">{error}</p>
            </div>
          ) : (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            </div>
          )
        ) : batchItems ? (
          <BatchRunner items={batchItems} />
        ) : (
          <div className="bg-neutral-900/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-neutral-800 overflow-hidden">
            <div className="flex border-b border-neutral-800">
              <button
                onClick={() => setActiveTab('single')}
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === 'single' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-neutral-500 hover:text-neutral-300'}`}
              >
                Single Role
              </button>
              <button
                onClick={() => setActiveTab('batch')}
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === 'batch' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-neutral-500 hover:text-neutral-300'}`}
              >
                Batch Upload
              </button>
            </div>

            <div className="p-8">
              {activeTab === 'single' ? (
                <form onSubmit={handleSingleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Job Description</label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute top-3 left-3 pointer-events-none">
                        <Briefcase className="h-5 w-5 text-neutral-500" />
                      </div>
                      <textarea
                        required
                        rows={6}
                        className="block w-full pl-10 bg-neutral-950 border border-neutral-800 rounded-xl py-3 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all custom-scrollbar"
                        placeholder="Paste the full job description here..."
                        value={jd}
                        onChange={(e) => setJd(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Company URL</label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <LinkIcon className="h-5 w-5 text-neutral-500" />
                        </div>
                        <input
                          type="url"
                          required
                          className="block w-full pl-10 bg-neutral-950 border border-neutral-800 rounded-xl py-3 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                          placeholder="https://example.com"
                          value={companyUrl}
                          onChange={(e) => setCompanyUrl(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Days Available</label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Calendar className="h-5 w-5 text-neutral-500" />
                        </div>
                        <input
                          type="number"
                          required
                          min={1}
                          max={60}
                          className="block w-full pl-10 bg-neutral-950 border border-neutral-800 rounded-xl py-3 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                          value={days}
                          onChange={(e) => setDays(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/20 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
                    >
                      {isSubmitting ? 'Starting...' : 'Generate PrepKit'}
                    </button>
                  </div>
                </form>
              ) : (
                <BatchUpload onStartBatch={(items) => setBatchItems(items)} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
