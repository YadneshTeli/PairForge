import { FormEvent, ReactNode, useState } from 'react';

export type IconName =
  | 'feed'
  | 'folder'
  | 'chat'
  | 'people'
  | 'calendar'
  | 'bell'
  | 'user'
  | 'logout'
  | 'plus'
  | 'send'
  | 'video';

export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {name === 'feed' && (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </>
      )}
      {name === 'folder' && <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" />}
      {name === 'chat' && <path d="M5 16.5 3.5 20.5 8 19a8.5 8.5 0 1 0-3-2.5Z" />}
      {name === 'people' && (
        <>
          <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" />
          <circle cx="10" cy="8" r="3" />
          <path d="M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.3" />
          <path d="M16 5.1a3 3 0 0 1 0 5.8" />
        </>
      )}
      {name === 'calendar' && (
        <>
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M8 3.5v3M16 3.5v3M3.5 10h17" />
        </>
      )}
      {name === 'bell' && (
        <>
          <path d="M6 16V10a6 6 0 1 1 12 0v6l1.5 2H4.5L6 16Z" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </>
      )}
      {name === 'user' && (
        <>
          <circle cx="12" cy="8" r="3.25" />
          <path d="M5 19.5v-1A4.5 4.5 0 0 1 9.5 14h5a4.5 4.5 0 0 1 4.5 4.5v1" />
        </>
      )}
      {name === 'logout' && (
        <>
          <path d="M10 7V5.5A1.5 1.5 0 0 1 11.5 4h7A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 10 18.5V17" />
          <path d="M4 12h10M11 9l3 3-3 3" />
        </>
      )}
      {name === 'plus' && <path d="M12 5v14M5 12h14" />}
      {name === 'send' && <path d="M4 12 20 4l-6 16-2.5-6.5L4 12Z" />}
      {name === 'video' && (
        <>
          <rect x="3" y="6.5" width="12" height="11" rx="2" />
          <path d="M15 10.5 21 7.5v9l-6-3" />
        </>
      )}
    </svg>
  );
}

export function Mark() {
  return (
    <span className="mark" aria-hidden="true">
      <span />
      <span />
    </span>
  );
}

export function PageHead({ title, lede, action }: { title: string; lede?: string; action?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {lede && <p>{lede}</p>}
      </div>
      {action}
    </header>
  );
}

export function Empty({ title, message, action, plain = false }: { title: string; message: string; action?: ReactNode; plain?: boolean }) {
  return (
    <div className={plain ? 'empty' : 'empty card'}>
      <Mark />
      <h2>{title}</h2>
      <p>{message}</p>
      {action}
    </div>
  );
}

export function explain(error: unknown, fallback: string) {
  if (error instanceof Error) {
    if (error.message === 'Failed to fetch') return "Can't reach the server. Check that the API is running, then try again.";
    return error.message;
  }
  return fallback;
}

export function StatusBlock({ title, lede, label, error }: { title: string; lede?: string; label: string; error?: unknown }) {
  return (
    <div className="stack">
      <PageHead title={title} lede={lede} />
      {error ? <Note tone="error">{explain(error, label)}</Note> : <Loading label={label} />}
    </div>
  );
}

export function Loading({ label }: { label: string }) {
  return (
    <div className="stack" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="skeleton sk-line" />
      <div className="skeleton sk-card" />
    </div>
  );
}

export function Note({ tone, children }: { tone: 'error' | 'ok'; children: ReactNode }) {
  return <p className={tone === 'error' ? 'error' : 'note'} role={tone === 'error' ? 'alert' : 'status'}>{children}</p>;
}

export function PromptDialog({
  title,
  description,
  label,
  placeholder,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  title: string;
  description: string;
  label: string;
  placeholder?: string;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (value.trim().length < 3) {
      setError('Use at least 3 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSubmit(value.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setBusy(false);
    }
  }

  return (
    <div className="modal">
      <form className="sheet stack" role="dialog" aria-modal="true" aria-labelledby="prompt-title" onSubmit={submit}>
        <h2 id="prompt-title">{title}</h2>
        <p>{description}</p>
        <label className="field">
          {label}
          <textarea value={value} onChange={(event) => setValue(event.target.value)} rows={4} placeholder={placeholder} required minLength={3} />
        </label>
        {error && <Note tone="error">{error}</Note>}
        <div className="row">
          <button className="ghost" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="submit" disabled={busy}>{busy ? 'Sending…' : submitLabel}</button>
        </div>
      </form>
    </div>
  );
}

export function pretty(value: string) {
  if (value.toLowerCase() === 'mvp') return 'MVP';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
