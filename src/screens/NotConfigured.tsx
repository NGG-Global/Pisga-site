import { strings } from '../content/strings';

/** Shown when the deployment has no backend configuration and demo mode is off. */
export function NotConfigured() {
  return (
    <div className="app">
      <main className="app-main">
        <div className="note note--error stack stack--8" role="alert">
          <strong>{strings.errors.notConfiguredTitle}</strong>
          <span>{strings.errors.notConfiguredText}</span>
        </div>
      </main>
    </div>
  );
}
