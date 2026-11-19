import { useState, type FormEvent } from 'react';
import { LoadError, Loading } from '../../components/ui';
import { strings } from '../../content/strings';
import { useSaveSettings, useSettings } from '../../data/hooks';
import type { Settings } from '../../data/types';
import { errorText, SaveBar } from './AdminLayout';

const SUGGESTIONS = 3;

function Form({ settings }: { settings: Settings }) {
  const a = strings.admin.advisor;
  const save = useSaveSettings();
  const [enabled, setEnabled] = useState(settings.advisorEnabled);
  const [opening, setOpening] = useState(settings.advisorOpeningMessage);
  const [suggested, setSuggested] = useState<string[]>(() => Array.from({ length: SUGGESTIONS }, (_, i) => settings.advisorSuggestedQuestions[i] ?? ''));
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await save.mutateAsync({
        advisorEnabled: enabled,
        advisorOpeningMessage: opening.trim(),
        advisorSuggestedQuestions: suggested.map((s) => s.trim()).filter(Boolean),
      });
    } catch (e) {
      setError(errorText(e));
    }
  }

  return (
    <form className="card stack stack--16" onSubmit={submit}>
      <p className="meta">{a.intro}</p>
      <label className="check">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        {a.enabled}
      </label>
      <div className="field">
        <label htmlFor="adv-opening">{a.opening}</label>
        <textarea id="adv-opening" className="textarea" value={opening} onChange={(e) => setOpening(e.target.value)} />
      </div>
      {suggested.map((text, i) => (
        <div key={i} className="field">
          <label htmlFor={`adv-s-${i}`}>{a.suggested(i + 1)}</label>
          <input id={`adv-s-${i}`} className="input" value={text} onChange={(e) => setSuggested(suggested.map((s, j) => (j === i ? e.target.value : s)))} />
        </div>
      ))}
      <SaveBar busy={save.isPending} saved={save.isSuccess} error={error} />
    </form>
  );
}

export function AdminAdvisor() {
  const settings = useSettings();
  if (settings.isError) return <LoadError onRetry={() => void settings.refetch()} />;
  if (!settings.data) return <Loading />;
  return <Form settings={settings.data} />;
}
