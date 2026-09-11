'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, CheckCircle2, AlertTriangle, Loader2, ArrowRight, LogOut } from 'lucide-react';
import { KitState } from '../../hooks/useKitPoller';

export default function KitsDashboardPage() {
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      router.push('/login');
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/kits`, { credentials: 'include',   })
      .then(r => r.json())
      .then(data => {
        setKits(data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col py-12 sm:px-6 lg:px-8 relative overflow-hidden text-neutral-200 font-sans">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="max-w-4xl w-full mx-auto relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Your PrepKits</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-sm font-semibold transition-all border border-neutral-700"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
            <Link 
              href="/create"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
            >
              Create New
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : kits.length === 0 ? (
          <div className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl p-12 text-center">
            <h3 className="text-xl font-semibold text-white mb-2">No kits found</h3>
            <p className="text-neutral-400 mb-6">Create your first AI interview prep kit to get started.</p>
            <Link 
              href="/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-semibold transition-colors border border-neutral-700"
            >
              Get Started
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {kits.map(kit => (
              <Link key={kit._id} href={`/kits/${kit._id}`}>
                <div className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 hover:border-blue-500/50 rounded-2xl p-6 transition-all group flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {kit.data?.source?.role || 'Custom Role'} @ {kit.data?.source?.company || new URL(kit.companyUrl || 'http://unknown').hostname.replace('www.', '')}
                    </h3>
                    <p className="text-sm text-neutral-400 mt-1">
                      Created {new Date(kit.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    {kit.status === 'completed' ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
                        <CheckCircle2 className="w-4 h-4" />
                        Ready
                      </span>
                    ) : kit.status === 'failed' ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20">
                        <AlertTriangle className="w-4 h-4" />
                        Failed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {kit.stage || 'Generating'}
                      </span>
                    )}
                    <ArrowRight className="w-5 h-5 text-neutral-600 group-hover:text-blue-400 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
