// Curated "legend" avatar presets — archetypes, not real players (no likeness
// rights issues). Each is an emoji + an i18n label key shown in the picker.
// Only the emoji string is persisted on the profile (`avatar`).
export const LEGEND_AVATARS = [
  { emoji: '🐐', labelKey: 'avatarGoat' },
  { emoji: '👑', labelKey: 'avatarKing' },
  { emoji: '🧤', labelKey: 'avatarKeeper' },
  { emoji: '🦁', labelKey: 'avatarCaptain' },
  { emoji: '🚀', labelKey: 'avatarRocket' },
  { emoji: '🧠', labelKey: 'avatarMaestro' },
  { emoji: '🎯', labelKey: 'avatarScorer' },
  { emoji: '💎', labelKey: 'avatarGem' },
  { emoji: '⚡', labelKey: 'avatarLightning' },
  { emoji: '🛡️', labelKey: 'avatarWall' },
  { emoji: '🎩', labelKey: 'avatarMagician' },
  { emoji: '🦅', labelKey: 'avatarEagle' },
  { emoji: '🔥', labelKey: 'avatarFlame' },
  { emoji: '⭐', labelKey: 'avatarStar' },
  { emoji: '🐂', labelKey: 'avatarBull' },
  { emoji: '⚽', labelKey: 'avatarBall' },
];

const LEGEND_EMOJIS = new Set(LEGEND_AVATARS.map((a) => a.emoji));
export function isLegendEmoji(s) {
  return LEGEND_EMOJIS.has(s);
}
