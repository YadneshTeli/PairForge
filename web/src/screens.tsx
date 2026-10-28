import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useRef, useState } from 'react';
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

function Empty({ title, message }: { title: string; message: string }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{message}</p>
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
    <main className="page">
      <form className="card stack" onSubmit={onSubmit}>
        <h1>Welcome back</h1>
        <label>Email<input name="email" type="email" required /></label>
        <label>Password<input name="password" type="password" required minLength={8} /></label>
        {error && <p className="error">{error}</p>}
        <button type="submit">Sign in</button>
        <Link to="/signup">Create an account</Link>
      </form>
    </main>
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
    <main className="page">
      <form className="card stack" onSubmit={onSubmit}>
        <h1>Create account</h1>
        <label>Display name<input name="displayName" required /></label>
        <label>Username<input name="username" required /></label>
        <label>Email<input name="email" type="email" required /></label>
        <label>Password<input name="password" type="password" required minLength={8} /></label>
        {error && <p className="error">{error}</p>}
        <button type="submit">Create account</button>
        <Link to="/login">I already have an account</Link>
      </form>
    </main>
  );
}

export function RolePage() {
  const { session, setRole } = useAuth();
  const [error, setError] = useState('');
  if (!session) return <Navigate to="/login" replace />;
  if (session.profile.role) return <Navigate to="/feed" replace />;

  return (
    <main className="page stack">
      <h1>How are you showing up?</h1>
      <p>Your role decides which questions you rate projects on. You can set it once.</p>
      {error && <p className="error">{error}</p>}
      {ROLES.map(([id, label]) => (
        <button key={id} className="ghost" type="button" onClick={() => setRole(id).catch((err: Error) => setError(err.message))}>
          {label}
        </button>
      ))}
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

  if (feed.isLoading) return <p>Loading feed…</p>;
  if (feed.error) return <p className="error">{(feed.error as Error).message}</p>;
  if (!project) {
    return <Empty title="No projects left" message="You have seen everything in the feed. Check back when someone posts a new idea." />;
  }

  return (
    <div className="stack">
      <article className="card stack">
        <div className="row"><RoleBadge role={project.owner?.role} /><span>{project.stage}</span></div>
        <h1>{project.title}</h1>
        <p>{project.tagline}</p>
        <p>{project.description}</p>
        <div className="row">{project.tags.map((tag) => <span className="badge" key={tag}>{tag}</span>)}</div>
        <Link to={`/projects/${project.id}`}>Open detail</Link>
      </article>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="ghost" type="button" onClick={() => commit('pass', project.id)}>Pass</button>
        <button type="button" onClick={() => { setPending({ id: project.id, action: 'like' }); setScores(Object.fromEntries((criteria.data?.criteria ?? []).map((item) => [item.key, 3]))); }}>Like</button>
        <button className="warn" type="button" onClick={() => { setPending({ id: project.id, action: 'superlike' }); setScores(Object.fromEntries((criteria.data?.criteria ?? []).map((item) => [item.key, 3]))); }}>Superlike</button>
      </div>
      {pending && (
        <div className="modal">
          <div className="sheet stack">
            <h2>{pending.action === 'superlike' ? 'Superlike' : 'Like'}</h2>
            <p>{pending.action === 'superlike' ? 'A superlike asks the owner to connect. Score all three before it is sent.' : 'Score all three. Nothing is saved until you submit.'}</p>
            {(criteria.data?.criteria ?? []).map((item) => (
              <label key={item.key}>
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
  if (mine.isLoading) return <p>Loading projects…</p>;
  if (mine.error) return <p className="error">{(mine.error as Error).message}</p>;
  const projects = mine.data?.projects ?? [];
  if (projects.length === 0) {
    return (
      <div className="stack">
        <Empty title="No projects yet" message="Post an idea to start collecting ratings from other roles." />
        <Link to="/projects/new">Post a project</Link>
      </div>
    );
  }
  return (
    <div className="stack">
      <Link to="/projects/new">Post a project</Link>
      {projects.map((project) => (
        <Link key={project.id} className="card" to={`/projects/${project.id}`}>
          <strong>{project.title}</strong>
          <div>{scoreLine(project)}</div>
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

  if (id && existing.isLoading) return <p>Loading…</p>;

  return (
    <form className="card stack" onSubmit={onSubmit}>
      <h1>{id ? 'Edit project' : 'Post a project'}</h1>
      <label>Title<input name="title" required defaultValue={project?.title} /></label>
      <label>Tagline<input name="tagline" required defaultValue={project?.tagline} /></label>
      <label>Description<textarea name="description" required defaultValue={project?.description} rows={5} /></label>
      <label>Stage
        <select value={stage} onChange={(event) => setStage(event.target.value)}>
          {STAGES.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <label>Tags, comma separated<input name="tags" defaultValue={project?.tags.join(', ')} /></label>
      <div className="row">
        {LOOKING.map((item) => (
          <label key={item}>
            <input
              type="checkbox"
              checked={looking.includes(item)}
              onChange={(event) => setLooking(event.target.checked ? [...looking, item] : looking.filter((value) => value !== item))}
            />
            {item}
          </label>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
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
  const item = project.data?.project;
  if (project.isLoading) return <p>Loading…</p>;
  if (!item) return <p className="error">{(project.error as Error | null)?.message ?? 'Missing project'}</p>;
  const owner = item.ownerId === session?.profile.id;

  return (
    <article className="card stack">
      <div className="row"><RoleBadge role={item.owner?.role} /><span>{item.stage}</span></div>
      <h1>{item.title}</h1>
      <p>{item.tagline}</p>
      <p>{item.description}</p>
      <div className="row">{item.tags.map((tag) => <span className="badge" key={tag}>{tag}</span>)}</div>
      <p>Looking for {item.lookingFor.join(', ') || 'collaborators'}</p>
      {owner ? (
        <>
          <strong>{scoreLine(item)}</strong>
          <div className="row">
            <Link to={`/projects/${item.id}/requests`}>Requests</Link>
            <Link to={`/projects/${item.id}/edit`}>Edit</Link>
            <button className="ghost" type="button" onClick={async () => {
              try {
                await api(`/projects/${item.id}`, { method: 'DELETE' });
                await queryClient.invalidateQueries({ queryKey: ['mine'] });
                navigate('/mine');
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Delete failed');
              }
            }}>Delete</button>
          </div>
          <h2>Team</h2>
          {(members.data?.members ?? []).map((member) => <div key={member.profile.id}>{member.profile.displayName}</div>)}
        </>
      ) : (
        <div className="row">
          <button type="button" onClick={async () => {
            const message = window.prompt('What would you take on?');
            if (!message || message.trim().length < 3) return;
            try {
              await api(`/projects/${item.id}/join-requests`, { method: 'POST', body: JSON.stringify({ message }) });
              window.alert('Request sent');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Request failed');
            }
          }}>Ask to join</button>
          <button className="ghost" type="button" onClick={() => report('project', item.id, setError)}>Report</button>
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </article>
  );
}

async function report(targetType: 'project' | 'user', targetId: string, setError: (value: string) => void) {
  const reason = window.prompt('What is wrong?');
  if (!reason || reason.trim().length < 3) return;
  try {
    await api('/reports', { method: 'POST', body: JSON.stringify({ targetType, targetId, reason }) });
    window.alert('Report saved');
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Report failed');
  }
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
  if (requests.isLoading) return <p>Loading…</p>;
  if (requests.error) return <p className="error">{(requests.error as Error).message}</p>;
  if (pending.length === 0) {
    return <Empty title="No requests yet" message="When someone superlikes this project, their ratings will show up here." />;
  }

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
      {pending.map((request) => (
        <article className="card stack" key={request.id}>
          <div className="row"><strong>{request.requester.displayName}</strong><RoleBadge role={request.requester.role} /></div>
          {Object.entries(request.ratings).map(([key, value]) => <div key={key}>{key}: {value} / 5</div>)}
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
  if (matches.isLoading) return <p>Loading…</p>;
  if (matches.error) return <p className="error">{(matches.error as Error).message}</p>;
  const items = matches.data?.matches ?? [];
  if (items.length === 0) {
    return <Empty title="No matches yet" message="A chat opens after a project owner accepts your superlike, or when two people like each other." />;
  }
  return (
    <div className="stack">
      {items.map((match) => (
        <Link className="card" key={match.id} to={`/matches/${match.id}`}>
          <div className="row"><strong>{match.other.displayName}</strong><RoleBadge role={match.other.role} />{match.unreadCount > 0 && <span className="badge">{match.unreadCount}</span>}</div>
          <div>{match.lastMessage?.content ?? match.projectTitle ?? 'No messages yet'}</div>
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

  useEffect(() => {
    setMessages(history.data?.messages ?? []);
  }, [history.data]);

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

  if (history.isLoading) return <p>Loading…</p>;

  return (
    <div className="card stack">
      <Link to={`/matches/${id}/pair`}>Open pair session</Link>
      <div className="messages">
        {messages.length === 0 && <Empty title="No messages yet" message="This chat just opened. Say hello." />}
        {messages.map((message) => (
          <div key={message.id} className={`bubble ${message.senderId === session?.profile.id ? 'mine' : 'theirs'}`}>{message.content}</div>
        ))}
      </div>
      <form className="row" onSubmit={(event) => {
        event.preventDefault();
        if (!draft.trim()) return;
        socketRef.current?.emit('sendMessage', { matchId: id, content: draft.trim() });
        setDraft('');
      }}>
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Message" />
        <button type="submit">Send</button>
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
      <h1>Pair session</h1>
      <p>The document stays in sync. Video uses a public STUN server and stays on this call.</p>
      <textarea
        rows={16}
        value={documentText}
        onChange={(event) => {
          const next = event.target.value;
          setDocumentText(next);
          socketRef.current?.emit('pairEdit', { matchId: id, document: next, revision: revision.current });
        }}
      />
      <div className="row">
        <video ref={localVideo} autoPlay muted playsInline width={240} />
        <video ref={remoteVideo} autoPlay playsInline width={240} />
      </div>
      <button type="button" onClick={startVideo}>Start video</button>
      {cameraError && <p className="error">{cameraError}</p>}
    </div>
  );
}

export function PeoplePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const people = useQuery({ queryKey: ['people'], queryFn: () => api<{ people: Profile[] }>('/people/feed') });
  const [gone, setGone] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [skill, setSkill] = useState('');
  const person = (people.data?.people ?? []).find((item) => !gone.includes(item.id));
  if (people.isLoading) return <p>Loading…</p>;
  if (people.error) return <p className="error">{(people.error as Error).message}</p>;
  if (!person) return <Empty title="No one new right now" message="You have seen the people who are open to a connection. Check back later." />;

  async function swipe(action: 'pass' | 'like') {
    try {
      const body = await api<{ match: { id: string } | null }>(`/people/${person!.id}/swipe`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setGone((current) => [...current, person!.id]);
      await queryClient.invalidateQueries({ queryKey: ['matches'] });
      if (body.match) navigate(`/matches/${body.match.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Swipe failed');
    }
  }

  return (
    <div className="stack">
      <article className="card stack">
        <RoleBadge role={person.role} />
        <h1>{person.displayName}</h1>
        <p>{person.bio ?? 'No bio yet'}</p>
        <div className="row">{person.skills.map((skill) => <span className="badge" key={skill.name}>{skill.name}</span>)}</div>
        <Link to={`/people/${person.id}`}>Compatibility</Link>
      </article>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="ghost" type="button" onClick={() => swipe('pass')}>Pass</button>
        <button type="button" onClick={() => swipe('like')}>Like</button>
      </div>
      <form className="row" onSubmit={async (event) => {
        event.preventDefault();
        try {
          await api(`/people/feed?skill=${encodeURIComponent(skill)}`);
          setError('');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Filter failed');
        }
      }}>
        <input value={skill} onChange={(event) => setSkill(event.target.value)} placeholder="Filter by skill (premium)" />
        <button className="ghost" type="submit">Filter</button>
      </form>
    </div>
  );
}

export function PersonPage() {
  const { id = '' } = useParams();
  const [error, setError] = useState('');
  const profile = useQuery({ queryKey: ['person', id], queryFn: () => api<{ profile: Profile }>(`/profiles/${id}`) });
  const score = useQuery({ queryKey: ['compat', id], queryFn: () => api<Compatibility>(`/people/${id}/compatibility`) });
  const person = profile.data?.profile;
  if (profile.isLoading) return <p>Loading…</p>;
  if (!person) return <p className="error">{(profile.error as Error | null)?.message ?? 'Missing profile'}</p>;
  return (
    <article className="card stack">
      <RoleBadge role={person.role} />
      <h1>{person.displayName}</h1>
      <p>{person.bio}</p>
      {score.data && (
        <>
          <h2>{score.data.score.toFixed(1)}% compatibility</h2>
          <p>{score.data.source === 'ai' ? 'From the matchmaking service' : 'From shared skills and interests'}</p>
        </>
      )}
      <button className="ghost" type="button" onClick={() => report('user', id, setError)}>Report</button>
      {error && <p className="error">{error}</p>}
    </article>
  );
}

export function ProfilePage() {
  const { session, rememberProfile, logout } = useAuth();
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ['me'], queryFn: () => api<{ profile: Profile }>('/profile') });
  const me = profile.data?.profile;
  const [error, setError] = useState('');
  if (profile.isLoading) return <p>Loading…</p>;
  if (!me) return <p className="error">{(profile.error as Error | null)?.message ?? 'Profile unavailable'}</p>;

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  return (
    <form className="card stack" onSubmit={onSubmit}>
      <div className="row"><h1>{session?.profile.displayName}</h1><RoleBadge role={me.role} /></div>
      <label>Bio<textarea name="bio" defaultValue={me.bio ?? ''} rows={3} /></label>
      <label>Location<input name="location" defaultValue={me.location ?? ''} /></label>
      <label>Experience
        <select name="experience" defaultValue={me.experienceLevel ?? ''}>
          <option value="">Unset</option>
          <option value="junior">Junior</option>
          <option value="mid">Mid</option>
          <option value="senior">Senior</option>
          <option value="lead">Lead</option>
        </select>
      </label>
      <label>Looking for
        <select name="intent" defaultValue={me.connectionIntent ?? ''}>
          <option value="">Unset</option>
          <option value="dating">Dating</option>
          <option value="networking">Networking</option>
          <option value="collab">Collaboration</option>
        </select>
      </label>
      <label>Visibility
        <select name="visibility" defaultValue={me.visibility}>
          <option value="public">Public</option>
          <option value="semi_private">Semi-private</option>
          <option value="anonymous">Anonymous</option>
        </select>
      </label>
      <label>Interests<input name="interests" defaultValue={me.interests.join(', ')} /></label>
      <label>Skills<textarea name="skills" defaultValue={me.skills.map((skill) => `${skill.name} ${skill.proficiency}`).join('\n')} rows={4} /></label>
      <label>GitHub username<input name="github" placeholder="octocat" /></label>
      {error && <p className="error">{error}</p>}
      <button type="submit">Save profile</button>
      <button className="ghost" type="button" onClick={logout}>Log out</button>
    </form>
  );
}

export function EventsPage() {
  const events = useQuery({ queryKey: ['events'], queryFn: () => api<{ events: EventItem[] }>('/events') });
  if (events.isLoading) return <p>Loading…</p>;
  if (events.error) return <p className="error">{(events.error as Error).message}</p>;
  const items = events.data?.events ?? [];
  if (items.length === 0) {
    return (
      <div className="stack">
        <Empty title="No events yet" message="Post a meetup or hackathon and people can join from here." />
        <Link to="/events/new">Create an event</Link>
      </div>
    );
  }
  return (
    <div className="stack">
      <Link to="/events/new">Create an event</Link>
      {items.map((event) => (
        <Link className="card" key={event.id} to={`/events/${event.id}`}>
          <strong>{event.title}</strong>
          <div>{event.eventType} · {event.participantCount} going {event.joined ? '· Joined' : ''}</div>
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
      <h1>New event</h1>
      <label>Title<input name="title" required /></label>
      <label>Description<textarea name="description" rows={4} /></label>
      <label>Starts<input name="start" type="datetime-local" required /></label>
      <label><input type="checkbox" checked={online} onChange={(event) => setOnline(event.target.checked)} /> Online</label>
      {!online && <label>Location<input name="location" /></label>}
      {error && <p className="error">{error}</p>}
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
  if (!item) return <p>Loading…</p>;
  return (
    <article className="card stack">
      <h1>{item.title}</h1>
      <p>{item.description}</p>
      <p>{item.isOnline ? 'Online' : item.location || 'Location TBA'}</p>
      <p>{item.participantCount} going</p>
      <button type="button" onClick={() => mutation.mutate()}>{item.joined ? 'Leave' : 'Join'}</button>
      {mutation.error && <p className="error">{(mutation.error as Error).message}</p>}
    </article>
  );
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const notes = useQuery({ queryKey: ['notes'], queryFn: () => api<{ notifications: AppNotification[] }>('/notifications') });
  if (notes.isLoading) return <p>Loading…</p>;
  const items = notes.data?.notifications ?? [];
  if (items.length === 0) return <Empty title="You are caught up" message="Connection requests and accepted matches will show up here." />;
  return (
    <div className="stack">
      <button type="button" onClick={async () => {
        await api('/notifications/read', { method: 'POST', body: JSON.stringify({}) });
        await queryClient.invalidateQueries({ queryKey: ['notes'] });
      }}>Mark read</button>
      {items.map((item) => (
        <article className="card" key={item.id}>
          <strong>{item.title}</strong>
          <div>{item.body}</div>
        </article>
      ))}
    </div>
  );
}
