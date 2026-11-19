import { todayInIsrael } from './dates';
import { DEMO_MODE } from './env';

export const DEMO_TODAY_KEY = 'pisga-demo-today';

/** Today's date in Israel. In demo mode a reviewer may set another date to preview later stages. */
export function today(): string {
  if (DEMO_MODE) {
    try {
      const override = localStorage.getItem(DEMO_TODAY_KEY);
      if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) return override;
    } catch {
      /* storage unavailable: fall through to the real date */
    }
  }
  return todayInIsrael();
}
