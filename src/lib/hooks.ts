import { useCallback, useEffect, useRef, useState } from 'react';
import type { SaveStatus } from '../components/ui';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Counts up once from zero to the target, as the day counter does on arrival at home. */
export function useCountUp(target: number): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  useEffect(() => {
    if (prefersReducedMotion() || target === 0) {
      setValue(target);
      return;
    }
    let n = 0;
    const step = Math.max(1, Math.round(target / 36));
    setValue(0);
    const timer = window.setInterval(() => {
      n = Math.min(target, n + step);
      setValue(n);
      if (n >= target) window.clearInterval(timer);
    }, 26);
    return () => window.clearInterval(timer);
  }, [target]);
  return value;
}

export interface Autosave {
  value: string;
  status: SaveStatus;
  onChange: (value: string) => void;
  /** Saves immediately if there is an unsaved change. Rejects when the save fails. */
  flush: () => Promise<void>;
}

/**
 * A text field that saves itself a moment after the user stops typing, when it loses focus
 * (call `flush`), and when the screen is left.
 */
export function useAutosave(initial: string, save: (value: string) => Promise<unknown>, wait = 800): Autosave {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const latest = useRef(initial);
  const stored = useRef(initial);
  const timer = useRef<number | undefined>(undefined);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const saveRef = useRef(save);
  saveRef.current = save;
  const mounted = useRef(true);

  const flush = useCallback((): Promise<void> => {
    window.clearTimeout(timer.current);
    const run = async () => {
      const next = latest.current;
      if (next === stored.current) return;
      if (mounted.current) setStatus('saving');
      try {
        await saveRef.current(next);
        stored.current = next;
        if (mounted.current) setStatus('saved');
      } catch (error) {
        if (mounted.current) setStatus('error');
        throw error;
      }
    };
    const result = queue.current.then(run);
    queue.current = result.catch(() => undefined);
    return result;
  }, []);

  const onChange = useCallback(
    (next: string) => {
      setValue(next);
      latest.current = next;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush().catch(() => undefined), wait);
    },
    [flush, wait],
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      void flush().catch(() => undefined);
    };
  }, [flush]);

  return { value, status, onChange, flush };
}
