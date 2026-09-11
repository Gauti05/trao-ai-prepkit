import { useState, useEffect } from 'react';

export interface KitState {
  _id: string;
  status: 'generating' | 'completed' | 'failed';
  stage: string;
  error?: string;
  data?: any;
}

export function useKitPoller(kitId: string | null) {
  const [kit, setKit] = useState<KitState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!kitId) {
      setLoading(false);
      return;
    }

    let intervalId: NodeJS.Timeout;
    let isMounted = true;

    const fetchKit = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/kits/${kitId}`, { credentials: 'include',  });
        
        if (!res.ok) throw new Error('Failed to fetch kit');
        const data = await res.json();
        
        if (isMounted) {
          setKit(data);
          setLoading(false);
          
          if (data.status === 'completed' || data.status === 'failed') {
            if (intervalId) clearInterval(intervalId);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          if (intervalId) clearInterval(intervalId);
        }
      }
    };

    // Fetch immediately
    fetchKit();

    // Then poll every 3 seconds
    intervalId = setInterval(fetchKit, 3000);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [kitId]);

  return { kit, loading, error };
}
