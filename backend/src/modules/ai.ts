import { config } from '../config';

export async function fetchAiScore(profileA: string, profileB: string): Promise<number | null> {
  try {
    const response = await fetch(`${config.matchmakingUrl}/match/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_a_id: profileA, user_b_id: profileB }),
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { compatibility_score?: number };
    if (typeof body.compatibility_score !== 'number' || !Number.isFinite(body.compatibility_score)) {
      return null;
    }
    return body.compatibility_score;
  } catch {
    return null;
  }
}

export function sendMatchSignal(userId: string, targetId: string, signal: string): void {
  fetch(`${config.matchmakingUrl}/match/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, target_id: targetId, signal }),
    signal: AbortSignal.timeout(800),
  }).catch(() => undefined);
}
