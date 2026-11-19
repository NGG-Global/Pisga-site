import { Link } from 'react-router-dom';
import { delay, Icon, LoadError, Loading, PageTitle, Ring } from '../components/ui';
import { strings } from '../content/strings';
import { useSessions } from '../data/hooks';
import type { Session } from '../data/types';
import { formatDate, pad2 } from '../lib/dates';
import { nextSession } from '../lib/programme';
import { today as getToday } from '../lib/today';

export function speakersLine(session: Session): string {
  return strings.sessions.speakers(session.speakers.length ? session.speakers.map((s) => s.name).join(', ') : strings.common.tbd);
}

export function Sessions() {
  const sessions = useSessions();
  const today = getToday();
  const next = sessions.data ? nextSession(sessions.data, today)?.number : undefined;
  const s = strings.sessions;

  return (
    <main className="app-main app-main--tight">
      <PageTitle title={s.title}>
        <span className="meta">{s.subtitle}</span>
      </PageTitle>
      {sessions.isPending && <Loading />}
      {sessions.isError && <LoadError onRetry={() => void sessions.refetch()} />}
      {sessions.data?.map((session, i) => (
        <Link key={session.number} className="card session-card rise" style={delay(120 + Math.min(i, 6) * 80)} to={`/sessions/${session.number}`}>
          <Ring current={session.number === next}>{pad2(session.number)}</Ring>
          <span className="session-card__text">
            <strong className="card-title">{session.title ?? s.titleTbd}</strong>
            <span className="session-card__date">
              {strings.common.session(session.number)} · {session.date ? <span className="ltr">{formatDate(session.date)}</span> : s.dateTbd}
            </span>
            <span className="meta">
              {!session.location && session.speakers.length === 0
                ? s.locationAndSpeakersTbd
                : `${session.location ?? s.locationTbd} · ${speakersLine(session)}`}
            </span>
          </span>
          <Icon name="arrow" />
        </Link>
      ))}
    </main>
  );
}
