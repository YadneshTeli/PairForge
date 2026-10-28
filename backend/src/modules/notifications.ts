import { config } from '../config';
import { one, query } from '../db';

export interface NotificationInput {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function notify(profileId: string, input: NotificationInput): Promise<void> {
  try {
    await one(
      `INSERT INTO notifications (profile_id, type, title, body, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [profileId, input.type, input.title, input.body, JSON.stringify(input.data ?? {})],
    );
    if (!config.fcmServerKey) return;
    const tokens = await query<{ token: string }>(
      'SELECT token FROM device_tokens WHERE profile_id = $1',
      [profileId],
    );
    await Promise.all(
      tokens.map(async (row) => {
        try {
          await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
              Authorization: `key=${config.fcmServerKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: row.token,
              notification: { title: input.title, body: input.body },
              data: input.data ?? {},
            }),
          });
        } catch (err) {
          console.error('FCM send failed', err);
        }
      }),
    );
  } catch (err) {
    console.error('Notification failed', err);
  }
}

export async function listNotifications(profileId: string) {
  return query(
    `SELECT id, type, title, body, data, read_at, created_at
     FROM notifications
     WHERE profile_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [profileId],
  );
}

export async function unreadCount(profileId: string): Promise<number> {
  const row = await one<{ count: string }>(
    'SELECT COUNT(*)::int AS count FROM notifications WHERE profile_id = $1 AND read_at IS NULL',
    [profileId],
  );
  return Number(row?.count ?? 0);
}

export async function markRead(profileId: string, ids?: string[]): Promise<void> {
  if (ids && ids.length > 0) {
    await query(
      `UPDATE notifications SET read_at = NOW()
       WHERE profile_id = $1 AND id = ANY($2::uuid[]) AND read_at IS NULL`,
      [profileId, ids],
    );
    return;
  }
  await query(
    'UPDATE notifications SET read_at = NOW() WHERE profile_id = $1 AND read_at IS NULL',
    [profileId],
  );
}

export async function saveDeviceToken(profileId: string, token: string, platform: string): Promise<void> {
  await query(
    `INSERT INTO device_tokens (profile_id, token, platform)
     VALUES ($1, $2, $3)
     ON CONFLICT (token) DO UPDATE SET profile_id = EXCLUDED.profile_id, platform = EXCLUDED.platform`,
    [profileId, token, platform],
  );
}
