import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { config } from './config';
import { one } from './db';
import { sendMatchSignal } from './modules/ai';
import { AuthUser } from './middleware';

function matchIdFrom(payload: unknown): string | null {
  if (typeof payload === 'string') return payload;
  if (payload && typeof payload === 'object' && 'matchId' in payload) {
    const value = (payload as { matchId?: unknown }).matchId;
    if (typeof value === 'string') return value;
  }
  return null;
}

export function attachSocket(server: HttpServer): Server {
  const io = new Server(server, {
    cors: { origin: config.corsOrigin === '*' ? true : config.corsOrigin },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string') {
      next(new Error('unauthorized'));
      return;
    }
    try {
      const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
      if (!payload.sub || typeof payload.profileId !== 'string') {
        next(new Error('unauthorized'));
        return;
      }
      const user: AuthUser = {
        id: payload.sub,
        profileId: payload.profileId,
        isAdmin: Boolean(payload.isAdmin),
      };
      socket.data.user = user;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as AuthUser;

    socket.on('join', async (payload: unknown) => {
      const matchId = matchIdFrom(payload);
      if (!matchId) return;
      const match = await one<{ id: string }>(
        `SELECT id FROM matches WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2)`,
        [matchId, user.profileId],
      );
      if (!match) {
        socket.emit('error', { error: 'forbidden' });
        return;
      }
      await socket.join(`match:${matchId}`);
      socket.emit('joined', { matchId });
    });

    socket.on('leaveRoom', async (payload: unknown) => {
      const matchId = matchIdFrom(payload);
      if (matchId) await socket.leave(`match:${matchId}`);
    });

    socket.on('sendMessage', async (payload: unknown) => {
      const matchId = matchIdFrom(payload);
      const content =
        payload && typeof payload === 'object' && 'content' in payload
          ? String((payload as { content?: unknown }).content ?? '').trim()
          : '';
      if (!matchId || !content || content.length > 4000) {
        socket.emit('error', { error: 'invalid message' });
        return;
      }
      const match = await one<{ id: string; user_a_id: string; user_b_id: string }>(
        `SELECT id, user_a_id, user_b_id FROM matches WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2)`,
        [matchId, user.profileId],
      );
      if (!match) {
        socket.emit('error', { error: 'forbidden' });
        return;
      }
      const saved = await one<{
        id: string;
        match_id: string;
        sender_id: string;
        content: string;
        created_at: Date;
      }>(
        `INSERT INTO messages (match_id, sender_id, content)
         VALUES ($1, $2, $3)
         RETURNING id, match_id, sender_id, content, created_at`,
        [matchId, user.profileId, content],
      );
      const message = {
        id: saved!.id,
        matchId: saved!.match_id,
        senderId: saved!.sender_id,
        content: saved!.content,
        createdAt: saved!.created_at,
        readAt: null,
      };
      io.to(`match:${matchId}`).emit('messageEvent', message);
      const other = match.user_a_id === user.profileId ? match.user_b_id : match.user_a_id;
      sendMatchSignal(user.profileId, other, 'message');
    });

    socket.on('readMessage', async (payload: unknown) => {
      const messageId =
        payload && typeof payload === 'object' && 'messageId' in payload
          ? (payload as { messageId?: unknown }).messageId
          : null;
      if (typeof messageId !== 'string') return;
      const updated = await one<{ id: string; match_id: string; read_at: Date }>(
        `UPDATE messages SET read_at = NOW()
         WHERE id = $1
           AND sender_id <> $2
           AND match_id IN (SELECT id FROM matches WHERE user_a_id = $2 OR user_b_id = $2)
         RETURNING id, match_id, read_at`,
        [messageId, user.profileId],
      );
      if (!updated) return;
      io.to(`match:${updated.match_id}`).emit('readMessage', {
        messageId: updated.id,
        matchId: updated.match_id,
        readAt: updated.read_at,
      });
    });
  });

  return io;
}
