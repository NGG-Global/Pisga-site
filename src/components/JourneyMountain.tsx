import { delay } from './ui';
import { strings } from '../content/strings';
import type { Session } from '../data/types';
import { completedCount, isSessionCompleted, nextSession, TOTAL_SESSIONS } from '../lib/programme';

/**
 * "המסע שלכם": the ridge of a mountain carrying twelve station dots, from the first session at
 * the foot to session 12 at the summit. Geometry is taken from the design prototype (348 x 170).
 */
const FOOT = { x: 22.4, y: 155.4 };
const STEP = { x: 20.69, y: -11.95 };
const SUMMIT = { x: 250, y: 28 };

function dotPosition(n: number) {
  return n === TOTAL_SESSIONS ? SUMMIT : { x: FOOT.x + (n - 1) * STEP.x, y: FOOT.y + (n - 1) * STEP.y };
}

export function JourneyMountain({ sessions, today }: { sessions: Session[]; today: string }) {
  const done = completedCount(sessions, today);
  const next = nextSession(sessions, today)?.number ?? null;
  const completed = new Set(sessions.filter((s) => isSessionCompleted(s, today)).map((s) => s.number));
  const numbers = Array.from({ length: TOTAL_SESSIONS }, (_, i) => i + 1);
  const nextPos = next ? dotPosition(next) : null;
  // Low on the ridge the label stands above the dot on a leader line; higher up it sits beside the dot.
  const leader = next !== null && next <= 5;

  return (
    <section className="card journey rise" style={delay(240)}>
      <div className="journey__head">
        <strong>{strings.home.journeyTitle}</strong>
        <span className="meta">{strings.home.journeyCount(done, TOTAL_SESSIONS)}</span>
      </div>
      <svg role="img" aria-label={strings.home.journeyAria(done, next)} viewBox="0 0 348 170" preserveAspectRatio="xMinYMax meet">
        <g className="ridge" style={{ animationDuration: '640ms' }}>
          <clipPath id="ridge-far">
            <path d="M169.0 170 L313.7 86.5 Q318 84 320.5 88.3 L367.7 170 Z" />
          </clipPath>
          <g clipPath="url(#ridge-far)">
            <path d="M318 84 L169.0 170 L341.0 170 Z" fill="var(--ridge-far)" />
            <path d="M318 84 L341.0 170 L367.7 170 Z" fill="var(--ridge-far-lit)" />
          </g>
        </g>
        <g className="ridge" style={delay(120)}>
          <clipPath id="ridge-near">
            <path d="M-2.9 170 L243.1 28.0 Q250 24 254.0 30.9 L334.3 170 Z" />
          </clipPath>
          <g clipPath="url(#ridge-near)">
            <path d="M250 24 L-2.9 170 L289.1 170 Z" fill="var(--ridge-near)" />
            <path d="M250 24 L289.1 170 L334.3 170 Z" fill="var(--ridge-near-lit)" />
          </g>
        </g>

        {nextPos && leader && (
          <line className="pop" style={delay(1000)} x1={nextPos.x} y1={nextPos.y - 55.4} x2={nextPos.x} y2={nextPos.y - 10} stroke="var(--line-strong)" strokeWidth="1" />
        )}

        {numbers.map((n) => {
          const { x, y } = dotPosition(n);
          const style = delay(1000 + (n - 1) * 70);
          if (n === next) return <circle key={n} className="pop" style={style} cx={x} cy={y} r="7.5" fill="var(--accent)" stroke="var(--surface-raised)" strokeWidth="2.5" />;
          if (n === TOTAL_SESSIONS) return <circle key={n} className="pop" style={style} cx={x} cy={y} r="6" fill="var(--ink)" stroke="var(--surface-raised)" strokeWidth="2" />;
          return (
            <circle key={n} className="pop" style={style} cx={x} cy={y} r="4.5" fill={completed.has(n) ? 'var(--ink)' : 'var(--surface-raised)'} stroke="var(--ink)" strokeWidth="1.5" />
          );
        })}

        {nextPos && next !== TOTAL_SESSIONS && (
          <text
            className="rise"
            style={delay(1100)}
            direction="rtl"
            textAnchor={leader ? 'end' : 'start'}
            x={leader ? nextPos.x - 10.4 : nextPos.x - 14}
            y={leader ? nextPos.y - 62 : nextPos.y - 2}
          >
            {strings.home.journeyNext(next!)}
          </text>
        )}
        <text className="rise" style={delay(1900)} direction="rtl" textAnchor="start" x={SUMMIT.x - 14} y={SUMMIT.y - 3}>
          {strings.home.journeySummit}
        </text>
      </svg>
    </section>
  );
}
