import Link from 'next/link';
import { Sparkles, ArrowRight, BrainCircuit } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 relative overflow-hidden text-neutral-200 font-sans">
      
      {/* Dynamic Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px]" />
      </div>

      <div className="relative z-10 text-center max-w-3xl mx-auto flex flex-col items-center">
        
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900/50 border border-neutral-800 text-neutral-400 mb-8 backdrop-blur-sm">
          <BrainCircuit className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium tracking-wide">Next-Generation Assessment</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Master your interviews with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">PrepKit AI</span>
        </h1>
        
        <p className="text-lg md:text-xl text-neutral-400 mb-12 max-w-2xl leading-relaxed">
          Dynamic AI-driven interview assessments tailored to your role. Extract insights, validate your skills, and schedule mock sessions seamlessly.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/register" className="group flex justify-center items-center gap-2 px-8 py-4 rounded-xl shadow-lg shadow-blue-500/20 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900 focus:ring-blue-500 transition-all transform hover:scale-[1.02] active:scale-[0.98]">
            Get Started
            <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
          </Link>
          
          <Link href="/login" className="group flex justify-center items-center gap-2 px-8 py-4 rounded-xl border border-neutral-700 text-base font-medium text-neutral-300 bg-neutral-900/50 hover:bg-neutral-800 transition-all backdrop-blur-md">
            Sign In
            <ArrowRight className="w-5 h-5 text-neutral-500 group-hover:text-neutral-300 transition-colors" />
          </Link>
        </div>
      </div>
    </main>
  );
}
