import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BackLink, Icon, LoadError, Loading, SaveIndicator, Tag, type SaveStatus } from '../components/ui';
import { strings } from '../content/strings';
import { useGates, useJournalEntries, useJournalQuestions, useNorthStar, useSaveJournalEntry, useSaveNorthStar, useSessions } from '../data/hooks';
import type { JournalQuestion, NorthStarVersion } from '../data/types';
import { formatDayMonth, pad2 } from '../lib/dates';
import { useAutosave, type Autosave } from '../lib/hooks';
import { isStationOpen } from '../lib/programme';
import { today as getToday } from '../lib/today';
import { latestNorthStar } from './Journal';

/** Lets the screen save every field before leaving, and show one overall save state. */
interface Registry {
  register: (id: string, flush: () => Promise<void>) => () => void;
  report: (id: string, status: SaveStatus) => void;
}

function useRegistered(id: string, field: Autosave, registry: Registry) {
  const { register, report } = registry;
  useEffect(() => register(id, field.flush), [id, field.flush, register]);
  useEffect(() => report(id, field.status), [id, field.status, report]);
}

function QuestionLabel({ question, htmlFor }: { question: JournalQuestion; htmlFor?: string }) {
  const content = (
    <>
      <span className="num">{pad2(question.sortOrder)}</span> · {question.body}
    </>
  );
  return htmlFor ? (
    <label htmlFor={htmlFor} className="question-label">
      {content}
    </label>
  ) : (
    <span className="question-label">{content}</span>
  );
}

function OpenField({ question, initial, registry }: { question: JournalQuestion; initial: string; registry: Registry }) {
  const save = useSaveJournalEntry();
  const field = useAutosave(initial, (body) => save.mutateAsync({ questionId: question.id, body }));
  useRegistered(question.id, field, registry);
  const id = `q-${question.id}`;
  return (
    <div className="stack stack--8">
      <QuestionLabel question={question} htmlFor={id} />
      <textarea id={id} className="textarea" placeholder={strings.station.placeholder} value={field.value} onChange={(e) => field.onChange(e.target.value)} onBlur={() => void field.flush().catch(() => undefined)} />
    </div>
  );
}

/**
 * The north-star question. From the second session onward the previous wording is shown
 * read-only above a field for the updated wording; the previous version is kept.
 */
function NorthStarField({ question, initial, previous, registry }: { question: JournalQuestion; initial: string; previous: NorthStarVersion | null; registry: Registry }) {
  const save = useSaveNorthStar();
  const field = useAutosave(initial, (body) => save.mutateAsync({ sessionNumber: question.sessionNumber, body }));
  useRegistered(question.id, field, registry);
  const id = `q-${question.id}`;
  const s = strings.station;
  return (
    <div className="stack stack--10">
      <QuestionLabel question={question} />
      {previous && (
        <div className="panel north-star north-star--sm">
          <Icon name="direction" />
          <span className="stack stack--4">
            <span className="caps muted">{s.previousNorthStar(previous.sessionNumber)}</span>
            <span className="north-star__text">{strings.journal.quote(previous.body)}</span>
          </span>
        </div>
      )}
      <label htmlFor={id} style={{ fontSize: 14, fontWeight: 600 }}>
        {previous ? s.updatedNorthStar : s.firstNorthStar}
      </label>
      <textarea id={id} className="textarea" value={field.value} onChange={(e) => field.onChange(e.target.value)} onBlur={() => void field.flush().catch(() => undefined)} />
    </div>
  );
}

export function Station() {
  const number = Number(useParams().number);
  const navigate = useNavigate();
  const sessions = useSessions();
  const gates = useGates();
  const questions = useJournalQuestions();
  const entries = useJournalEntries();
  const northStar = useNorthStar();
  const s = strings.station;

  const flushers = useRef(new Map<string, () => Promise<void>>());
  const [statuses, setStatuses] = useState<Record<string, SaveStatus>>({});
  const [leaving, setLeaving] = useState(false);
  const register = useCallback((id: string, flush: () => Promise<void>) => {
    flushers.current.set(id, flush);
    return () => void flushers.current.delete(id);
  }, []);
  const report = useCallback((id: string, status: SaveStatus) => setStatuses((prev) => (prev[id] === status ? prev : { ...prev, [id]: status })), []);
  const registry: Registry = { register, report };

  const values = Object.values(statuses);
  const overall: SaveStatus = values.includes('error') ? 'error' : values.includes('saving') ? 'saving' : values.includes('saved') ? 'saved' : 'idle';

  const session = sessions.data?.find((x) => x.number === number);
  const queries = [sessions, gates, questions, entries, northStar];
  const loaded = sessions.data && questions.data && entries.data && northStar.data;
  const open = session ? isStationOpen(session, getToday()) : false;
  const own = (questions.data ?? []).filter((q) => q.sessionNumber === number).sort((a, b) => a.sortOrder - b.sortOrder);

  async function saveAndBack() {
    setLeaving(true);
    try {
      await Promise.all([...flushers.current.values()].map((flush) => flush()));
      navigate('/journal');
    } catch {
      setLeaving(false);
    }
  }

  return (
    <>
      <main className="app-main" style={{ gap: 18 }}>
        <div className="row row--between">
          <BackLink to="/journal">{strings.journal.back}</BackLink>
          {loaded && open && own.length > 0 && <SaveIndicator status={overall} />}
        </div>
        {queries.some((q) => q.isError) && <LoadError onRetry={() => queries.forEach((q) => void q.refetch())} />}
        {!loaded && !queries.some((q) => q.isError) && <Loading />}
        {loaded && !session && <p className="meta">{strings.sessions.notFound}</p>}
        {loaded && session && (
          <>
            <div className="page-title">
              <div className="row row--gap8">
                <Tag tone="ink">{strings.common.session(session.number)}</Tag>
                {session.gateNumber && <Tag tone="muted">{strings.common.gate(session.gateNumber)}</Tag>}
              </div>
              <span className="page-title__bar" aria-hidden="true" />
              <h1>{session.title ?? strings.sessions.titleTbd}</h1>
              <Link className="link" to={`/sessions/${session.number}`}>
                {s.toSession}
                <Icon name="arrow" />
              </Link>
            </div>
            {!open && (
              <div className="note note--info stack stack--4">
                <strong>{s.lockedTitle}</strong>
                <span>{s.lockedText(session.date ? formatDayMonth(session.date) : null)}</span>
              </div>
            )}
            {open && own.length === 0 && <p className="note note--info">{s.noQuestions}</p>}
            {open &&
              own.map((question) =>
                question.kind === 'north_star' ? (
                  <NorthStarField
                    key={question.id}
                    question={question}
                    registry={registry}
                    initial={northStar.data.find((v) => v.sessionNumber === number)?.body ?? ''}
                    previous={latestNorthStar(northStar.data, number)}
                  />
                ) : (
                  <OpenField key={question.id} question={question} registry={registry} initial={entries.data.find((e) => e.questionId === question.id)?.body ?? ''} />
                ),
              )}
          </>
        )}
      </main>
      {loaded && session && open && own.length > 0 && (
        <footer className="app-footer">
          <button type="button" className="btn btn--primary btn--grow" disabled={leaving} onClick={() => void saveAndBack()}>
            {s.saveAndBack}
          </button>
        </footer>
      )}
    </>
  );
}
