import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { BackLink, Icon, LoadError, Loading } from '../../components/ui';
import { strings } from '../../content/strings';
import { useGates, useRemoveMaterial, useSaveSession, useSessions, useUploadMaterial } from '../../data/hooks';
import type { Gate, Session, SessionStatus } from '../../data/types';
import { pad2 } from '../../lib/dates';
import { errorText, SaveBar } from './AdminLayout';

const clean = (value: string): string | null => (value.trim() === '' ? null : value.trim());

function DetailsForm({ session, gates }: { session: Session; gates: Gate[] }) {
  const a = strings.admin.session;
  const save = useSaveSession();
  const [title, setTitle] = useState(session.title ?? '');
  const [date, setDate] = useState(session.date ?? '');
  const [location, setLocation] = useState(session.location ?? '');
  const [gate, setGate] = useState(session.gateNumber ? String(session.gateNumber) : '');
  const [description, setDescription] = useState(session.description ?? '');
  const [status, setStatus] = useState<SessionStatus>(session.status);
  const [speakers, setSpeakers] = useState<string[]>(session.speakers.map((s) => s.name));
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await save.mutateAsync({
        number: session.number,
        input: {
          title: clean(title),
          date: clean(date),
          location: clean(location),
          gateNumber: gate ? Number(gate) : null,
          description: clean(description),
          status,
          speakers: speakers.map((s) => s.trim()).filter(Boolean),
        },
      });
    } catch (e) {
      setError(errorText(e));
    }
  }

  return (
    <form className="card stack stack--16" onSubmit={submit}>
      <h2 className="h2">{a.heading(session.number)}</h2>
      <div className="form-grid form-grid--2">
        <div className="field">
          <label htmlFor="s-title">{a.title}</label>
          <input id="s-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="s-date">{a.date}</label>
          <input id="s-date" className="input" type="date" aria-describedby="s-date-hint" value={date} onChange={(e) => setDate(e.target.value)} />
          <span id="s-date-hint" className="field__hint">{a.dateHint}</span>
        </div>
        <div className="field">
          <label htmlFor="s-location">{a.location}</label>
          <input id="s-location" className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="s-gate">{a.gate}</label>
          <select id="s-gate" className="select" value={gate} onChange={(e) => setGate(e.target.value)}>
            <option value="">{a.noGate}</option>
            {gates.map((g) => (
              <option key={g.number} value={g.number}>
                {pad2(g.number)} · {g.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="s-status">{a.status}</label>
          <select id="s-status" className="select" aria-describedby="s-status-hint" value={status} onChange={(e) => setStatus(e.target.value as SessionStatus)}>
            <option value="scheduled">{a.statusScheduled}</option>
            <option value="completed">{a.statusCompleted}</option>
          </select>
          <span id="s-status-hint" className="field__hint">{a.statusHint}</span>
        </div>
      </div>
      <div className="field">
        <label htmlFor="s-description">{a.description}</label>
        <textarea id="s-description" className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <fieldset className="stack stack--8" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="field__label" style={{ padding: 0, marginBottom: 8 }}>{a.speakers}</legend>
        {speakers.map((name, i) => (
          <div key={i} className="inline">
            <input className="input" aria-label={`${a.speakerName} ${i + 1}`} value={name} onChange={(e) => setSpeakers(speakers.map((s, j) => (j === i ? e.target.value : s)))} />
            <button type="button" className="btn btn--outline" onClick={() => setSpeakers(speakers.filter((_, j) => j !== i))}>
              {strings.common.remove}
            </button>
          </div>
        ))}
        <button type="button" className="link" onClick={() => setSpeakers([...speakers, ''])}>
          {a.addSpeaker}
        </button>
      </fieldset>
      <SaveBar busy={save.isPending} saved={save.isSuccess} error={error} />
    </form>
  );
}

function MaterialsForm({ session }: { session: Session }) {
  const a = strings.admin.session;
  const upload = useUploadMaterial();
  const remove = useRemoveMaterial();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file || !title.trim()) return;
    setError(null);
    try {
      await upload.mutateAsync({ sessionNumber: session.number, title: title.trim(), file });
      setTitle('');
      setFile(null);
      setInputKey((k) => k + 1);
    } catch (e) {
      setError(errorText(e));
    }
  }

  return (
    <section className="card stack stack--16">
      <h2 className="h2">{a.materials}</h2>
      {session.materials.length === 0 ? (
        <p className="meta">{a.noMaterials}</p>
      ) : (
        <div className="rows">
          {session.materials.map((m) => (
            <div key={m.id} className="admin-row">
              <Icon name="document" size={20} />
              <span className="admin-row__text">
                {m.title}
                {m.fileExt && <span className="meta ltr" style={{ alignSelf: 'flex-start' }}>{m.fileExt.toUpperCase()}</span>}
              </span>
              <button
                type="button"
                className="btn btn--outline"
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm(a.removeConfirm(m.title))) remove.mutate(m, { onError: (e) => setError(errorText(e)) });
                }}
              >
                {strings.common.remove}
              </button>
            </div>
          ))}
        </div>
      )}
      <form className="stack stack--12" onSubmit={submit}>
        <div className="form-grid form-grid--2">
          <div className="field">
            <label htmlFor="m-title">{a.materialTitle}</label>
            <input id="m-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="m-file">{a.materialFile}</label>
            <input key={inputKey} id="m-file" className="input" style={{ paddingTop: 9 }} type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        {error && (
          <p className="note note--error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn--outline" style={{ alignSelf: 'flex-start' }} disabled={upload.isPending || !file || !title.trim()}>
          {upload.isPending ? a.uploading : a.upload}
        </button>
      </form>
    </section>
  );
}

export function AdminSessionEdit() {
  const number = Number(useParams().number);
  const sessions = useSessions();
  const gates = useGates();
  const session = sessions.data?.find((s) => s.number === number);

  return (
    <>
      <BackLink to="/admin/sessions">{strings.admin.backToList}</BackLink>
      {(sessions.isPending || gates.isPending) && <Loading />}
      {(sessions.isError || gates.isError) && <LoadError onRetry={() => void Promise.all([sessions.refetch(), gates.refetch()])} />}
      {sessions.data && !session && <p className="meta">{strings.sessions.notFound}</p>}
      {session && gates.data && (
        <>
          <DetailsForm key={`d-${session.number}`} session={session} gates={gates.data} />
          <MaterialsForm session={session} />
        </>
      )}
    </>
  );
}
