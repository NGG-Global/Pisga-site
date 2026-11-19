import { useState, type FormEvent } from 'react';
import { LoadError, Loading, Tag } from '../../components/ui';
import { strings } from '../../content/strings';
import { useGates, useSaveSettings, useSaveStatement, useSettings, useStatements } from '../../data/hooks';
import type { Gate, MappingStatement, Settings } from '../../data/types';
import { isQuestionnaireComplete, STATEMENTS_PER_GATE } from '../../lib/programme';
import { errorText, SaveBar } from './AdminLayout';

const slotKey = (gate: number, order: number) => `${gate}.${order}`;

function Form({ gates, statements, settings }: { gates: Gate[]; statements: MappingStatement[]; settings: Settings }) {
  const a = strings.admin.mapping;
  const saveStatement = useSaveStatement();
  const saveSettings = useSaveSettings();
  const stored = (gate: number, order: number) => statements.find((s) => s.gateNumber === gate && s.sortOrder === order)?.body ?? '';
  const [bodies, setBodies] = useState<Record<string, string>>(() =>
    Object.fromEntries(gates.flatMap((g) => Array.from({ length: STATEMENTS_PER_GATE }, (_, i) => [slotKey(g.number, i + 1), stored(g.number, i + 1)]))),
  );
  const [openQuestion, setOpenQuestion] = useState(settings.mappingOpenQuestion);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const complete = isQuestionnaireComplete(statements, gates, settings.mappingOpenQuestion);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      for (const g of gates) {
        for (let order = 1; order <= STATEMENTS_PER_GATE; order++) {
          const body = bodies[slotKey(g.number, order)].trim();
          // An empty slot is left as it is: a statement that exists cannot be blanked, only reworded.
          if (body !== '' && body !== stored(g.number, order)) await saveStatement.mutateAsync({ gateNumber: g.number, sortOrder: order, body });
        }
      }
      if (openQuestion.trim() !== settings.mappingOpenQuestion) await saveSettings.mutateAsync({ mappingOpenQuestion: openQuestion.trim() });
      setSaved(true);
    } catch (e) {
      setError(errorText(e));
    }
    setBusy(false);
  }

  return (
    <>
      <section className="card stack stack--10">
        <div className="row row--between">
          <strong className="card-title">{a.publish}</strong>
          <Tag tone={settings.mappingPublished ? 'done' : 'muted'}>{settings.mappingPublished ? a.published : a.notPublished}</Tag>
        </div>
        {!complete && !settings.mappingPublished && <span className="meta">{a.incomplete}</span>}
        <button
          type="button"
          className="btn btn--outline"
          style={{ alignSelf: 'flex-start' }}
          disabled={saveSettings.isPending || (!settings.mappingPublished && !complete)}
          onClick={() => saveSettings.mutate({ mappingPublished: !settings.mappingPublished })}
        >
          {settings.mappingPublished ? a.unpublishAction : a.publishAction}
        </button>
      </section>

      <form className="card stack stack--16" onSubmit={submit}>
        <p className="meta">{a.intro}</p>
        <p className="note note--info">{a.editWarning}</p>
        {gates.map((g) => (
          <fieldset key={g.number} className="stack stack--10" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="h2" style={{ padding: 0, marginBottom: 8 }}>
              <span className="num">{String(g.number).padStart(2, '0')}</span> · {g.title}
            </legend>
            {Array.from({ length: STATEMENTS_PER_GATE }, (_, i) => i + 1).map((order) => {
              const key = slotKey(g.number, order);
              return (
                <div key={key} className="field">
                  <label htmlFor={`st-${key}`}>
                    {a.statement(g.number, order)}
                    {stored(g.number, order) === '' && <span style={{ color: 'var(--todo)' }}> · {a.missing}</span>}
                  </label>
                  <textarea id={`st-${key}`} className="textarea" style={{ minHeight: 72 }} value={bodies[key]} onChange={(e) => setBodies({ ...bodies, [key]: e.target.value })} />
                </div>
              );
            })}
          </fieldset>
        ))}
        <div className="field">
          <label htmlFor="open-question">
            {a.openQuestion}
            {settings.mappingOpenQuestion === '' && <span style={{ color: 'var(--todo)' }}> · {a.missing}</span>}
          </label>
          <textarea id="open-question" className="textarea" style={{ minHeight: 72 }} value={openQuestion} onChange={(e) => setOpenQuestion(e.target.value)} />
        </div>
        <SaveBar busy={busy} saved={saved} error={error} />
      </form>
    </>
  );
}

export function AdminMapping() {
  const gates = useGates();
  const statements = useStatements();
  const settings = useSettings();
  const queries = [gates, statements, settings];
  if (queries.some((q) => q.isError)) return <LoadError onRetry={() => queries.forEach((q) => void q.refetch())} />;
  if (!gates.data || !statements.data || !settings.data) return <Loading />;
  return <Form gates={gates.data} statements={statements.data} settings={settings.data} />;
}
