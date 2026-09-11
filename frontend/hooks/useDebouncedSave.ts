import { useRef, useEffect, useCallback, useState } from 'react';
import { debounce } from 'lodash';

interface SaveHookProps {
  kitId: string;
  initialData: any;
}

export function useDebouncedSave({ kitId, initialData }: SaveHookProps) {
  const [data, setData] = useState(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Keep a ref to the latest data so the debounced function always patches the latest
  const latestDataRef = useRef(data);
  latestDataRef.current = data;

  const patchToServer = async (dataToSave: any) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/kits/${kitId}`, { credentials: 'include',  method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });
      if (!res.ok) {
        throw new Error('Failed to save to server');
      }
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // The debounced save function
  const debouncedSave = useRef(
    debounce((dataToSave) => patchToServer(dataToSave), 1500)
  ).current;

  // Flush function to force an immediate save and cancel the timer
  const flushSave = useCallback(async () => {
    debouncedSave.cancel();
    await patchToServer(latestDataRef.current);
  }, [debouncedSave]);

  // Update data and trigger debounced save
  const updateData = useCallback((newData: any) => {
    setData(newData);
    setSaveError(null);
    debouncedSave(newData);
  }, [debouncedSave]);

  // Flush before unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      debouncedSave.flush();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      debouncedSave.flush();
    };
  }, [debouncedSave]);

  return {
    data,
    updateData,
    flushSave,
    isSaving,
    saveError,
  };
}
