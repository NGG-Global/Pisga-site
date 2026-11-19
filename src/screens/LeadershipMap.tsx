import { Link } from 'react-router-dom';
import { Radar } from '../components/Radar';
import { BackLink, delay, LoadError, Loading, PageTitle } from '../components/ui';
import { strings } from '../content/strings';
import { useGates, useMapping, useSessions, useSettings, useStatements } from '../data/hooks';
import { pad2 } from '../lib/dates';
import { formatAverage, gateAverages, isEndRoundOpen } from '../lib/programme';
import { today as getToday } from '../lib/today';

export function LeadershipMap() {
  const gates = useGates();
  const statements = useStatements();
  const mapping = useMapping();
  const settings = useSettings();
  const sessions = useSessions();
  const m = strings.map;
  const queries = [gates, statements, mapping, settings, sessions];
  const ready = gates.data && statements.data && mapping.data && settings.data && sessions.data;

  const startDone = !!mapping.data?.completedAt.start;
  const endDone = !!mapping.data?.completedAt.end;
  const start = ready ? gateAverages(gates.data, statements.data, mapping.data.responses, 'start') : [];
  const end = ready ? gateAverages(gates.data, statements.data, mapping.data.responses, 'end') : [];
  const both = startDone && endDone;
  const primary = endDone ? end : start;
  const openAnswers = ready
    ? ([['start', m.start], ['end', m.end]] as const).filter(([round]) => mapping.data.completedAt[round] && (mapping.data.openAnswers[round] ?? '').trim() !== '')
    : [];

  return (
    <main className="app-main app-main--focused" style={{ gap: 10 }}>
      <BackLink to="/journal">{strings.journal.back}</BackLink>
      <PageTitle title={m.title} small />
      {queries.some((q) => q.isError) && <LoadError onRetry={() => queries.forEach((q) => void q.refetch())} />}
      {!ready && !queries.some((q) => q.isError) && <Loading />}
      {ready && !startDone && !endDone && <p className="muted">{m.empty}</p>}
      {ready && (startDone || endDone) && (
        <>
          <Radar primary={primary} comparison={both ? start : undefined} />
          {both && (
            <div className="legend" style={{ justifyContent: 'center' }}>
              <span>
                <i className="dashed" aria-hidden="true" />
                {m.start}
              </span>
              <span>
                <i aria-hidden="true" />
                {m.end}
              </span>
            </div>
          )}
          <section className="card averages rows rise" style={delay(700)}>
            {both && (
              <div className="meta">
                <span />
                <span>
                  {m.start} · {m.end}
                </span>
              </div>
            )}
            {primary.map((row, i) => (
              <div key={row.gate.number}>
                <span>
                  <strong className="num">{pad2(row.gate.number)}</strong> · {row.gate.title}
                </span>
                <strong className="ltr">{both ? `${formatAverage(start[i].average)} · ${formatAverage(end[i].average)}` : formatAverage(row.average)}</strong>
              </div>
            ))}
          </section>
          {openAnswers.map(([round, label]) => (
            <section key={round} className="panel stack stack--6 rise" style={delay(820)}>
              <span className="caps muted">{both ? `${m.openAnswer} · ${label}` : m.openAnswer}</span>
              <span className="meta">{settings.data.mappingOpenQuestion}</span>
              <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{mapping.data.openAnswers[round]}</p>
            </section>
          ))}
          {!endDone && isEndRoundOpen(sessions.data, getToday()) && settings.data.mappingPublished && (
            <Link className="btn btn--outline" to="/journal/mapping/end">
              {m.endCta}
            </Link>
          )}
        </>
      )}
      <Link className="btn btn--primary" style={{ marginTop: 6 }} to="/journal">
        {m.backCta}
      </Link>
    </main>
  );
}
