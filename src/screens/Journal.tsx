import { Link } from 'react-router-dom';
import { delay, Icon, LoadError, Loading, PageTitle, Ring, Tag } from '../components/ui';
import { strings } from '../content/strings';
import {
  useGates, useJournalEntries, useJournalQuestions, useMapping, useNorthStar, useSessions, useSettings, useStatements,
} from '../data/hooks';
import type { JournalEntry, JournalQuestion, NorthStarVersion, Session } from '../data/types';
import { formatDayMonth, pad2 } from '../lib/dates';
import { isEndRoundOpen, isQuestionnaireComplete, isStationOpen, nextSession } from '../lib/programme';
import { today as getToday } from '../lib/today';

export function latestNorthStar(versions: NorthStarVersion[], beforeSession = Infinity): NorthStarVersion | null {
  const written = versions.filter((v) => v.body.trim() !== '' && v.sessionNumber < beforeSession);
  return written.sort((a, b) => b.sessionNumber - a.sessionNumber)[0] ?? null;
}

export function isStationWritten(session: Session, questions: JournalQuestion[], entries: JournalEntry[], northStar: NorthStarVersion[]): boolean {
  const ids = new Set(questions.filter((q) => q.sessionNumber === session.number).map((q) => q.id));
  return (
    entries.some((e) => ids.has(e.questionId) && e.body.trim() !== '') ||
    northStar.some((v) => v.sessionNumber === session.number && v.body.trim() !== '')
  );
}

function MappingCards({ sessions, today }: { sessions: Session[]; today: string }) {
  const settings = useSettings();
  const statements = useStatements();
  const gates = useGates();
  const mapping = useMapping();
  if (!settings.data || !statements.data || !gates.data || !mapping.data) return null;

  const c = strings.mappingCard;
  const ready = settings.data.mappingPublished && isQuestionnaireComplete(statements.data, gates.data, settings.data.mappingOpenQuestion);
  const startDone = !!mapping.data.completedAt.start;
  const endDone = !!mapping.data.completedAt.end;
  const endOpen = isEndRoundOpen(sessions, today);

  return (
    <>
      {startDone || endDone ? (
        <Link className="card tap-card rise" style={delay(240)} to="/journal/map">
          <span className="row row--between">
            <strong className="card-title">{c.mapTitle}</strong>
            <Tag tone="done">{c.doneTag}</Tag>
          </span>
          <span className="meta">{startDone && endDone ? c.mapScopeBoth : c.mapScope}</span>
        </Link>
      ) : ready && !endOpen ? (
        <Link className="card tap-card rise" style={delay(240)} to="/journal/mapping/start">
          <span className="row row--between">
            <strong className="card-title">{c.startTitle}</strong>
            <Tag tone="todo">{c.openTag}</Tag>
          </span>
          <span className="meta">{c.scope}</span>
        </Link>
      ) : !ready ? (
        <div className="card tap-card rise" style={delay(240)}>
          <span className="row row--between">
            <strong className="card-title">{c.startTitle}</strong>
            <Tag tone="muted">{c.preparingTag}</Tag>
          </span>
          <span className="meta">{c.preparingText}</span>
        </div>
      ) : null}
      {ready && endOpen && !endDone && (
        <Link className="card tap-card rise" style={delay(300)} to="/journal/mapping/end">
          <span className="row row--between">
            <strong className="card-title">{c.endTitle}</strong>
            <Tag tone="todo">{c.openTag}</Tag>
          </span>
          <span className="meta">{c.scope}</span>
        </Link>
      )}
    </>
  );
}

export function Journal() {
  const sessions = useSessions();
  const questions = useJournalQuestions();
  const entries = useJournalEntries();
  const northStar = useNorthStar();
  const today = getToday();
  const j = strings.journal;
  const star = northStar.data ? latestNorthStar(northStar.data) : null;
  const next = sessions.data ? nextSession(sessions.data, today)?.number : undefined;
  const failed = sessions.isError || questions.isError || entries.isError || northStar.isError;

  return (
    <main className="app-main" style={{ gap: 14 }}>
      <div className="row row--between row--end rise">
        <PageTitle title={j.title} rise={false}>
          <span className="meta">{j.privacy}</span>
        </PageTitle>
        <Link className="btn btn--outline" to="/journal/export">
          {j.export}
        </Link>
      </div>

      <section className="panel north-star rise" style={delay(120)}>
        <Icon name="direction" />
        <span className="stack stack--4">
          <span className="caps muted">{j.northStar}</span>
          {star ? <span className="north-star__text">{j.quote(star.body)}</span> : <span className="meta">{j.northStarEmpty}</span>}
        </span>
      </section>

      {failed && <LoadError onRetry={() => void Promise.all([sessions.refetch(), questions.refetch(), entries.refetch(), northStar.refetch()])} />}
      {sessions.isPending && <Loading />}
      {sessions.data && <MappingCards sessions={sessions.data} today={today} />}

      {sessions.data && (
        <section className="stack rise" style={delay(360)}>
          <h2 className="h2" style={{ marginBottom: 4 }}>
            {j.stations}
          </h2>
          <div className="rows">
            {sessions.data.map((session) => {
              const open = isStationOpen(session, today);
              const written = open && isStationWritten(session, questions.data ?? [], entries.data ?? [], northStar.data ?? []);
              const title = session.title ?? strings.sessions.titleTbd;
              const ring = (
                <Ring small current={session.number === next || (open && !written)}>
                  {pad2(session.number)}
                </Ring>
              );
              return open ? (
                <Link key={session.number} className="station" to={`/journal/station/${session.number}`}>
                  {ring}
                  <strong className="station__title" style={{ fontWeight: 600 }}>
                    {title}
                  </strong>
                  <Tag tone={written ? 'done' : 'todo'}>{written ? j.written : j.openForWriting}</Tag>
                </Link>
              ) : (
                <div key={session.number} className={`station${session.number === next ? '' : ' station--locked'}`}>
                  {ring}
                  {session.number === next ? (
                    <strong className="station__title" style={{ fontWeight: 600 }}>
                      {title}
                    </strong>
                  ) : (
                    <span className="station__title">{title}</span>
                  )}
                  <Tag tone={session.number === next ? 'ink' : 'muted'}>
                    {session.date ? strings.common.opensOn(formatDayMonth(session.date)) : strings.common.tbd}
                  </Tag>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
