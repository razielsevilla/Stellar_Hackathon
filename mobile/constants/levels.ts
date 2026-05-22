// ─── XP Level System ─────────────────────────────────────────────────────────
// XP is earned on task approval: Math.max(10, Math.floor(reward_amount * 10))
// A 5 TOKA task = 50 XP. A 1 TOKA task = 10 XP.

export interface LevelInfo {
  level: number;
  title: string;
  emoji: string;
  minXP: number;
  maxXP: number;         // exclusive upper bound; Infinity for the last level
  color: string;
}

export const LEVELS: LevelInfo[] = [
  { level: 1, title: 'Rookie',           emoji: '🌱', minXP: 0,    maxXP: 100,   color: '#8B9CC8' },
  { level: 2, title: 'Helper',           emoji: '⭐', minXP: 100,  maxXP: 300,   color: '#FFD740' },
  { level: 3, title: 'Star Helper',      emoji: '🌟', minXP: 300,  maxXP: 600,   color: '#FFB300' },
  { level: 4, title: 'Task Master',      emoji: '🏅', minXP: 600,  maxXP: 1000,  color: '#FF6B35' },
  { level: 5, title: 'Family Champion',  emoji: '🏆', minXP: 1000, maxXP: 1800,  color: '#00E5FF' },
  { level: 6, title: 'Household Hero',   emoji: '🦸', minXP: 1800, maxXP: 3000,  color: '#00E676' },
  { level: 7, title: 'Legend',           emoji: '👑', minXP: 3000, maxXP: Infinity, color: '#E040FB' },
];

/**
 * Returns the LevelInfo for a given total XP value.
 */
export function getLevelInfo(xp: number): LevelInfo & {
  progressPercent: number;
  xpIntoLevel: number;
  xpToNextLevel: number | null;
} {
  const totalXP = Math.max(0, xp || 0);
  const info = LEVELS.find(
    (l) => totalXP >= l.minXP && totalXP < l.maxXP
  ) ?? LEVELS[LEVELS.length - 1];

  const isMaxLevel = info.maxXP === Infinity;
  const xpIntoLevel = totalXP - info.minXP;
  const levelRange = isMaxLevel ? 1 : info.maxXP - info.minXP;
  const progressPercent = isMaxLevel ? 100 : Math.min(100, Math.round((xpIntoLevel / levelRange) * 100));
  const xpToNextLevel = isMaxLevel ? null : info.maxXP - totalXP;

  return { ...info, progressPercent, xpIntoLevel, xpToNextLevel };
}

/**
 * Returns a human-readable streak description.
 */
export function getStreakLabel(streak: number): string {
  if (streak === 0) return 'No streak yet';
  if (streak === 1) return '1 task streak 🔥';
  if (streak < 5)   return `${streak} task streak 🔥`;
  if (streak < 10)  return `${streak} tasks on fire!! 🔥🔥`;
  return `${streak} tasks — LEGENDARY!! 🔥🔥🔥`;
}
