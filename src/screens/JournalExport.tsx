import { useMe } from '../auth/AuthProvider';
import { BackLink, LoadError, Loading, PageTitle } from '../components/ui';
import { strings } from '../content/strings';
import { useGates, useJournalEntries, useJournalQuestions, useMapping, useNorthStar, useSessions, useSettings, useStatements } from '../data/hooks';
import type { Round } from '../data/types';
import { formatDate, pad2 } from '../lib/dates';
import { formatAverage, gateAverages, isStationOpen } from '../lib/programme';
import { today as getToday } from '../lib/today';
import { brand } from '../theme/brand';
import { latestNorthStar } from './Journal';

/**
 * A print-ready summary of the participant's own journal, for a one-to-one with their manager.
 * It is produced in the participant's browser; nothing is sent anywhere. The browser's print
 * dialog saves it as a PDF file.
 */
export function JournalExport() {
  const me = useMe();
  const sessions = useSessions();
  const gates = useGates();
  const statements = useStatements();
  const settings = useSettings();
  const mapping = useMapping();
  const questions = useJournalQuestions();
  const entries = useJournalEntries();
  const northStar = useNorthStar();
  const today = getToday();
  const x = strings.exportDoc;
  const queries = [sessions, gates, statements, settings, mapping, questions, entries, northStar];
  const ready = sessions.data && gates.data && statements.data && settings.data && mapping.data && questions.data && entries.data && northStar.data;

  const star = northStar.data ? latestNorthStar(northStar.data) : null;
  const versions = (northStar.data ?? []).filter((v) => v.body.trim() !== '').sort((a, b) => a.sessionNumber - b.sessionNumber);
  const rounds = (['start', 'end'] as Round[]).filter((r) => mapping.data?.completedAt[r]);
  const stations = (sessions.data ?? [])
    .filter((s) => isStationOpen(s, today))
    .map((session) => ({
      session,
      items: (questions.data ?? [])
        .filter((q) => q.sessionNumber === session.number && q.kind === 'open')
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((q) => ({ question: q, answer: entries.data?.find((e) => e.questionId === q.id)?.body.trim() ?? '' })),
    }))
    .filter((station) => station.items.some((item) => item.answer !== ''));
  const hasContent = !!star || rounds.length > 0 || stations.length > 0;

  return (
    <main className="app-main app-main--focused">
      <div className="no-print stack stack--12">
        <BackLink to="/journal">{strings.journal.back}</BackLink>
        <PageTitle title={x.title} small rise={false}>
          <span className="meta">{x.intro}</span>
        </PageTitle>
        <button type="button" className="btn btn--primary" disabled={!ready || !hasContent} onClick={() => window.print()}>
          {x.action}
        </button>
      </div>
      {queries.some((q) => q.isError) && <LoadError onRetry={() => queries.forEach((q) => void q.refetch())} />}
      {!ready && !queries.some((q) => q.isError) && <Loading />}
      {ready && !hasContent && <p className="note note--info">{x.noContent}</p>}
      {ready && hasContent && (
        <article className="doc">
          <img className="doc__logo" src={brand.logos.programmeHorizontal} alt={`${brand.programmeName}, ${brand.tagline}`} />
          <section>
            <h2>{x.docTitle}</h2>
            <span className="meta">
              {me.displayName} · {x.produced(formatDate(today))}
            </span>
          </section>

          {star && (
            <section>
              <h2>{strings.journal.northStar}</h2>
              <p style={{ fontWeight: 600 }}>{strings.journal.quote(star.body)}</p>
              {versions.length > 1 && (
                <>
                  <h3>{x.northStarHistory}</h3>
                  {versions.map((v) => (
                    <p key={v.sessionNumber}>
                      {strings.common.session(v.sessionNumber)} · {strings.journal.quote(v.body)}
                    </p>
                  ))}
                </>
              )}
            </section>
          )}

          {rounds.map((round) => (
            <section key={round}>
              <h2>
                {strings.map.title} · {round === 'start' ? strings.map.start : strings.map.end}
              </h2>
              <div className="rows">
                {gateAverages(gates.data, statements.data, mapping.data.responses, round).map((row) => (
                  <div key={row.gate.number} className="row row--between" style={{ padding: '4px 0' }}>
                    <span>
                      {pad2(row.gate.number)} · {row.gate.title}
                    </span>
                    <strong>{formatAverage(row.average)}</strong>
                  </div>
                ))}
              </div>
              {(mapping.data.openAnswers[round] ?? '').trim() !== '' && (
                <>
                  <h3>{settings.data.mappingOpenQuestion}</h3>
                  <p>{mapping.data.openAnswers[round]}</p>
                </>
              )}
            </section>
          ))}

          {stations.map(({ session, items }) => (
            <section key={session.number}>
              <h2>
                {strings.common.session(session.number)}
                {session.title ? ` · ${session.title}` : ''}
              </h2>
              {items.map(({ question, answer }) => (
                <div key={question.id} className="stack stack--4">
                  <h3>{question.body}</h3>
                  <p className={answer ? undefined : 'meta'}>{answer || x.noAnswer}</p>
                </div>
              ))}
            </section>
          ))}
        </article>
      )}
    </main>
  );
}
