import { Link } from 'react-router-dom';
import { Icon, LoadError, Loading, Ring } from '../../components/ui';
import { strings } from '../../content/strings';
import { useSessions } from '../../data/hooks';
import { formatDate, pad2 } from '../../lib/dates';

export function AdminSessions() {
  const sessions = useSessions();
  const s = strings.sessions;
  return (
    <section className="card rows" style={{ padding: '4px 16px' }}>
      {sessions.isPending && <Loading />}
      {sessions.isError && <LoadError onRetry={() => void sessions.refetch()} />}
      {sessions.data?.map((session) => (
        <Link key={session.number} className="admin-row" style={{ textDecoration: 'none', color: 'var(--ink)' }} to={String(session.number)}>
          <Ring small>{pad2(session.number)}</Ring>
          <span className="admin-row__text">
            <strong style={{ fontWeight: 600 }}>{session.title ?? s.titleTbd}</strong>
            <span className="meta">
              {session.date ? <span className="ltr">{formatDate(session.date)}</span> : s.dateTbd} · {session.location ?? s.locationTbd}
            </span>
          </span>
          <span className="link" style={{ minHeight: 0 }}>
            {strings.admin.edit}
            <Icon name="arrow" />
          </span>
        </Link>
      ))}
    </section>
  );
}
