import { useCallback, useEffect, useRef, useState } from 'react';

/** Flag que volta a `false` sozinha após `durationMs` — usada para feedback temporário em botões. */
export function useTransientFlag(durationMs = 2000): [boolean, () => void] {
  const [active, setActive] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const trigger = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setActive(true);
    timerRef.current = window.setTimeout(() => setActive(false), durationMs);
  }, [durationMs]);

  return [active, trigger];
}
