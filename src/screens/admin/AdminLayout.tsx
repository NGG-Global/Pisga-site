import { NavLink, Outlet } from 'react-router-dom';
import { PageTitle } from '../../components/ui';
import { strings } from '../../content/strings';
import { UserFacingError } from '../../data/api';

/** Content management for the two staff roles. Personal participant data is not reachable from here. */
export function AdminLayout() {
  const a = strings.admin;
  const tabs: Array<[string, string]> = [
    ['sessions', a.tabs.sessions],
    ['mapping', a.tabs.mapping],
    ['journal', a.tabs.journal],
    ['advisor', a.tabs.advisor],
  ];
  return (
    <main className="app-main">
      <PageTitle title={a.title} rise={false}>
        <span className="meta">{a.subtitle}</span>
      </PageTitle>
      <nav className="subtabs" aria-label={a.title}>
        {tabs.map(([to, label]) => (
          <NavLink key={to} to={to}>
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </main>
  );
}

export function SaveBar({ busy, saved, error, disabled, label }: { busy: boolean; saved: boolean; error: string | null; disabled?: boolean; label?: string }) {
  return (
    <div className="stack stack--8">
      {error && (
        <p className="note note--error" role="alert">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="note note--ok" role="status">
          {strings.admin.saved}
        </p>
      )}
      <button type="submit" className="btn btn--primary" style={{ alignSelf: 'flex-start' }} disabled={busy || disabled}>
        {busy ? strings.common.saving : (label ?? strings.common.save)}
      </button>
    </div>
  );
}

export function errorText(error: unknown): string {
  return error instanceof UserFacingError ? error.message : strings.common.saveFailed;
}
