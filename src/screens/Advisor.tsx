import { createContext, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { delay, Icon, LoadError, Loading, PageTitle, Tag } from '../components/ui';
import { strings } from '../content/strings';
import { api } from '../data';
import { useSettings } from '../data/hooks';
import type { AdvisorMessage } from '../data/types';
import { brand } from '../theme/brand';

/**
 * The conversation is held in memory for the current visit only. Whether and how conversations
 * are stored is an open decision (voice or text, provider retention), so nothing is persisted here.
 */
interface Conversation {
  messages: AdvisorMessage[];
  typing: boolean;
  failed: boolean;
  ask: (text: string) => void;
}

const ConversationContext = createContext<Conversation | null>(null);

export function AdvisorConversationProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [failed, setFailed] = useState(false);
  const latest = useRef(messages);
  latest.current = messages;

  const value = useMemo<Conversation>(
    () => ({
      messages,
      typing,
      failed,
      ask(text) {
        const question = text.trim();
        if (!question || typing) return;
        const conversation = [...latest.current, { role: 'user' as const, text: question }];
        setMessages(conversation);
        setTyping(true);
        setFailed(false);
        api()
          .askAdvisor(conversation)
          .then((reply) => setMessages((prev) => [...prev, { role: 'advisor', text: reply.text, sources: reply.sources }]))
          .catch(() => setFailed(true))
          .finally(() => setTyping(false));
      },
    }),
    [messages, typing, failed],
  );
  return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
}

function Chat({ opening, suggestions }: { opening: string; suggestions: string[] }) {
  const conversation = useContext(ConversationContext)!;
  const [draft, setDraft] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const a = strings.advisor;

  useEffect(() => {
    if (conversation.messages.length || conversation.typing) end.current?.scrollIntoView({ block: 'end' });
  }, [conversation.messages.length, conversation.typing]);

  function submit(event: FormEvent) {
    event.preventDefault();
    conversation.ask(draft);
    setDraft('');
  }

  return (
    <>
      <main className="app-main app-main--tight">
        <PageTitle title={a.title}>
          <span className="meta">{a.privacy}</span>
        </PageTitle>
        {opening && (
          <div className="bubble bubble--advisor rise" style={delay(160)}>
            {opening}
          </div>
        )}
        {conversation.messages.length === 0 && suggestions.length > 0 && (
          <div className="chips rise" style={delay(320)}>
            {suggestions.map((text) => (
              <button key={text} type="button" className="chip" onClick={() => conversation.ask(text)}>
                {text}
              </button>
            ))}
          </div>
        )}
        {conversation.messages.map((message, i) =>
          message.role === 'user' ? (
            <div key={i} className="bubble bubble--user rise">
              {message.text}
            </div>
          ) : (
            <div key={i} className="bubble bubble--advisor rise">
              <span style={{ whiteSpace: 'pre-wrap' }}>{message.text}</span>
              {message.sources && message.sources.length > 0 && (
                <span className="bubble__source">
                  <Icon name="document" />
                  {a.source(message.sources.join(' · '))}
                </span>
              )}
            </div>
          ),
        )}
        {conversation.typing && (
          <div className="card typing rise" role="status" aria-label={a.typing}>
            <span className="dot" />
            <span className="dot" style={delay(200)} />
            <span className="dot" style={delay(400)} />
          </div>
        )}
        {conversation.failed && (
          <p className="note note--error" role="alert">
            {a.failed}
          </p>
        )}
        <div ref={end} />
      </main>
      <form className="composer" onSubmit={submit}>
        <label htmlFor="advisor-message" className="sr-only">
          {a.inputLabel}
        </label>
        <input id="advisor-message" className="input" type="text" autoComplete="off" placeholder={a.placeholder} value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button type="submit" className="btn btn--primary" disabled={conversation.typing || draft.trim() === ''}>
          {a.send}
        </button>
      </form>
    </>
  );
}

export function Advisor() {
  const settings = useSettings();
  const a = strings.advisor;

  if (settings.data?.advisorEnabled) {
    return <Chat opening={settings.data.advisorOpeningMessage} suggestions={settings.data.advisorSuggestedQuestions.filter((q) => q.trim() !== '')} />;
  }
  return (
    <main className="app-main">
      <PageTitle title={a.title}>
        <span className="meta">{a.privacy}</span>
      </PageTitle>
      {settings.isPending && <Loading />}
      {settings.isError && <LoadError onRetry={() => void settings.refetch()} />}
      {settings.data && (
        <section className="card stack" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="banner banner--lg">
            <img className="plane" src={brand.logos.programmeSymbol} alt="" />
          </div>
          <div className="stack stack--10 start rise" style={{ ...delay(600), padding: 20 }}>
            <Tag tone="muted">{a.soonTag}</Tag>
            <strong style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.3 }}>{a.soonTitle}</strong>
            <span className="muted">{a.soonText}</span>
          </div>
        </section>
      )}
    </main>
  );
}
