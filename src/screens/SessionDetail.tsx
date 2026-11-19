import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMe } from '../auth/AuthProvider';
import { BackLink, delay, Icon, LoadError, Loading, Tag } from '../components/ui';
import { strings } from '../content/strings';
import { api } from '../data';
import { useGates, useSessions } from '../data/hooks';
import { isParticipant, type Material } from '../data/types';
import { formatDate, formatDayMonth } from '../lib/dates';
import { isStationOpen } from '../lib/programme';
import { today as getToday } from '../lib/today';
import { brand } from '../theme/brand';

function Materials({ materials }: { materials: Material[] }) {
  const [failed, setFailed] = useState(false);

  async function download(material: Material) {
    setFailed(false);
    // The window is opened synchronously so that mobile browsers do not block it as a pop-up.
    const target = window.open('', '_blank');
    try {
      const url = await api().getMaterialUrl(material);
      if (target) target.location.href = url;
      else window.location.href = url;
    } catch {
      target?.close();
      setFailed(true);
    }
  }

  return (
    <section className="stack rise" style={delay(740)}>
      <h2 className="h2" style={{ marginBottom: 6 }}>
        {strings.sessions.materials}
      </h2>
      {materials.length === 0 && <p className="meta">{strings.sessions.noMaterials}</p>}
      {materials.map((m) => (
        <button key={m.id} type="button" className="doc-row" onClick={() => void download(m)} aria-label={strings.sessions.download(m.title)}>
          <span className="doc-row__name">
            <Icon name="document" />
            {m.title}
          </span>
          <span className="doc-row__type">
            {m.fileExt && <span className="ltr">{m.fileExt.toUpperCase()}</span>}
            <Icon name="download" />
          </span>
        </button>
      ))}
      {failed && (
        <p className="note note--error" role="alert">
          {strings.sessions.downloadFailed}
        </p>
      )}
    </section>
  );
}

export function SessionDetail() {
  const { number } = useParams();
  const me = useMe();
  const sessions = useSessions();
  const gates = useGates();
  const today = getToday();
  const s = strings.sessions;
  const session = sessions.data?.find((x) => x.number === Number(number));
  const gate = session?.gateNumber ? gates.data?.find((g) => g.number === session.gateNumber) : undefined;

  return (
    <main className="app-main app-main--tight app-main--focused">
      <BackLink to="/sessions">{s.back}</BackLink>
      {sessions.isPending && <Loading />}
      {sessions.isError && <LoadError onRetry={() => void sessions.refetch()} />}
      {sessions.data && !session && <p className="meta">{s.notFound}</p>}
      {session && (
        <>
          <div className="banner">
            <img className="plane" src={brand.logos.programmeSymbol} alt="" />
          </div>
          <div className="stack stack--6 rise" style={delay(500)}>
            <div className="row row--gap8">
              <Tag tone="ink">{strings.common.session(session.number)}</Tag>
              {session.gateNumber && <Tag tone="muted">{strings.common.gate(session.gateNumber)}</Tag>}
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>{session.title ?? s.titleTbd}</h1>
            {gate && <span className="meta">{gate.title}</span>}
          </div>
          <div className="facts rise" style={delay(620)}>
            <span className="fact">
              <Icon name="calendar" />
              {session.date ? <span className="ltr">{formatDate(session.date)}</span> : s.dateTbd}
            </span>
            <span className="fact">
              <Icon name="location" />
              {session.location ?? s.locationTbd}
            </span>
            <span className="fact">
              <Icon name="team" />
              {session.speakers.length ? session.speakers.map((sp) => sp.name).join(', ') : s.speakers(strings.common.tbd)}
            </span>
          </div>
          {session.description && (
            <p className="rise" style={{ ...delay(680), whiteSpace: 'pre-wrap' }}>
              {session.description}
            </p>
          )}
          <Materials materials={session.materials} />
          {isParticipant(me.role) && (
            <section className="panel stack stack--8 push-down rise" style={delay(860)}>
              <div className="row row--between">
                <strong className="card-title">{s.reflection}</strong>
                {isStationOpen(session, today) ? (
                  <Tag tone="todo">{s.reflectionOpen}</Tag>
                ) : (
                  <Tag tone="muted">{session.date ? strings.common.opensOn(formatDayMonth(session.date)) : strings.common.tbd}</Tag>
                )}
              </div>
              {isStationOpen(session, today) ? (
                <Link className="btn btn--primary" to={`/journal/station/${session.number}`}>
                  {s.toReflection}
                </Link>
              ) : (
                <Link className="btn btn--primary" to="/journal">
                  {s.toJournal}
                </Link>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
