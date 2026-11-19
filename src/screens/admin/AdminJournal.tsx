import { useState, type FormEvent } from 'react';
import { LoadError, Loading } from '../../components/ui';
import { strings } from '../../content/strings';
import { useJournalQuestions, useRemoveQuestion, useSaveQuestion, useSessions } from '../../data/hooks';
import type { JournalQuestion, QuestionKind } from '../../data/types';
import { MAX_QUESTIONS_PER_SESSION } from '../../lib/programme';
import { errorText, SaveBar } from './AdminLayout';

interface Draft {
  sortOrder: number;
  body: string;
  kind: QuestionKind;
  id?: string;
}

function QuestionsForm({ sessionNumber, questions }: { sessionNumber: number; questions: JournalQuestion[] }) {
  const a = strings.admin.journal;
  const save = useSaveQuestion();
  const remove = useRemoveQuestion();
  const [drafts, setDrafts] = useState<Draft[]>(() => questions.map((q) => ({ sortOrder: q.sortOrder, body: q.body, kind: q.kind, id: q.id })));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (sortOrder: number, patch: Partial<Draft>) => setDrafts(drafts.map((d) => (d.sortOrder === sortOrder ? { ...d, ...patch } : d)));
  const nextFree = Array.from({ length: MAX_QUESTIONS_PER_SESSION }, (_, i) => i + 1).find((n) => !drafts.some((d) => d.sortOrder === n));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      for (const d of drafts) {
        const stored = questions.find((q) => q.sortOrder === d.sortOrder);
        const body = d.body.trim();
        if (body !== '' && (!stored || stored.body !== body || stored.kind !== d.kind)) {
          await save.mutateAsync({ sessionNumber, sortOrder: d.sortOrder, body, kind: d.kind });
        }
      }
      setSaved(true);
    } catch (e) {
      setError(errorText(e));
    }
    setBusy(false);
  }

  async function removeDraft(d: Draft) {
    setError(null);
    if (d.id) {
      if (!window.confirm(a.removeConfirm)) return;
      try {
        await remove.mutateAsync(d.id);
      } catch (e) {
        setError(errorText(e));
        return;
      }
    }
    setDrafts(drafts.filter((x) => x.sortOrder !== d.sortOrder));
  }

  return (
    <form className="card stack stack--16" onSubmit={submit}>
      <span className="meta">{drafts.length === 0 ? a.empty : a.countHint(drafts.length)}</span>
      {[...drafts]
        .sort((x, y) => x.sortOrder - y.sortOrder)
        .map((d) => (
          <div key={d.sortOrder} className="stack stack--8">
            <div className="field">
              <label htmlFor={`jq-${d.sortOrder}`}>{a.question(d.sortOrder)}</label>
              <textarea id={`jq-${d.sortOrder}`} className="textarea" style={{ minHeight: 72 }} value={d.body} onChange={(e) => update(d.sortOrder, { body: e.target.value })} />
            </div>
            <div className="inline">
              <label htmlFor={`jk-${d.sortOrder}`} className="sr-only">
                {a.kind}
              </label>
              <select id={`jk-${d.sortOrder}`} className="select" style={{ flex: 1 }} value={d.kind} onChange={(e) => update(d.sortOrder, { kind: e.target.value as QuestionKind })}>
                <option value="open">{a.kindOpen}</option>
                <option value="north_star">{a.kindNorthStar}</option>
              </select>
              <button type="button" className="btn btn--outline" disabled={remove.isPending} onClick={() => void removeDraft(d)}>
                {strings.common.remove}
              </button>
            </div>
          </div>
        ))}
      <span className="field__hint">{a.kindHint}</span>
      {nextFree !== undefined && (
        <button type="button" className="link" onClick={() => setDrafts([...drafts, { sortOrder: nextFree, body: '', kind: 'open' }])}>
          {a.addQuestion}
        </button>
      )}
      <SaveBar busy={busy} saved={saved} error={error} />
    </form>
  );
}

export function AdminJournal() {
  const sessions = useSessions();
  const questions = useJournalQuestions();
  const [selected, setSelected] = useState(1);
  const a = strings.admin.journal;
  const queries = [sessions, questions];

  if (queries.some((q) => q.isError)) return <LoadError onRetry={() => queries.forEach((q) => void q.refetch())} />;
  if (!sessions.data || !questions.data) return <Loading />;
  const own = questions.data.filter((q) => q.sessionNumber === selected).sort((x, y) => x.sortOrder - y.sortOrder);

  return (
    <>
      <p className="meta">{a.intro}</p>
      <div className="field">
        <label htmlFor="jq-session">{a.pick}</label>
        <select id="jq-session" className="select" value={selected} onChange={(e) => setSelected(Number(e.target.value))}>
          {sessions.data.map((s) => (
            <option key={s.number} value={s.number}>
              {strings.common.session(s.number)}
              {s.title ? ` · ${s.title}` : ''} ({questions.data.filter((q) => q.sessionNumber === s.number).length})
            </option>
          ))}
        </select>
      </div>
      <QuestionsForm key={`${selected}-${own.map((q) => q.id).join('.')}`} sessionNumber={selected} questions={own} />
    </>
  );
}
