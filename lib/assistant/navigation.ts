import type { NavTarget } from '@/lib/assistant/knowledge';
import { ASSISTANT_NAV_TARGETS } from '@/lib/assistant/knowledge';

/** Sahifa ochish / navigatsiya so'rovi (bemor qidiruv emas). */
export function isPageOpenRequest(text: string): boolean {
  if (/(?:ochib ber|oching|ochilsin|ochib bering|sahifasini och|sahifani och|bo'limini och|bo'limni och)/i.test(text)) {
    return true;
  }
  return (
    /(?:sahifa|bo'lim|panel|dashboard|kabinet|portal)/i.test(text) &&
    /(?:och|o'ch|kir|ko'rsat|ol|ber|navigatsiya)/i.test(text)
  );
}

export function wantsNavigation(text: string): boolean {
  return (
    isPageOpenRequest(text) ||
    /(?:och|o'ch|kir|bor|ko'rsat|navigatsiya|ol|qayerda|qayer|topib ber|sahifa|yo'nal)/i.test(text)
  );
}

export function scoreNavTarget(target: NavTarget, text: string): number {
  let score = 0;
  for (const kw of target.keywords) {
    if (text.includes(kw.toLowerCase())) score += kw.length;
  }
  for (const w of target.label.toLowerCase().split(/\s+/)) {
    if (w.length <= 3) continue;
    const re = new RegExp(`(?:^|\\s)${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:ning|\\s|$)`, 'i');
    if (re.test(text)) score += 4;
  }
  return score;
}

export function findBestNavTarget(text: string, options?: { skipGeneric?: boolean }): NavTarget | null {
  if (options?.skipGeneric) return null;
  let best: NavTarget | null = null;
  let bestScore = 0;
  for (const t of ASSISTANT_NAV_TARGETS) {
    const s = scoreNavTarget(t, text);
    if (s > bestScore) {
      bestScore = s;
      best = t;
    }
  }
  return bestScore >= 4 ? best : null;
}

export function shouldAutoApplyNavigation(userMessage: string, assistantMessage: string): boolean {
  if (isPageOpenRequest(userMessage)) return true;
  return /sahifasini ochaman|sahifani ochaman|bo'limini ochaman|ochaman/i.test(assistantMessage);
}
