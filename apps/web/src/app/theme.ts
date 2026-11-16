import { colors, macroColors, radii } from '@eatandcalc/shared/tokens';

/** Design tokens as CSS custom properties, injected once on the page root. */
export const cssVars = {
  '--bg': colors.bg,
  '--surface': colors.surface,
  '--text': colors.text,
  '--text-secondary': colors.textSecondary,
  '--text-muted': colors.textMuted,
  '--border': colors.border,
  '--primary': colors.primary,
  '--primary-dark': colors.primaryDark,
  '--primary-soft': colors.primarySoft,
  '--on-primary': colors.onPrimary,
  '--protein': macroColors.protein,
  '--fat': macroColors.fat,
  '--carbs': macroColors.carbs,
  '--radius-card': `${radii.card}px`,
  '--radius-control': `${radii.control}px`,
  '--radius-pill': `${radii.pill}px`,
} as Record<string, string>;
