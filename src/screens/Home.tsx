import { Link } from 'react-router-dom';
import { useAuth, useMe } from '../auth/AuthProvider';
import { JourneyMountain } from '../components/JourneyMountain';
import { delay, LoadError, Loading, PageTitle, Tag } from '../components/ui';
import { strings } from '../content/strings';
import { useGates, useMapping, useSessions, useSettings, useStatements } from '../data/hooks';
import { isParticipant, type Round, type Session } from '../data/types';
import { formatDate } from '../lib/dates';
import { useCountUp } from '../lib/hooks';
import { daysUntil, isEndRoundOpen, isQuestionnaireComplete, nextSession } from '../lib/programme';
import { today as getToday } from '../lib/today';
import { brand } from '../theme/brand';

function Hero({ session, today }: { session: Session | null; today: string }) {
  const days = session ? daysUntil(session, today) : null;
  const shown = useCountUp(days ?? 0);
  const h = strings.home;

  return (
    <section className="hero">
      <img className="hero__range plane" src={brand.graphics.rangeOnDark} alt="" />
      {!session ? (
        <strong className="hero__title rise" style={delay(700)}>
          {h.heroAllDone}
        </strong>
      ) : (
        <>
          <span className="hero__label rise" style={delay(700)}>
            {days !== null && days > 1 ? h.heroIn : h.heroNext}
          </span>
          {days === null ? (
            <span className="hero__gap" />
          ) : days > 1 ? (
            <div className="hero__count rise" style={delay(700)}>
              <span className="hero__days">{shown}</span>
              <span className="hero__unit">{h.days}</span>
            </div>
          ) : (
            <span className="hero__word rise" style={delay(700)}>
              {days === 0 ? h.today : h.tomorrow}
            </span>
          )}
          <strong className="hero__title rise" style={delay(820)}>
            {session.title ?? strings.common.session(session.number)}
          </strong>
          <span className="hero__meta rise" style={delay(820)}>
            {strings.common.session(session.number)} · {session.date ? <span className="ltr">{formatDate(session.date)}</span> : h.heroDateTbd}
          </span>
          <Link className="btn btn--on-dark rise" style={delay(940)} to={`/sessions/${session.number}`}>
            {h.heroCta}
          </Link>
        </>
      )}
    </section>
  );
}

/** The task card of the mapping questionnaire, for the round that is currently relevant. */
function MappingTask({ sessions, today }: { sessions: Session[]; today: string }) {
  const settings = useSettings();
  const statements = useStatements();
  const gates = useGates();
  const mapping = useMapping();
  if (!settings.data || !statements.data || !gates.data || !mapping.data) return null;

  const c = strings.mappingCard;
  const round: Round = isEndRoundOpen(sessions, today) ? 'end' : 'start';
  const title = round === 'end' ? c.endTitle : c.startTitle;
  const ready = settings.data.mappingPublished && isQuestionnaireComplete(statements.data, gates.data, settings.data.mappingOpenQuestion);
  const done = !!mapping.data.completedAt[round];

  return (
    <section className="panel stack stack--8 rise" style={delay(360)}>
      <div className="row row--between">
        <strong className="card-title">{title}</strong>
        <Tag tone={done ? 'done' : ready ? 'todo' : 'muted'}>{done ? c.doneTag : ready ? c.todoTag : c.preparingTag}</Tag>
      </div>
      <span className="meta">{done ? c.doneText : !ready ? c.preparingText : round === 'end' ? c.endTodoText : c.startTodoText}</span>
      {done ? (
        <Link className="btn btn--outline" style={{ marginTop: 2 }} to="/journal/map">
          {c.doneCta}
        </Link>
      ) : ready ? (
        <Link className="btn btn--primary" style={{ marginTop: 2 }} to={`/journal/mapping/${round}`}>
          {c.todoCta}
        </Link>
      ) : null}
    </section>
  );
}

export function Home() {
  const me = useMe();
  const { signOut } = useAuth();
  const sessions = useSessions();
  const today = getToday();

  return (
    <main className="app-main">
      <PageTitle title={strings.home.greeting(me.displayName)} />
      {sessions.isPending && <Loading />}
      {sessions.isError && <LoadError onRetry={() => void sessions.refetch()} />}
      {sessions.data && (
        <>
          <Hero session={nextSession(sessions.data, today)} today={today} />
          <JourneyMountain sessions={sessions.data} today={today} />
          {isParticipant(me.role) && <MappingTask sessions={sessions.data} today={today} />}
        </>
      )}
      <button type="button" className="link" onClick={() => void signOut()}>
        {strings.login.signOut}
      </button>
    </main>
  );
}
