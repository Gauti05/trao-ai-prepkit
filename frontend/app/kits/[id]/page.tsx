'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useKitPoller } from '../../../hooks/useKitPoller';
import { ProgressTracker } from '../../../components/ProgressTracker';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { KitBuilder } from '../../../components/KitBuilder';

export default function KitDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  
  const { kit, loading, error } = useKitPoller(id);

  const handleRetry = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/kits/${id}/retry`, { credentials: 'include',  method: 'POST'
      });
      // Poller automatically picks up state change
    } catch (err) {
      alert('Failed to retry kit');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !kit) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white p-6">
        <h2 className="text-xl font-bold text-red-400 mb-2">Failed to load kit</h2>
        <p className="text-neutral-400 mb-6">{error}</p>
        <Link href="/kits" className="text-blue-400 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  if (kit.status === 'generating' || kit.status === 'failed') {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col py-12 sm:px-6 lg:px-8 relative text-neutral-200">
        <div className="max-w-3xl w-full mx-auto relative z-10 space-y-8">
          <Link href="/kits" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <ProgressTracker kit={kit} onRetry={handleRetry} />
        </div>
      </div>
    );
  }

  // Kit is completed
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col relative text-neutral-200">
      <div className="w-full mx-auto relative z-10">
        <div className="px-6 py-4">
          <Link href="/kits" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
        <KitBuilder kitId={id} initialData={kit.data} />
      </div>
    </div>
  );
}
