import { createServer } from 'http';
import type { AddressInfo } from 'net';
import { io as ioClient, type Socket } from 'socket.io-client';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getPool, query } from '../src/db';
import { languagesFromRepos } from '../src/modules/github';
import { attachSocket } from '../src/socket';
import { app, asAdmin, auth, prepareDatabase, RATINGS, register, resetData, shutdown } from './helpers';

beforeAll(async () => {
  await prepareDatabase();
});

beforeEach(async () => {
  await resetData();
});

afterAll(async () => {
  await shutdown();
});

async function createProject(token: string, title = 'Signal Desk') {
  const response = await request(app).post('/api/projects').set(auth(token)).send({
    title,
    tagline: 'A faster way to test an idea',
    description: 'Swipeable project used by the integration tests.',
    stage: 'idea',
    lookingFor: ['cofounder', 'developer'],
    tags: ['saas'],
  });
  expect(response.status).toBe(201);
  return response.body.project;
}

describe('auth and admin config', () => {
  it('rejects a non-admin and lets an admin read the seeded criteria and weights', async () => {
    const user = await register({ email: 'member@example.com', username: 'member', role: 'developer' });
    const forbidden = await request(app).get('/api/admin/rating-criteria').set(auth(user.token));
    expect(forbidden.status).toBe(403);

    const adminToken = await asAdmin(user.user.id, user.user.email);
    const criteria = await request(app).get('/api/admin/rating-criteria').set(auth(adminToken));
    expect(criteria.status).toBe(200);
    expect(criteria.body.criteria).toHaveLength(18);
    expect(criteria.body.criteria).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'vc', key: 'market_size', label: 'Market Size' }),
        expect.objectContaining({ role: 'developer', key: 'would_build', label: 'Would I Build This' }),
        expect.objectContaining({ role: 'student', key: 'approachable', label: 'Approachable for a Student' }),
        expect.objectContaining({ role: 'founder', key: 'would_cofound', label: 'Would I Cofound' }),
        expect.objectContaining({ role: 'cofounder', key: 'founder_fit', label: 'Founder-Market Fit' }),
        expect.objectContaining({ role: 'freelancer', key: 'fair_scope', label: 'Fair Scope for Engagement' }),
      ]),
    );

    const weights = await request(app).get('/api/admin/role-weights').set(auth(adminToken));
    expect(weights.status).toBe(200);
    expect(weights.body.weights).toEqual([
      { role: 'founder', weight: 1.2 },
      { role: 'cofounder', weight: 1.2 },
      { role: 'vc', weight: 1.5 },
      { role: 'developer', weight: 1.1 },
      { role: 'freelancer', weight: 1 },
      { role: 'student', weight: 0.8 },
    ]);
  });

  it('sets a role once', async () => {
    const user = await register({ email: 'role@example.com', username: 'roleuser' });
    expect(user.profile.role).toBeNull();
    const first = await request(app).patch('/api/profile/role').set(auth(user.token)).send({ role: 'founder' });
    expect(first.status).toBe(200);
    const second = await request(app).patch('/api/profile/role').set(auth(user.token)).send({ role: 'vc' });
    expect(second.status).toBe(409);
  });
});

describe('projects, swipes, and scores', () => {
  it('computes a weighted score, rejects the wrong criteria, and ignores ratings on a pass', async () => {
    const owner = await register({ email: 'owner@example.com', username: 'owner', role: 'founder' });
    const vc = await register({ email: 'vc@example.com', username: 'vcuser', role: 'vc' });
    const developer = await register({ email: 'dev@example.com', username: 'devuser', role: 'developer' });
    const student = await register({ email: 'student@example.com', username: 'student', role: 'student' });
    const passer = await register({ email: 'pass@example.com', username: 'passer', role: 'freelancer' });
    const project = await createProject(owner.token);

    const empty = await request(app).get(`/api/projects/${project.id}/score`).set(auth(owner.token));
    expect(empty.status).toBe(200);
    expect(empty.body).toMatchObject({ successScore: null, ratingCount: 0, band: null });

    const outsider = await request(app).get(`/api/projects/${project.id}/score`).set(auth(vc.token));
    expect(outsider.status).toBe(403);

    for (const person of [vc, developer, student]) {
      const swipe = await request(app)
        .post(`/api/projects/${project.id}/swipe`)
        .set(auth(person.token))
        .send({ action: 'like', ratings: RATINGS[person.profile.role!] });
      expect(swipe.status).toBe(201);
    }

    const scored = await request(app).get(`/api/projects/${project.id}/score`).set(auth(owner.token));
    const expected = (5 * 1.5 + 3 * 1.1 + 1 * 0.8) / (1.5 + 1.1 + 0.8);
    expect(scored.body.ratingCount).toBe(3);
    expect(scored.body.successScore).toBeCloseTo(expected, 4);
    expect(scored.body.band).toBe('Mixed signal');

    const founder = await register({ email: 'founder2@example.com', username: 'founder2', role: 'founder' });
    const again = await request(app)
      .post(`/api/projects/${project.id}/swipe`)
      .set(auth(founder.token))
      .send({ action: 'like', ratings: RATINGS.founder });
    expect(again.status).toBe(201);
    const updated = await request(app).get(`/api/projects/${project.id}/score`).set(auth(owner.token));
    const next = (5 * 1.5 + 3 * 1.1 + 1 * 0.8 + 4 * 1.2) / (1.5 + 1.1 + 0.8 + 1.2);
    expect(updated.body.successScore).toBeCloseTo(next, 4);
    expect(updated.body.successScore).not.toBe(scored.body.successScore);

    const wrong = await request(app)
      .post(`/api/projects/${project.id}/swipe`)
      .set(auth(passer.token))
      .send({ action: 'like', ratings: RATINGS.vc });
    expect(wrong.status).toBe(400);
    const passes = await request(app)
      .post(`/api/projects/${project.id}/swipe`)
      .set(auth(passer.token))
      .send({ action: 'pass', ratings: RATINGS.freelancer });
    expect(passes.status).toBe(201);
    expect(passes.body.swipe.ratings).toEqual({});
    expect(passes.body.matchRequest).toBeNull();
    const unchanged = await request(app).get(`/api/projects/${project.id}/score`).set(auth(owner.token));
    expect(unchanged.body.successScore).toBe(updated.body.successScore);

    const own = await request(app)
      .post(`/api/projects/${project.id}/swipe`)
      .set(auth(owner.token))
      .send({ action: 'pass' });
    expect(own.status).toBe(403);

    const feed = await request(app).get('/api/projects/feed').set(auth(vc.token));
    expect(feed.status).toBe(200);
    expect(feed.body.projects.find((item: { id: string }) => item.id === project.id)).toBeUndefined();
  });

  it('applies an admin weight change on the next score read', async () => {
    const owner = await register({ email: 'wowner@example.com', username: 'wowner', role: 'founder' });
    const vc = await register({ email: 'wvc@example.com', username: 'wvc', role: 'vc' });
    const developer = await register({ email: 'wdev@example.com', username: 'wdev', role: 'developer' });
    const project = await createProject(owner.token, 'Weight Check');
    await request(app)
      .post(`/api/projects/${project.id}/swipe`)
      .set(auth(vc.token))
      .send({ action: 'like', ratings: RATINGS.vc });
    await request(app)
      .post(`/api/projects/${project.id}/swipe`)
      .set(auth(developer.token))
      .send({ action: 'like', ratings: RATINGS.developer });
    const before = await request(app).get(`/api/projects/${project.id}/score`).set(auth(owner.token));
    expect(before.body.successScore).toBeCloseTo((5 * 1.5 + 3 * 1.1) / (1.5 + 1.1), 4);

    const adminToken = await asAdmin(owner.user.id, owner.user.email);
    const patched = await request(app)
      .patch('/api/admin/role-weights/vc')
      .set(auth(adminToken))
      .send({ weight: 3 });
    expect(patched.status).toBe(200);
    const after = await request(app).get(`/api/projects/${project.id}/score`).set(auth(owner.token));
    expect(after.body.successScore).toBeCloseTo((5 * 3 + 3 * 1.1) / (3 + 1.1), 4);
  });
});

describe('mutual approval and chat', () => {
  it('lets the owner accept a superlike and exchange a live message', async () => {
    const owner = await register({ email: 'chat-owner@example.com', username: 'chatowner', role: 'founder' });
    const requester = await register({ email: 'chat-req@example.com', username: 'chatreq', role: 'developer' });
    const stranger = await register({ email: 'chat-stranger@example.com', username: 'stranger', role: 'vc' });
    const project = await createProject(owner.token, 'Chat Project');

    const swipe = await request(app)
      .post(`/api/projects/${project.id}/swipe`)
      .set(auth(requester.token))
      .send({ action: 'superlike', ratings: RATINGS.developer });
    expect(swipe.status).toBe(201);
    expect(swipe.body.matchRequest.status).toBe('pending');

    const hidden = await request(app).get(`/api/projects/${project.id}/requests`).set(auth(stranger.token));
    expect(hidden.status).toBe(403);

    const inbox = await request(app).get(`/api/projects/${project.id}/requests`).set(auth(owner.token));
    expect(inbox.status).toBe(200);
    expect(inbox.body.requests[0].ratings).toMatchObject(RATINGS.developer);
    expect(inbox.body.requests[0].requester.displayName).toBe('chatreq');

    const notes = await request(app).get('/api/notifications').set(auth(owner.token));
    expect(notes.body.notifications.some((item: { type: string }) => item.type === 'match_request')).toBe(true);

    const accepted = await request(app)
      .patch(`/api/match-requests/${swipe.body.matchRequest.id}`)
      .set(auth(owner.token))
      .send({ status: 'accepted' });
    expect(accepted.status).toBe(200);
    const matchId = accepted.body.match.id as string;

    const server = createServer(app);
    attachSocket(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;

    const connect = (token: string) =>
      new Promise<Socket>((resolve, reject) => {
        const socket = ioClient(`http://127.0.0.1:${port}`, {
          auth: { token },
          transports: ['websocket'],
          reconnection: false,
        });
        socket.on('connect', () => resolve(socket));
        socket.on('connect_error', reject);
      });

    const ownerSocket = await connect(owner.token);
    const requesterSocket = await connect(requester.token);
    try {
      const ownerJoined = new Promise<void>((resolve) => ownerSocket.on('joined', () => resolve()));
      const requesterJoined = new Promise<void>((resolve) => requesterSocket.on('joined', () => resolve()));
      ownerSocket.emit('join', { matchId });
      requesterSocket.emit('join', { matchId });
      await Promise.all([ownerJoined, requesterJoined]);

      const received = new Promise<{ content: string; senderId: string; id: string }>((resolve) =>
        ownerSocket.on('messageEvent', resolve),
      );
      requesterSocket.emit('sendMessage', { matchId, content: 'Want to build this together?' });
      const message = await received;
      expect(message.content).toBe('Want to build this together?');
      expect(message.senderId).toBe(requester.profile.id);

      const history = await request(app).get(`/api/matches/${matchId}/messages`).set(auth(owner.token));
      expect(history.status).toBe(200);
      expect(history.body.messages).toHaveLength(1);

      const read = new Promise<any>((resolve) => requesterSocket.on('readMessage', resolve));
      ownerSocket.emit('readMessage', { messageId: message.id });
      const receipt = await read;
      expect(receipt.messageId).toBe(message.id);

      const matches = await request(app).get('/api/matches').set(auth(requester.token));
      expect(matches.body.matches[0].id).toBe(matchId);
      expect(matches.body.matches[0].unreadCount).toBe(0);
    } finally {
      ownerSocket.close();
      requesterSocket.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('does not create a match when the owner declines', async () => {
    const owner = await register({ email: 'dec-owner@example.com', username: 'decowner', role: 'founder' });
    const requester = await register({ email: 'dec-req@example.com', username: 'decreq', role: 'student' });
    const project = await createProject(owner.token, 'Declined Project');
    const swipe = await request(app)
      .post(`/api/projects/${project.id}/swipe`)
      .set(auth(requester.token))
      .send({ action: 'superlike', ratings: RATINGS.student });
    const declined = await request(app)
      .patch(`/api/match-requests/${swipe.body.matchRequest.id}`)
      .set(auth(owner.token))
      .send({ status: 'declined' });
    expect(declined.status).toBe(200);
    expect(declined.body.match).toBeNull();
    const count = await query<{ count: string }>('SELECT COUNT(*)::int AS count FROM matches');
    expect(Number(count[0].count)).toBe(0);
    const forbidden = await request(app)
      .patch(`/api/match-requests/${swipe.body.matchRequest.id}`)
      .set(auth(requester.token))
      .send({ status: 'accepted' });
    expect(forbidden.status).toBe(403);
  });
});

describe('project edits and reports', () => {
  it('lets only the owner edit or delete, and stores a report', async () => {
    const owner = await register({ email: 'edit-owner@example.com', username: 'editowner', role: 'founder' });
    const other = await register({ email: 'edit-other@example.com', username: 'editother', role: 'developer' });
    const project = await createProject(owner.token, 'Editable');
    const blocked = await request(app)
      .patch(`/api/projects/${project.id}`)
      .set(auth(other.token))
      .send({ title: 'Hijacked' });
    expect(blocked.status).toBe(403);
    const edited = await request(app)
      .patch(`/api/projects/${project.id}`)
      .set(auth(owner.token))
      .send({ title: 'Renamed' });
    expect(edited.status).toBe(200);
    expect(edited.body.project.title).toBe('Renamed');

    const report = await request(app).post('/api/reports').set(auth(other.token)).send({
      targetType: 'project',
      targetId: project.id,
      reason: 'Spam description',
    });
    expect(report.status).toBe(201);
    const stored = await getPool().query('SELECT reason, target_type FROM reports WHERE id = $1', [
      report.body.report.id,
    ]);
    expect(stored.rows[0]).toMatchObject({ reason: 'Spam description', target_type: 'project' });

    const denied = await request(app).delete(`/api/projects/${project.id}`).set(auth(other.token));
    expect(denied.status).toBe(403);
    const removed = await request(app).delete(`/api/projects/${project.id}`).set(auth(owner.token));
    expect(removed.status).toBe(204);
    const gone = await request(app).get(`/api/projects/${project.id}`).set(auth(owner.token));
    expect(gone.status).toBe(404);
  });
});

describe('people matching', () => {
  it('scores compatibility with the published weights and opens a chat on a mutual like', async () => {
    const ada = await register({ email: 'ada@example.com', username: 'ada', role: 'developer' });
    const grace = await register({ email: 'grace@example.com', username: 'grace', role: 'cofounder' });

    for (const person of [
      {
        token: ada.token,
        body: {
          bio: 'Builds product',
          experienceLevel: 'mid',
          interests: ['open source', 'music'],
          connectionIntent: 'networking',
        },
        skills: [
          { name: 'TypeScript', proficiency: 5 },
          { name: 'Flutter', proficiency: 3 },
        ],
      },
      {
        token: grace.token,
        body: {
          bio: 'Ships products',
          experienceLevel: 'mid',
          interests: ['open source', 'hiking'],
          connectionIntent: 'networking',
        },
        skills: [
          { name: 'typescript', proficiency: 4 },
          { name: 'go', proficiency: 4 },
        ],
      },
    ]) {
      expect((await request(app).put('/api/profile').set(auth(person.token)).send(person.body)).status).toBe(200);
      expect((await request(app).put('/api/profile/skills').set(auth(person.token)).send({ skills: person.skills })).status).toBe(200);
    }

    const score = await request(app).get(`/api/people/${grace.profile.id}/compatibility`).set(auth(ada.token));
    expect(score.status).toBe(200);
    expect(score.body.source).toBe('rules');
    const expected =
      0.35 * (1 / 3) + 0.2 * 0.5 + 0.1 * 1 + 0.1 * 0.5 + 0.25 * 0.5;
    expect(score.body.score).toBe(Math.round(expected * 1000) / 10);

    const feed = await request(app).get('/api/people/feed').set(auth(ada.token));
    expect(feed.body.people.map((person: { id: string }) => person.id)).toContain(grace.profile.id);

    const first = await request(app).post(`/api/people/${grace.profile.id}/swipe`).set(auth(ada.token)).send({ action: 'like' });
    expect(first.status).toBe(201);
    expect(first.body.match).toBeNull();
    const second = await request(app).post(`/api/people/${ada.profile.id}/swipe`).set(auth(grace.token)).send({ action: 'like' });
    expect(second.status).toBe(201);
    expect(second.body.match.id).toBeTruthy();
    const matches = await request(app).get('/api/matches').set(auth(ada.token));
    expect(matches.body.matches[0].kind).toBe('people');
  });
});

describe('events, teams, and devices', () => {
  it('creates an event, accepts a join request, and stores a device token', async () => {
    const owner = await register({ email: 'event-owner@example.com', username: 'eventowner', role: 'founder' });
    const guest = await register({ email: 'event-guest@example.com', username: 'eventguest', role: 'developer' });
    const project = await createProject(owner.token, 'Team Project');
    const created = await request(app).post('/api/events').set(auth(owner.token)).send({
      title: 'Build night',
      description: 'Ship something small',
      eventType: 'hackathon',
      startDate: new Date(Date.now() + 86400000).toISOString(),
      isOnline: true,
      url: 'https://example.com/event',
    });
    expect(created.status).toBe(201);
    const joined = await request(app).post(`/api/events/${created.body.event.id}/join`).set(auth(guest.token));
    expect(joined.body.event.participantCount).toBe(2);
    expect(joined.body.event.joined).toBe(true);

    const ask = await request(app)
      .post(`/api/projects/${project.id}/join-requests`)
      .set(auth(guest.token))
      .send({ message: 'I can take the API' });
    expect(ask.status).toBe(201);
    const accepted = await request(app)
      .patch(`/api/project-join-requests/${ask.body.request.id}`)
      .set(auth(owner.token))
      .send({ status: 'accepted' });
    expect(accepted.status).toBe(200);
    const members = await request(app).get(`/api/projects/${project.id}/members`).set(auth(owner.token));
    expect(members.body.members).toHaveLength(2);

    const device = await request(app).post('/api/devices').set(auth(guest.token)).send({
      token: 'test-device-token',
      platform: 'android',
    });
    expect(device.status).toBe(204);
    const guestNotes = await request(app).get('/api/notifications').set(auth(guest.token));
    expect(guestNotes.body.notifications.some((item: { type: string }) => item.type === 'join_accepted')).toBe(true);
  });
});

describe('premium, github languages, and pair sessions', () => {
  it('counts GitHub languages without calling the network', () => {
    expect(
      languagesFromRepos([
        { language: 'TypeScript' },
        { language: 'TypeScript' },
        { language: null },
        { language: 'Dart' },
      ]),
    ).toEqual([
      { name: 'TypeScript', repos: 2 },
      { name: 'Dart', repos: 1 },
    ]);
  });

  it('keeps advanced people filters behind premium and syncs a pair document', async () => {
    const ada = await register({ email: 'prem-ada@example.com', username: 'premada', role: 'developer' });
    const grace = await register({ email: 'prem-grace@example.com', username: 'premgrace', role: 'founder' });
    const locked = await request(app).get('/api/people/feed?skill=typescript').set(auth(ada.token));
    expect(locked.status).toBe(402);

    const adminToken = await asAdmin(ada.user.id, ada.user.email);
    const granted = await request(app)
      .patch(`/api/admin/profiles/${ada.profile.id}/premium`)
      .set(auth(adminToken))
      .send({ isPremium: true });
    expect(granted.status).toBe(200);
    const open = await request(app).get('/api/people/feed?skill=typescript').set(auth(adminToken));
    expect(open.status).toBe(200);

    await request(app).post(`/api/people/${grace.profile.id}/swipe`).set(auth(ada.token)).send({ action: 'like' });
    const matched = await request(app)
      .post(`/api/people/${ada.profile.id}/swipe`)
      .set(auth(grace.token))
      .send({ action: 'like' });
    const matchId = matched.body.match.id as string;
    const created = await request(app).post(`/api/matches/${matchId}/pair`).set(auth(ada.token));
    expect(created.status).toBe(201);
    expect(created.body.session.revision).toBe(0);

    const server = createServer(app);
    attachSocket(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;
    const socket: Socket = await new Promise((resolve, reject) => {
      const client = ioClient(`http://127.0.0.1:${port}`, {
        auth: { token: grace.token },
        transports: ['websocket'],
        reconnection: false,
      });
      client.on('connect', () => resolve(client));
      client.on('connect_error', reject);
    });
    try {
      const state = new Promise<{ revision: number }>((resolve) => socket.on('pairState', resolve));
      socket.emit('pairJoin', { matchId });
      const opened = await state;
      expect(opened.revision).toBe(0);
      const edited = new Promise<{ document: string; revision: number }>((resolve) => socket.on('pairEdit', resolve));
      socket.emit('pairEdit', { matchId, document: 'function hello() {}', revision: 0 });
      const next = await edited;
      expect(next.document).toBe('function hello() {}');
      expect(next.revision).toBe(1);
    } finally {
      socket.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
