import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { api, authToken, WS_URL } from './api';
import { useAuth } from './auth';
import type {
  AppNotification,
  ChatMessage,
  Compatibility,
  ConnectionRequest,
  Criterion,
  EventItem,
  MatchSummary,
  PersonRef,
  Profile,
  Project,
} from './types';
import { LOOKING, ROLES, STAGES } from './types';
import { Empty, Icon, Loading, Note, PageHead, PromptDialog, StatusBlock, SwipeCard, explain, pretty } from './ui';

const ROLE_COPY: Record<string, string> = {
  founder: 'You post the idea and choose who comes in.',
  cofounder: 'You want to build beside a founder.',
  vc: 'You rate whether this can become a company.',
  developer: 'You rate whether you can build it.',
  freelancer: 'You rate the work you could take on.',
  student: 'You are here to learn on a real project.',
};

function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <section className="hero" aria-label="About PairForge">
        <div className="blob one" />
        <div className="hero-copy">
          <p className="eyebrow">PairForge</p>
          <p className="display">Build with the person who gets the idea.</p>
        </div>
        <ul className="proof">
          <li>
            <strong>Rate</strong>
            <span>Score ideas on the criteria that match your role.</span>
          </li>
          <li>
            <strong>Match</strong>
            <span>A superlike asks the owner. A mutual like opens a chat.</span>
          </li>
          <li>
            <strong>Pair</strong>
            <span>Write together and join a call from the match.</span>
          </li>
        </ul>
      </section>
      <main className="auth-panel">{children}</main>
    </div>
  );
}

function RoleBadge({ role }: { role: string | null | undefined }) {
  const label = ROLES.find((item) => item[0] === role)?.[1] ?? role ?? 'No role';
  return <span className="badge">{label}</span>;
}

function scoreLine(project: Project) {
  if (!project.band || project.successScore == null) return 'No signal yet';
  return `${project.band} · ${project.successScore.toFixed(1)} / 5 · ${project.ratingCount ?? 0} ratings`;
}

function when(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

async function sendReport(targetType: 'project' | 'user', targetId: string, reason: string) {
  await api('/reports', { method: 'POST', body: JSON.stringify({ targetType, targetId, reason }) });
}

export function LoginPage() {
  const { session, login } = useAuth();
  const [error, setError] = useState('');
  if (session?.profile.role) return <Navigate to="/feed" replace />;
  if (session) return <Navigate to="/onboarding" replace />;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await login(String(data.get('email')), String(data.get('password')));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  return (
    <AuthFrame>
      <form className="card stack" onSubmit={onSubmit}>
        <div>
          <p className="eyebrow">Welcome back</p>
          <h1>Sign in</h1>
        </div>
        <label className="field">Email<input name="email" type="email" autoComplete="email" required /></label>
        <label className="field">Password<input name="password" type="password" autoComplete="current-password" required minLength={8} /></label>
        {error && <Note tone="error">{error}</Note>}
        <button type="submit">Sign in</button>
        <Link className="text-link" to="/signup">Create an account</Link>
      </form>
    </AuthFrame>
  );
}

export function SignupPage() {
  const { session, signup } = useAuth();
  const [error, setError] = useState('');
  if (session) return <Navigate to={session.profile.role ? '/feed' : '/onboarding'} replace />;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await signup({
        email: String(data.get('email')),
        username: String(data.get('username')),
        displayName: String(data.get('displayName') || data.get('username')),
        password: String(data.get('password')),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    }
  }

  return (
    <AuthFrame>
      <form className="card stack" onSubmit={onSubmit}>
        <div>
          <p className="eyebrow">New here</p>
          <h1>Create account</h1>
        </div>
        <label className="field">Display name<input name="displayName" autoComplete="name" required /></label>
        <label className="field">Username<input name="username" autoComplete="username" required /></label>
        <label className="field">Email<input name="email" type="email" autoComplete="email" required /></label>
        <label className="field">Password<input name="password" type="password" autoComplete="new-password" required minLength={8} /></label>
        {error && <Note tone="error">{error}</Note>}
        <button type="submit">Create account</button>
        <Link className="text-link" to="/login">I already have an account</Link>
      </form>
    </AuthFrame>
  );
}

export function RolePage() {
  const { session, setRole } = useAuth();
  const [error, setError] = useState('');
  if (!session) return <Navigate to="/login" replace />;
  if (session.profile.role) return <Navigate to="/feed" replace />;

  return (
    <main className="onboard">
      <section className="card stack onboard-card">
        <div>
          <p className="eyebrow">One-time setup</p>
          <h1>How are you showing up?</h1>
          <p className="meta">Your role decides which questions you rate projects on. You can set it once.</p>
        </div>
        {error && <Note tone="error">{error}</Note>}
        <div className="role-grid">
          {ROLES.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setRole(id).catch((err: Error) => setError(err.message))}>
              {label}
              <span>{ROLE_COPY[id]}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

export function FeedPage() {
  const queryClient = useQueryClient();
  const feed = useQuery({
    queryKey: ['feed'],
    queryFn: () => api<{ projects: Project[] }>('/projects/feed'),
  });
  const criteria = useQuery({
    queryKey: ['criteria'],
    queryFn: () => api<{ criteria: Criterion[] }>('/rating-criteria'),
  });
  const [gone, setGone] = useState<string[]>([]);
  const [pending, setPending] = useState<{ id: string; action: 'like' | 'superlike' } | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const projects = (feed.data?.projects ?? []).filter((project) => !gone.includes(project.id));
  const project = projects[0];

  async function commit(action: 'pass' | 'like' | 'superlike', id: string, ratings?: Record<string, number>) {
    try {
      await api(`/projects/${id}/swipe`, { method: 'POST', body: JSON.stringify({ action, ratings }) });
      setGone((current) => [...current, id]);
      setPending(null);
      await queryClient.invalidateQueries({ queryKey: ['mine'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Swipe failed');
    }
  }

  function openScore(action: 'like' | 'superlike') {
    if (!project) return;
    setPending({ id: project.id, action });
    setScores(Object.fromEntries((criteria.data?.criteria ?? []).map((item) => [item.key, 3])));
  }

  if (feed.isLoading) return <StatusBlock title="Discover" lede="Rate the next project from the seat you chose." label="Loading feed" />;
  if (feed.error) return <StatusBlock title="Discover" lede="Rate the next project from the seat you chose." label="Could not load the feed" error={feed.error} />;
  if (!project) {
    return <Empty title="No projects left" message="You have seen everything in the feed. Check back when someone posts a new idea." />;
  }

  return (
    <div className="stack">
      <PageHead title="Discover" lede="Drag the card left to pass or right to like. Superlike stays a button so it is never an accident." />
      <SwipeCard onPass={() => commit('pass', project.id)} onLike={() => openScore('like')}>
      <article className="card stack">
        <div className="row">
          <RoleBadge role={project.owner?.role} />
          <span className="badge blue">{pretty(project.stage)}</span>
        </div>
        <h2>{project.title}</h2>
        <p>{project.tagline}</p>
        <p className="meta">{project.description}</p>
        <div className="row">{project.tags.map((tag) => <span className="badge" key={tag}>{tag}</span>)}</div>
        <Link className="text-link" to={`/projects/${project.id}`}>Open detail</Link>
      </article>
      </SwipeCard>
      {error && <Note tone="error">{error}</Note>}
      <div className="actions">
        <button className="ghost" type="button" onClick={() => commit('pass', project.id)}>Pass</button>
        <button type="button" onClick={() => openScore('like')}>Like</button>
        <button className="cta" type="button" onClick={() => openScore('superlike')}>Superlike</button>
      </div>
      {pending && (
        <div className="modal">
          <div className="sheet stack" role="dialog" aria-modal="true" aria-labelledby="rate-title">
            <h2 id="rate-title">{pending.action === 'superlike' ? 'Superlike' : 'Like'}</h2>
            <p className="meta">{pending.action === 'superlike' ? 'A superlike asks the owner to connect. Score all three before it is sent.' : 'Score all three. Nothing is saved until you submit.'}</p>
            {(criteria.data?.criteria ?? []).map((item) => (
              <label className="field" key={item.key}>
                {item.label} · {scores[item.key] ?? 3}
                <input type="range" min={1} max={5} value={scores[item.key] ?? 3} onChange={(event) => setScores({ ...scores, [item.key]: Number(event.target.value) })} />
              </label>
            ))}
            <div className="row">
              <button className="ghost" type="button" onClick={() => setPending(null)}>Cancel</button>
              <button type="button" onClick={() => commit(pending.action, pending.id, scores)}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MyProjectsPage() {
  const mine = useQuery({ queryKey: ['mine'], queryFn: () => api<{ projects: Project[] }>('/projects/mine') });
  if (mine.isLoading) return <StatusBlock title="Your projects" lede="Ideas you have posted, and how other roles scored them." label="Loading projects" />;
  if (mine.error) return <StatusBlock title="Your projects" lede="Ideas you have posted, and how other roles scored them." label="Could not load projects" error={mine.error} />;
  const projects = mine.data?.projects ?? [];
  const action = <Link className="button" to="/projects/new"><Icon name="plus" /> Post a project</Link>;
  if (projects.length === 0) {
    return (
      <div className="stack">
        <PageHead title="Your projects" lede="Ideas you have posted, and how other roles scored them." />
        <Empty title="No projects yet" message="Post an idea to start collecting ratings from other roles." action={action} />
      </div>
    );
  }
  return (
    <div className="stack">
      <PageHead title="Your projects" lede="Ideas you have posted, and how other roles scored them." action={action} />
      {projects.map((project) => (
        <Link key={project.id} className="card" to={`/projects/${project.id}`}>
          <div className="row spread">
            <strong>{project.title}</strong>
            <span className="badge blue">{pretty(project.stage)}</span>
          </div>
          <p>{project.tagline}</p>
          <p className="meta">{scoreLine(project)}</p>
        </Link>
      ))}
    </div>
  );
}

export function ProjectFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const existing = useQuery({
    queryKey: ['project', id],
    enabled: Boolean(id),
    queryFn: () => api<{ project: Project }>(`/projects/${id}`),
  });
  const project = existing.data?.project;
  const [stage, setStage] = useState('idea');
  const [looking, setLooking] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!project) return;
    setStage(project.stage);
    setLooking(project.lookingFor);
  }, [project]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = {
      title: String(data.get('title')),
      tagline: String(data.get('tagline')),
      description: String(data.get('description')),
      stage,
      lookingFor: looking,
      tags: String(data.get('tags')).split(',').map((tag) => tag.trim()).filter(Boolean),
    };
    try {
      const saved = id
        ? await api<{ project: Project }>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await api<{ project: Project }>('/projects', { method: 'POST', body: JSON.stringify(body) });
      await queryClient.invalidateQueries({ queryKey: ['mine'] });
      await queryClient.invalidateQueries({ queryKey: ['feed'] });
      navigate(`/projects/${saved.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  if (id && existing.isLoading) return <Loading label="Loading project" />;

  return (
    <form className="card stack" onSubmit={onSubmit}>
      <div>
        <p className="eyebrow">{id ? 'Update' : 'New'}</p>
        <h1>{id ? 'Edit project' : 'Post a project'}</h1>
      </div>
      <label className="field">Title<input name="title" required defaultValue={project?.title} /></label>
      <label className="field">Tagline<input name="tagline" required defaultValue={project?.tagline} /></label>
      <label className="field">Description<textarea name="description" required defaultValue={project?.description} rows={5} /></label>
      <label className="field">Stage
        <select value={stage} onChange={(event) => setStage(event.target.value)}>
          {STAGES.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}
        </select>
      </label>
      <label className="field">Tags, comma separated<input name="tags" defaultValue={project?.tags.join(', ')} /></label>
      <fieldset className="stack">
        <legend className="field">Looking for</legend>
        <div className="choices">
          {LOOKING.map((item) => (
            <label className="choice" key={item}>
              <input
                type="checkbox"
                checked={looking.includes(item)}
                onChange={(event) => setLooking(event.target.checked ? [...looking, item] : looking.filter((value) => value !== item))}
              />
              {pretty(item)}
            </label>
          ))}
        </div>
      </fieldset>
      {error && <Note tone="error">{error}</Note>}
      <button type="submit">Save</button>
    </form>
  );
}

export function ProjectPage() {
  const { id = '' } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const project = useQuery({ queryKey: ['project', id], queryFn: () => api<{ project: Project }>(`/projects/${id}`) });
  const members = useQuery({ queryKey: ['members', id], queryFn: () => api<{ members: { profile: PersonRef }[] }>(`/projects/${id}/members`) });
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [dialog, setDialog] = useState<'join' | 'report' | 'delete' | null>(null);
  const item = project.data?.project;
  if (project.isLoading) return <Loading label="Loading project" />;
  if (!item) return <Note tone="error">{(project.error as Error | null)?.message ?? 'Missing project'}</Note>;
  const owner = item.ownerId === session?.profile.id;

  async function remove() {
    try {
      await api(`/projects/${item!.id}`, { method: 'DELETE' });
      await queryClient.invalidateQueries({ queryKey: ['mine'] });
      navigate('/mine');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setDialog(null);
    }
  }

  return (
    <article className="card stack">
      <Link className="text-link" to={owner ? '/mine' : '/feed'}>{owner ? 'Back to your projects' : 'Back to the feed'}</Link>
      <div className="row">
        <RoleBadge role={item.owner?.role} />
        <span className="badge blue">{pretty(item.stage)}</span>
      </div>
      <h1>{item.title}</h1>
      <p>{item.tagline}</p>
      <p className="meta">{item.description}</p>
      <div className="row">{item.tags.map((tag) => <span className="badge" key={tag}>{tag}</span>)}</div>
      <p>Looking for {item.lookingFor.map(pretty).join(', ') || 'collaborators'}</p>
      {owner ? (
        <>
          <div className="score">
            <strong>{item.successScore == null ? '—' : item.successScore.toFixed(1)}</strong>
            <span>{scoreLine(item)}</span>
          </div>
          <div className="row">
            <Link className="button" to={`/projects/${item.id}/requests`}>Requests</Link>
            <Link className="button ghost" to={`/projects/${item.id}/edit`}>Edit</Link>
            <button className="danger" type="button" onClick={() => setDialog('delete')}>Delete</button>
          </div>
          <h2>Team</h2>
          {(members.data?.members ?? []).length === 0 && <p className="meta">No teammates yet.</p>}
          {(members.data?.members ?? []).map((member) => (
            <div className="row" key={member.profile.id}>
              <strong>{member.profile.displayName}</strong>
              <RoleBadge role={member.profile.role} />
            </div>
          ))}
        </>
      ) : (
        <div className="row">
          <button type="button" onClick={() => setDialog('join')}>Ask to join</button>
          <button className="ghost" type="button" onClick={() => setDialog('report')}>Report</button>
        </div>
      )}
      {error && <Note tone="error">{error}</Note>}
      {note && <Note tone="ok">{note}</Note>}
      {dialog === 'join' && (
        <PromptDialog
          title="Ask to join"
          description="Tell the owner what you would take on. They see this with your ratings."
          label="What would you take on?"
          submitLabel="Send request"
          onCancel={() => setDialog(null)}
          onSubmit={async (message) => {
            await api(`/projects/${item.id}/join-requests`, { method: 'POST', body: JSON.stringify({ message }) });
            setNote('Request sent. The owner will see it with their other requests.');
            setDialog(null);
          }}
        />
      )}
      {dialog === 'report' && (
        <PromptDialog
          title="Report this project"
          description="Tell us what is wrong. Reports are saved for review."
          label="What is wrong?"
          submitLabel="Submit report"
          onCancel={() => setDialog(null)}
          onSubmit={async (reason) => {
            await sendReport('project', item.id, reason);
            setNote('Report saved.');
            setDialog(null);
          }}
        />
      )}
      {dialog === 'delete' && (
        <div className="modal">
          <div className="sheet stack" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <h2 id="delete-title">Delete this project?</h2>
            <p className="meta">This removes the project and its ratings.</p>
            <div className="row">
              <button className="ghost" type="button" onClick={() => setDialog(null)}>Keep</button>
              <button className="danger" type="button" onClick={remove}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export function RequestsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const requests = useQuery({
    queryKey: ['requests', id],
    queryFn: () => api<{ requests: ConnectionRequest[] }>(`/projects/${id}/requests`),
  });
  const pending = (requests.data?.requests ?? []).filter((item) => item.status === 'pending');
  if (requests.isLoading) return <Loading label="Loading requests" />;
  if (requests.error) return <Note tone="error">{(requests.error as Error).message}</Note>;

  async function decide(requestId: string, status: 'accepted' | 'declined') {
    const body = await api<{ match: { id: string } | null }>(`/match-requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await queryClient.invalidateQueries({ queryKey: ['requests', id] });
    await queryClient.invalidateQueries({ queryKey: ['matches'] });
    if (body.match) navigate(`/matches/${body.match.id}`);
  }

  return (
    <div className="stack">
      <PageHead title="Requests" lede="Superlikes and join notes waiting on your decision." action={<Link className="text-link" to={`/projects/${id}`}>Back to project</Link>} />
      {pending.length === 0 ? (
        <Empty title="No requests yet" message="When someone superlikes this project, their ratings will show up here." />
      ) : pending.map((request) => (
        <article className="card stack" key={request.id}>
          <div className="row"><strong>{request.requester.displayName}</strong><RoleBadge role={request.requester.role} /></div>
          {Object.entries(request.ratings).map(([key, value]) => (
            <div className="row spread" key={key}><span>{pretty(key)}</span><strong>{value} / 5</strong></div>
          ))}
          <div className="row">
            <button className="ghost" type="button" onClick={() => decide(request.id, 'declined')}>Decline</button>
            <button type="button" onClick={() => decide(request.id, 'accepted')}>Accept</button>
          </div>
        </article>
      ))}
    </div>
  );
}

export function MatchesPage() {
  const matches = useQuery({ queryKey: ['matches'], queryFn: () => api<{ matches: MatchSummary[] }>('/matches') });
  if (matches.isLoading) return <StatusBlock title="Matches" lede="Chats open after a project owner accepts your superlike, or when two people like each other." label="Loading matches" />;
  if (matches.error) return <StatusBlock title="Matches" lede="Chats open after a project owner accepts your superlike, or when two people like each other." label="Could not load matches" error={matches.error} />;
  const items = matches.data?.matches ?? [];
  if (items.length === 0) {
    return (
      <div className="stack">
        <PageHead title="Matches" lede="Chats open after a project owner accepts your superlike, or when two people like each other." />
        <Empty title="No matches yet" message="A chat opens after a project owner accepts your superlike, or when two people like each other." />
      </div>
    );
  }
  return (
    <div className="stack">
      <PageHead title="Matches" lede="Open a chat, then start a pair session when you are both ready." />
      {items.map((match) => (
        <Link className="card" key={match.id} to={`/matches/${match.id}`}>
          <div className="row">
            <strong>{match.other.displayName}</strong>
            <RoleBadge role={match.other.role} />
            {match.unreadCount > 0 && <span className="badge blue">{match.unreadCount} new</span>}
          </div>
          <p className="meta">{match.lastMessage?.content ?? match.projectTitle ?? 'No messages yet'}</p>
        </Link>
      ))}
    </div>
  );
}

export function ChatPage() {
  const { id = '' } = useParams();
  const { session } = useAuth();
  const history = useQuery({
    queryKey: ['messages', id],
    queryFn: () => api<{ messages: ChatMessage[] }>(`/matches/${id}/messages`),
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(history.data?.messages ?? []);
  }, [history.data]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'nearest' });
  }, [messages]);

  useEffect(() => {
    const token = authToken();
    if (!token) return;
    const socket = io(WS_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join', { matchId: id }));
    socket.on('messageEvent', (message: ChatMessage) => {
      if (message.matchId !== id) return;
      setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
      if (message.senderId !== session?.profile.id) socket.emit('readMessage', { messageId: message.id });
    });
    return () => {
      socket.emit('leaveRoom', { matchId: id });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [id, session?.profile.id]);

  if (history.isLoading) return <Loading label="Loading messages" />;

  return (
    <div className="card stack">
      <div className="row spread">
        <Link className="text-link" to="/matches">All matches</Link>
        <Link className="button" to={`/matches/${id}/pair`}><Icon name="video" /> Pair session</Link>
      </div>
      <div className="messages" aria-live="polite">
        {messages.length === 0 && <Empty plain title="No messages yet" message="This chat just opened. Say hello." />}
        {messages.map((message) => (
          <div key={message.id} className={`bubble ${message.senderId === session?.profile.id ? 'mine' : 'theirs'}`}>{message.content}</div>
        ))}
        <div ref={bottom} />
      </div>
      <form className="composer" onSubmit={(event) => {
        event.preventDefault();
        if (!draft.trim()) return;
        socketRef.current?.emit('sendMessage', { matchId: id, content: draft.trim() });
        setDraft('');
      }}>
        <label className="sr-only" htmlFor="chat-draft">Message</label>
        <input id="chat-draft" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Message" />
        <button type="submit"><Icon name="send" /> Send</button>
      </form>
    </div>
  );
}

export function PairPage() {
  const { id = '' } = useParams();
  const [documentText, setDocumentText] = useState('');
  const [cameraError, setCameraError] = useState('');
  const revision = useRef(0);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localVideo = useRef<HTMLVideoElement | null>(null);
  const remoteVideo = useRef<HTMLVideoElement | null>(null);

  function peer() {
    if (peerRef.current) return peerRef.current;
    const connection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('pairSignal', { matchId: id, signal: { candidate: event.candidate.toJSON() } });
      }
    };
    connection.ontrack = (event) => {
      if (remoteVideo.current) remoteVideo.current.srcObject = event.streams[0] ?? null;
    };
    peerRef.current = connection;
    return connection;
  }

  useEffect(() => {
    const token = authToken();
    if (!token) return undefined;
    const socket = io(WS_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('pairJoin', { matchId: id }));
    const apply = (state: { document: string; revision: number }) => {
      revision.current = state.revision;
      setDocumentText(state.document);
    };
    socket.on('pairState', apply);
    socket.on('pairEdit', apply);
    socket.on('pairSignal', async (payload: { signal?: { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit } }) => {
      const signal = payload.signal;
      if (!signal) return;
      const connection = peer();
      if (signal.sdp) {
        await connection.setRemoteDescription(signal.sdp);
        if (signal.sdp.type === 'offer') {
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);
          socket.emit('pairSignal', { matchId: id, signal: { sdp: connection.localDescription } });
        }
      } else if (signal.candidate) {
        await connection.addIceCandidate(signal.candidate);
      }
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
      peerRef.current?.close();
      peerRef.current = null;
    };
  }, [id]);

  async function startVideo() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideo.current) localVideo.current.srcObject = stream;
      const connection = peer();
      stream.getTracks().forEach((track) => connection.addTrack(track, stream));
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      socketRef.current?.emit('pairSignal', { matchId: id, signal: { sdp: offer } });
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : 'Camera is unavailable');
    }
  }

  return (
    <div className="stack">
      <PageHead title="Pair session" lede="The document stays in sync. Video uses a public STUN server and stays on this call." action={<Link className="text-link" to={`/matches/${id}`}>Back to chat</Link>} />
      <label className="field">Shared document
        <textarea
          rows={16}
          value={documentText}
          onChange={(event) => {
            const next = event.target.value;
            setDocumentText(next);
            socketRef.current?.emit('pairEdit', { matchId: id, document: next, revision: revision.current });
          }}
        />
      </label>
      <div className="video-grid">
        <figure>
          <video ref={localVideo} autoPlay muted playsInline />
          <figcaption>You</figcaption>
        </figure>
        <figure>
          <video ref={remoteVideo} autoPlay playsInline />
          <figcaption>Partner</figcaption>
        </figure>
      </div>
      <button type="button" onClick={startVideo}><Icon name="video" /> Start video</button>
      {cameraError && <Note tone="error">{cameraError}</Note>}
    </div>
  );
}

export function PeoplePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [gone, setGone] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [skill, setSkill] = useState('');
  const [applied, setApplied] = useState('');
  const people = useQuery({
    queryKey: ['people', applied],
    queryFn: () => api<{ people: Profile[] }>(applied ? `/people/feed?skill=${encodeURIComponent(applied)}` : '/people/feed'),
  });
  const person = (people.data?.people ?? []).find((item) => !gone.includes(item.id));

  async function swipe(action: 'pass' | 'like') {
    if (!person) return;
    try {
      const body = await api<{ match: { id: string } | null }>(`/people/${person.id}/swipe`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setGone((current) => [...current, person.id]);
      await queryClient.invalidateQueries({ queryKey: ['matches'] });
      if (body.match) navigate(`/matches/${body.match.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Swipe failed');
    }
  }

  return (
    <div className="stack">
      <PageHead title="People" lede="Drag the card left to pass or right to like. Filter by a skill when you need a narrower list." />
      <form className="card row" onSubmit={(event) => {
        event.preventDefault();
        setApplied(skill.trim());
        setGone([]);
      }}>
        <label className="field grow">
          Skill
          <input value={skill} onChange={(event) => setSkill(event.target.value)} placeholder="TypeScript" />
        </label>
        <button className="ghost" type="submit">Filter</button>
      </form>
      {people.isLoading && <Loading label="Loading people" />}
      {people.error && <Note tone="error">{explain(people.error, 'Could not load people')}</Note>}
      {!people.isLoading && !people.error && !person && (
        <Empty title="No one new right now" message="You have seen the people who are open to a connection. Check back later." />
      )}
      {person && (
        <>
          <SwipeCard onPass={() => swipe('pass')} onLike={() => swipe('like')}>
          <article className="card stack">
            <RoleBadge role={person.role} />
            <h2>{person.displayName}</h2>
            <p>{person.bio ?? 'No bio yet'}</p>
            <div className="row">{person.skills.map((item) => <span className="badge" key={item.name}>{item.name}</span>)}</div>
            <Link className="text-link" to={`/people/${person.id}`}>Compatibility</Link>
          </article>
          </SwipeCard>
          {error && <Note tone="error">{error}</Note>}
          <div className="actions">
            <button className="ghost" type="button" onClick={() => swipe('pass')}>Pass</button>
            <button type="button" onClick={() => swipe('like')}>Like</button>
          </div>
        </>
      )}
    </div>
  );
}

export function PersonPage() {
  const { id = '' } = useParams();
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [reporting, setReporting] = useState(false);
  const profile = useQuery({ queryKey: ['person', id], queryFn: () => api<{ profile: Profile }>(`/profiles/${id}`) });
  const score = useQuery({ queryKey: ['compat', id], queryFn: () => api<Compatibility>(`/people/${id}/compatibility`) });
  const person = profile.data?.profile;
  if (profile.isLoading) return <Loading label="Loading profile" />;
  if (!person) return <Note tone="error">{(profile.error as Error | null)?.message ?? 'Missing profile'}</Note>;
  return (
    <article className="card stack">
      <Link className="text-link" to="/people">Back to people</Link>
      <RoleBadge role={person.role} />
      <h1>{person.displayName}</h1>
      <p>{person.bio}</p>
      {score.data && (
        <div className="score">
          <strong>{score.data.score.toFixed(1)}%</strong>
          <span>{score.data.source === 'ai' ? 'From the matchmaking service' : 'From shared skills and interests'}</span>
        </div>
      )}
      {score.data && Object.keys(score.data.components).length > 0 && (
        <div className="stack">
          {Object.entries(score.data.components).map(([key, value]) => (
            <div className="row spread" key={key}><span>{pretty(key)}</span><strong>{value}</strong></div>
          ))}
        </div>
      )}
      <button className="ghost" type="button" onClick={() => setReporting(true)}>Report</button>
      {error && <Note tone="error">{error}</Note>}
      {note && <Note tone="ok">{note}</Note>}
      {reporting && (
        <PromptDialog
          title="Report this person"
          description="Tell us what is wrong. Reports are saved for review."
          label="What is wrong?"
          submitLabel="Submit report"
          onCancel={() => setReporting(false)}
          onSubmit={async (reason) => {
            try {
              await sendReport('user', id, reason);
              setNote('Report saved.');
              setReporting(false);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Report failed');
              throw err;
            }
          }}
        />
      )}
    </article>
  );
}

export function ProfilePage() {
  const { session, rememberProfile, logout } = useAuth();
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ['me'], queryFn: () => api<{ profile: Profile }>('/profile') });
  const me = profile.data?.profile;
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  if (profile.isLoading) return <Loading label="Loading profile" />;
  if (!me) return <Note tone="error">{(profile.error as Error | null)?.message ?? 'Profile unavailable'}</Note>;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const skills = String(data.get('skills')).split('\n').flatMap((line) => {
      const parts = line.trim().split(/\s+/);
      const proficiency = Number(parts.at(-1));
      if (parts.length < 2 || !Number.isInteger(proficiency)) return [];
      return [{ name: parts.slice(0, -1).join(' '), proficiency }];
    });
    try {
      const updated = await api<{ profile: Profile }>('/profile', {
        method: 'PUT',
        body: JSON.stringify({
          bio: String(data.get('bio')),
          location: String(data.get('location')),
          experienceLevel: String(data.get('experience') || '') || null,
          connectionIntent: String(data.get('intent') || '') || null,
          visibility: String(data.get('visibility')),
          interests: String(data.get('interests')).split(',').map((item) => item.trim()).filter(Boolean),
        }),
      });
      await api('/profile/skills', { method: 'PUT', body: JSON.stringify({ skills }) });
      const github = String(data.get('github') ?? '').trim();
      if (github) {
        await api('/profile/github', { method: 'POST', body: JSON.stringify({ username: github }) });
      }
      rememberProfile(updated.profile);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      await queryClient.invalidateQueries({ queryKey: ['people'] });
      setSaved(true);
      setError('');
    } catch (err) {
      setSaved(false);
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  return (
    <form className="card stack" onSubmit={onSubmit}>
      <div className="row">
        <h1>{session?.profile.displayName}</h1>
        <RoleBadge role={me.role} />
      </div>
      <label className="field">Bio<textarea name="bio" defaultValue={me.bio ?? ''} rows={3} /></label>
      <label className="field">Location<input name="location" defaultValue={me.location ?? ''} /></label>
      <label className="field">Experience
        <select name="experience" defaultValue={me.experienceLevel ?? ''}>
          <option value="">Unset</option>
          <option value="junior">Junior</option>
          <option value="mid">Mid</option>
          <option value="senior">Senior</option>
          <option value="lead">Lead</option>
        </select>
      </label>
      <label className="field">Looking for
        <select name="intent" defaultValue={me.connectionIntent ?? ''}>
          <option value="">Unset</option>
          <option value="dating">Dating</option>
          <option value="networking">Networking</option>
          <option value="collab">Collaboration</option>
        </select>
      </label>
      <label className="field">Visibility
        <select name="visibility" defaultValue={me.visibility}>
          <option value="public">Public</option>
          <option value="semi_private">Semi-private</option>
          <option value="anonymous">Anonymous</option>
        </select>
      </label>
      <label className="field">Interests<input name="interests" defaultValue={me.interests.join(', ')} /></label>
      <label className="field">
        Skills
        <span className="help">One skill per line, then a score from 1 to 5. Example: TypeScript 4</span>
        <textarea name="skills" defaultValue={me.skills.map((skill) => `${skill.name} ${skill.proficiency}`).join('\n')} rows={4} />
      </label>
      <label className="field">GitHub username<input name="github" placeholder="octocat" /></label>
      {error && <Note tone="error">{error}</Note>}
      {saved && <Note tone="ok">Profile saved.</Note>}
      <div className="row">
        <button type="submit">Save profile</button>
        <button className="ghost" type="button" onClick={logout}><Icon name="logout" /> Log out</button>
      </div>
    </form>
  );
}

export function EventsPage() {
  const events = useQuery({ queryKey: ['events'], queryFn: () => api<{ events: EventItem[] }>('/events') });
  if (events.isLoading) return <StatusBlock title="Events" lede="Meetups and hackathons people can join." label="Loading events" />;
  if (events.error) return <StatusBlock title="Events" lede="Meetups and hackathons people can join." label="Could not load events" error={events.error} />;
  const items = events.data?.events ?? [];
  const action = <Link className="button" to="/events/new"><Icon name="plus" /> Create an event</Link>;
  if (items.length === 0) {
    return (
      <div className="stack">
        <PageHead title="Events" lede="Meetups and hackathons people can join." />
        <Empty title="No events yet" message="Post a meetup or hackathon and people can join from here." action={action} />
      </div>
    );
  }
  return (
    <div className="stack">
      <PageHead title="Events" lede="Meetups and hackathons people can join." action={action} />
      {items.map((event) => (
        <Link className="card" key={event.id} to={`/events/${event.id}`}>
          <div className="row spread">
            <strong>{event.title}</strong>
            {event.joined && <span className="badge blue">Joined</span>}
          </div>
          <p className="meta">{pretty(event.eventType)} · {when(event.startDate)}</p>
          <p>{event.participantCount} going</p>
        </Link>
      ))}
    </div>
  );
}

export function EventFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [online, setOnline] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const created = await api<{ event: EventItem }>('/events', {
        method: 'POST',
        body: JSON.stringify({
          title: String(data.get('title')),
          description: String(data.get('description')),
          eventType: 'meetup',
          startDate: new Date(String(data.get('start'))).toISOString(),
          isOnline: online,
          location: online ? null : String(data.get('location')),
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      navigate(`/events/${created.event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the event');
    }
  }

  return (
    <form className="card stack" onSubmit={onSubmit}>
      <div>
        <p className="eyebrow">Gather</p>
        <h1>New event</h1>
      </div>
      <label className="field">Title<input name="title" required /></label>
      <label className="field">Description<textarea name="description" rows={4} /></label>
      <label className="field">Starts<input name="start" type="datetime-local" required /></label>
      <label className="choice"><input type="checkbox" checked={online} onChange={(event) => setOnline(event.target.checked)} /> Online</label>
      {!online && <label className="field">Location<input name="location" /></label>}
      {error && <Note tone="error">{error}</Note>}
      <button type="submit">Create</button>
    </form>
  );
}

export function EventPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const event = useQuery({ queryKey: ['event', id], queryFn: () => api<{ event: EventItem }>(`/events/${id}`) });
  const item = event.data?.event;
  const mutation = useMutation({
    mutationFn: () => api(`/events/${id}/join`, { method: item?.joined ? 'DELETE' : 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['event', id] });
      await queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
  if (event.isLoading) return <Loading label="Loading event" />;
  if (!item) return <Note tone="error">{(event.error as Error | null)?.message ?? 'Missing event'}</Note>;
  return (
    <article className="card stack">
      <Link className="text-link" to="/events">All events</Link>
      <div className="row">
        <span className="badge blue">{pretty(item.eventType)}</span>
        {item.joined && <span className="badge">You are going</span>}
      </div>
      <h1>{item.title}</h1>
      <p>{item.description}</p>
      <p className="meta">{when(item.startDate)}</p>
      <p>{item.isOnline ? 'Online' : item.location || 'Location TBA'}</p>
      <p>{item.participantCount} going{item.creatorName ? ` · Hosted by ${item.creatorName}` : ''}</p>
      <button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>{item.joined ? 'Leave' : 'Join'}</button>
      {mutation.error && <Note tone="error">{(mutation.error as Error).message}</Note>}
    </article>
  );
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const notes = useQuery({ queryKey: ['notes'], queryFn: () => api<{ notifications: AppNotification[] }>('/notifications') });
  if (notes.isLoading) return <StatusBlock title="Notifications" lede="Requests, matches, and updates." label="Loading notifications" />;
  if (notes.error) return <StatusBlock title="Notifications" lede="Requests, matches, and updates." label="Could not load notifications" error={notes.error} />;
  const items = notes.data?.notifications ?? [];
  if (items.length === 0) return <Empty title="You are caught up" message="Connection requests and accepted matches will show up here." />;
  return (
    <div className="stack">
      <PageHead
        title="Notifications"
        lede="Requests, matches, and updates."
        action={(
          <button className="ghost" type="button" onClick={async () => {
            await api('/notifications/read', { method: 'POST', body: JSON.stringify({}) });
            await queryClient.invalidateQueries({ queryKey: ['notes'] });
          }}>Mark read</button>
        )}
      />
      {items.map((item) => (
        <article className={item.readAt ? 'card stack' : 'card stack unread'} key={item.id}>
          <strong>{item.title}</strong>
          <p className="meta">{item.body}</p>
        </article>
      ))}
    </div>
  );
}
