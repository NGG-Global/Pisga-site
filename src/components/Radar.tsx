import { strings } from '../content/strings';
import type { GateAverage } from '../lib/programme';

/** Radar over the seven gates. Geometry follows the design: centre 150,150 and radius 110 for a score of 5. */
const CENTER = 150;
const RADIUS = 110;
const LABELS: Array<[number, number]> = [[150, 30], [252, 78], [276, 180], [208, 270], [92, 270], [24, 180], [48, 78]];

function point(index: number, score: number): [number, number] {
  const angle = (-90 + (index * 360) / 7) * (Math.PI / 180);
  const r = (score / 5) * RADIUS;
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)];
}

const ring = (score: number) => Array.from({ length: 7 }, (_, i) => point(i, score).map((v) => v.toFixed(1)).join(',')).join(' ');
const shape = (values: GateAverage[]) => values.map((v, i) => point(i, v.average ?? 0).map((n) => n.toFixed(1)).join(',')).join(' ');

export function Radar({ primary, comparison }: { primary: GateAverage[]; comparison?: GateAverage[] }) {
  return (
    <div className="radar">
      <svg role="img" aria-label={strings.map.radarAria} width="270" height="246" viewBox="10 14 280 262">
        <polygon points={ring(5)} fill="var(--surface-raised)" stroke="var(--line-strong)" strokeWidth="1.2" strokeLinejoin="round" />
        <polygon points={ring(2.5)} fill="none" stroke="var(--line)" strokeWidth="1" strokeLinejoin="round" />
        <g stroke="var(--line)" strokeWidth="1">
          {Array.from({ length: 7 }, (_, i) => {
            const [x, y] = point(i, 5);
            return <line key={i} x1={CENTER} y1={CENTER} x2={x.toFixed(1)} y2={y.toFixed(1)} />;
          })}
        </g>
        {comparison && (
          <polygon points={shape(comparison)} fill="none" stroke="var(--ink-muted)" strokeWidth="1.5" strokeDasharray="5 4" strokeLinejoin="round" />
        )}
        <g className="grow">
          <polygon points={shape(primary)} fill="var(--sky)" fillOpacity="0.55" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
          <g fill="var(--accent)" stroke="var(--surface-raised)" strokeWidth="1.5">
            {primary.map((v, i) => {
              const [x, y] = point(i, v.average ?? 0);
              return <circle key={v.gate.number} cx={x.toFixed(1)} cy={y.toFixed(1)} r="4.5" />;
            })}
          </g>
        </g>
        <g textAnchor="middle" aria-hidden="true">
          {primary.map((v, i) => (
            <text key={v.gate.number} x={LABELS[i][0]} y={LABELS[i][1]}>
              {String(v.gate.number).padStart(2, '0')}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
