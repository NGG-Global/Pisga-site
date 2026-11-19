import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { strings } from '../content/strings';
import { iconPath, type IconName } from '../theme/brand';

/** Icons are decorative companions to a label, used exactly as drawn. */
export function Icon({ name, size }: { name: IconName; size?: number }) {
  return <img src={iconPath(name)} alt="" width={size} height={size} style={size ? { width: size, height: size } : undefined} />;
}

export function delay(ms: number): CSSProperties {
  return { animationDelay: `${ms}ms` };
}

export function PageTitle({ title, children, small, rise = true }: { title: string; children?: ReactNode; small?: boolean; rise?: boolean }) {
  return (
    <div className={`page-title${small ? ' page-title--sm' : ''}${rise ? ' rise' : ''}`}>
      <span className="page-title__bar" aria-hidden="true" />
      <h1>{title}</h1>
      {children}
    </div>
  );
}

export type TagTone = 'todo' | 'done' | 'ink' | 'muted';

/** A status tag always pairs its tint with a word and the small triangle; never colour alone. */
export function Tag({ tone, children }: { tone: TagTone; children: ReactNode }) {
  return <span className={`tag tag--${tone}`}>{children}</span>;
}

export function Ring({ children, current, small }: { children: ReactNode; current?: boolean; small?: boolean }) {
  return (
    <span className={`ring${current ? ' ring--current' : ''}${small ? ' ring--sm' : ''}`} aria-hidden="true">
      {children}
    </span>
  );
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className="link" to={to}>
      {children}
    </Link>
  );
}

export function Loading() {
  return (
    <p className="meta" role="status">
      {strings.common.loading}
    </p>
  );
}

export function LoadError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="note note--error stack stack--8" role="alert">
      <span>{strings.common.loadFailed}</span>
      {onRetry && (
        <button type="button" className="link" onClick={onRetry}>
          {strings.common.retry}
        </button>
      )}
    </div>
  );
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function SaveIndicator({ status }: { status: SaveStatus }) {
  const text =
    status === 'saving' ? strings.common.saving : status === 'error' ? strings.common.saveFailed : strings.common.savedAuto;
  return (
    <span className="meta" role="status" style={status === 'error' ? { color: 'var(--danger)' } : undefined}>
      {text}
    </span>
  );
}
