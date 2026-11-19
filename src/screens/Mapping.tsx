import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { BackLink, LoadError, Loading, PageTitle, SaveIndicator, type SaveStatus } from '../components/ui';
import { strings } from '../content/strings';
import {
  useCompleteMapping, useGates, useMapping, useSaveMappingOpenAnswer, useSaveMappingResponse, useSessions, useSettings, useStatements,
} from '../data/hooks';
import type { Gate, MappingData, MappingStatement, Round, Settings } from '../data/types';
import { useAutosave } from '../lib/hooks';
import { isEndRoundOpen, isQuestionnaireComplete, sortStatements, TOTAL_GATES } from '../lib/programme';
import { today as getToday } from '../lib/today';

const ADVANCE_AFTER_MS = 520;
const SCORES = [1, 2, 3, 4, 5];

interface FlowProps {
  round: Round;
  statements: MappingStatement[];
  gates: Gate[];
  settings: Settings;
  mapping: MappingData;
}

function OpenQuestion({ round, settings, initial, missing, onGoToMissing, onStatus }: {
  round: Round;
  settings: Settings;
  initial: string;
  missing: number;
  onGoToMissing: () => void;
  onStatus: (status: SaveStatus) => void;
}) {
  const navigate = useNavigate();
  const saveOpen = useSaveMappingOpenAnswer();
  const complete = useCompleteMapping();
  const field = useAutosave(initial, (body) => saveOpen.mutateAsync({ round, body }));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const m = strings.mapping;

  useEffect(() => onStatus(field.status), [field.status, onStatus]);

  async function finish() {
    setBusy(true);
    setFailed(false);
    try {
      await field.flush();
      await complete.mutateAsync(round);
      navigate('/journal/map', { replace: true });
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle title={m.openTitle} rise={false} />
      <div className="card stack stack--12 rise" style={{ padding: '20px 16px' }}>
        <label htmlFor="open-answer" className="statement__text">
          {settings.mappingOpenQuestion}
        </label>
        <textarea
          id="open-answer"
          className="textarea"
          style={{ minHeight: 140 }}
          placeholder={m.openPlaceholder}
          value={field.value}
          onChange={(e) => field.onChange(e.target.value)}
          onBlur={() => void field.flush().catch(() => undefined)}
        />
      </div>
      {missing > 0 && (
        <div className="note note--info stack stack--4">
          <span>{m.missing(missing)}</span>
          <button type="button" className="link" onClick={onGoToMissing}>
            {m.toFirstMissing}
          </button>
        </div>
      )}
      {failed && (
        <p className="note note--error" role="alert">
          {strings.common.saveFailed}
        </p>
      )}
      <button type="button" className="btn btn--primary" disabled={busy || missing > 0} onClick={() => void finish()}>
        {busy ? m.finishing : m.finish}
      </button>
    </>
  );
}

function Flow({ round, statements, gates, settings, mapping }: FlowProps) {
  const ordered = useMemo(() => sortStatements(statements), [statements]);
  const total = ordered.length;
  const [answers, setAnswers] = useState<Record<string, number>>(() =>
    Object.fromEntries(mapping.responses.filter((r) => r.round === round).map((r) => [r.statementId, r.score])),
  );
  const firstMissing = () => {
    const i = ordered.findIndex((s) => answers[s.id] === undefined);
    return i === -1 ? total : i;
  };
  // Resume where the participant stopped. Index `total` is the open question.
  const [index, setIndex] = useState(firstMissing);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const save = useSaveMappingResponse();
  const timer = useRef<number | undefined>(undefined);
  const m = strings.mapping;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const answered = ordered.filter((s) => answers[s.id] !== undefined).length;
  const percent = Math.max(6, Math.round((answered / total) * 100));
  const statement = index < total ? ordered[index] : null;
  const gate = statement ? gates.find((g) => g.number === statement.gateNumber) : undefined;

  async function pick(target: MappingStatement, score: number) {
    window.clearTimeout(timer.current);
    setAnswers((prev) => ({ ...prev, [target.id]: score }));
    setStatus('saving');
    const started = Date.now();
    try {
      await save.mutateAsync({ round, statementId: target.id, score });
      setStatus('saved');
      // Choosing an answer advances automatically, once the answer is safely stored.
      timer.current = window.setTimeout(() => setIndex((i) => (ordered[i]?.id === target.id ? i + 1 : i)), Math.max(0, ADVANCE_AFTER_MS - (Date.now() - started)));
    } catch {
      setStatus('error');
    }
  }

  return (
    <main className="app-main app-main--focused">
      <div className="row row--between">
        <BackLink to="/journal">{strings.journal.back}</BackLink>
        <SaveIndicator status={status} />
      </div>

      <div className="stack stack--6">
        <div className="row row--between" style={{ fontSize: 14 }}>
          <strong style={{ fontWeight: 600 }}>{statement ? m.statementOf(index + 1, total) : m.openTitle}</strong>
          <span className="muted">{statement ? m.gateOf(statement.gateNumber, TOTAL_GATES) : m.lastStep}</span>
        </div>
        <div className="progress" aria-hidden="true">
          <span style={{ width: `${percent}%` }} />
        </div>
      </div>

      {statement ? (
        <>
          <PageTitle title={gate?.title ?? strings.common.gate(statement.gateNumber)} rise={false}>
            <span className="muted">{m.prompt}</span>
          </PageTitle>
          <fieldset key={statement.id} className="card statement rise">
            <legend className="sr-only">{m.legend(index + 1)}</legend>
            <span className="statement__text">{statement.body}</span>
            <div className="scale">
              {SCORES.map((v) => (
                <button key={v} type="button" aria-pressed={answers[statement.id] === v} aria-label={m.scoreAria(v)} onClick={() => void pick(statement, v)}>
                  {v}
                </button>
              ))}
            </div>
            <div className="scale__ends">
              <span>{m.low}</span>
              <span>{m.high}</span>
            </div>
          </fieldset>
          <div className="row row--between">
            {index > 0 ? (
              <button type="button" className="link" onClick={() => setIndex(index - 1)}>
                {m.previous}
              </button>
            ) : (
              <span />
            )}
            {answers[statement.id] !== undefined && (
              <button type="button" className="link" onClick={() => setIndex(index + 1)}>
                {index + 1 < total ? m.next : m.toOpenQuestion}
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <OpenQuestion
            round={round}
            settings={settings}
            initial={mapping.openAnswers[round] ?? ''}
            missing={total - answered}
            onGoToMissing={() => setIndex(firstMissing())}
            onStatus={setStatus}
          />
          <button type="button" className="link" onClick={() => setIndex(total - 1)}>
            {m.previous}
          </button>
        </>
      )}
    </main>
  );
}

export function Mapping() {
  const params = useParams();
  const round: Round | null = params.round === 'start' || params.round === 'end' ? params.round : null;
  const sessions = useSessions();
  const settings = useSettings();
  const statements = useStatements();
  const gates = useGates();
  const mapping = useMapping();
  const m = strings.mapping;
  // The completion check applies on arrival only, so that finishing does not bounce the redirect.
  const [arrivedComplete, setArrivedComplete] = useState<boolean | null>(null);
  useEffect(() => {
    if (round && mapping.data && arrivedComplete === null) setArrivedComplete(!!mapping.data.completedAt[round]);
  }, [round, mapping.data, arrivedComplete]);

  if (!round) return <Navigate to="/journal" replace />;
  const queries = [sessions, settings, statements, gates, mapping];
  const notice = (title: string, text: string) => (
    <main className="app-main app-main--focused">
      <BackLink to="/journal">{strings.journal.back}</BackLink>
      <PageTitle title={title} />
      <p className="muted">{text}</p>
    </main>
  );

  if (queries.some((q) => q.isError)) {
    return (
      <main className="app-main app-main--focused">
        <BackLink to="/journal">{strings.journal.back}</BackLink>
        <LoadError onRetry={() => queries.forEach((q) => void q.refetch())} />
      </main>
    );
  }
  if (!sessions.data || !settings.data || !statements.data || !gates.data || !mapping.data || arrivedComplete === null) {
    return (
      <main className="app-main app-main--focused">
        <Loading />
      </main>
    );
  }
  if (arrivedComplete) return <Navigate to="/journal/map" replace />;
  if (!settings.data.mappingPublished || !isQuestionnaireComplete(statements.data, gates.data, settings.data.mappingOpenQuestion)) {
    return notice(m.notReadyTitle, m.notReadyText);
  }
  if (round === 'end' && !isEndRoundOpen(sessions.data, getToday())) return notice(strings.mappingCard.endTitle, m.endNotOpenText);

  return <Flow round={round} statements={statements.data} gates={gates.data} settings={settings.data} mapping={mapping.data} />;
}
