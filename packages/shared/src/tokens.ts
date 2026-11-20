/**
 * Design tokens taken from the Claude Design mockups (design/mockups, CLAUDE.md → "Design").
 * Shared by apps/mobile (`@/theme`) and apps/web. Never hard-code colors, radii or font families in screens.
 */

export const colors = {
  bg: '#F6F4EF',
  surface: '#FFFFFF',
  text: '#1D1C19',
  textSecondary: '#4A4740',
  textMuted: '#67635A',
  textDisabled: '#A39E92',
  border: '#E6E2D8',
  divider: '#EFECE4',
  inputBorder: '#D5D0C4',
  dashed: '#C9C3B5',
  track: '#EDEAE2',

  primary: '#2E7D4F',
  primaryDark: '#1F5E3A',
  primarySoft: '#E3F0E7',
  primaryMuted: '#7FB394',

  over: '#C2410C',
  overSoft: '#FCE9DC',
  warn: '#8A4A0B',
  warnSoft: '#FBEBD3',
  danger: '#B4320A',
  under: '#8E8A80',

  onPrimary: '#FFFFFF',
  chipActiveBg: '#1D1C19',
  chipActiveFg: '#FFFFFF',

  /** Camera viewfinder: black backdrop, dim overlay around the frame. */
  camera: '#000000',
  scrim: 'rgba(0, 0, 0, 0.55)',
} as const;

/** Colors for calories and macronutrients — use consistently in bars, legends, inputs. */
export const macroColors = {
  kcal: '#2E7D4F',
  protein: '#3566B0',
  fat: '#B7791F',
  carbs: '#7A5AB0',
} as const;

/** Avatar colors a family member can pick. */
export const memberColors = ['#2F5D9E', '#A3456F', '#2E7D4F', '#9A6416'] as const;

/** Product category tiles: soft background + dark letters (keys = `PRODUCT_CATEGORIES`). */
export const categoryColors = {
  meat: { bg: '#F6E1DC', fg: '#8A2E1A' },
  fish: { bg: '#DCE8F6', fg: '#24497F' },
  dairy: { bg: '#ECE7F6', fg: '#4F3A7F' },
  eggs: { bg: '#FBF1D3', fg: '#6E5208' },
  vegetables: { bg: '#E3F0E7', fg: '#1F5E3A' },
  fruits: { bg: '#FBEBD3', fg: '#7A440B' },
  grains: { bg: '#F1EADB', fg: '#5E4A1E' },
  bakery: { bg: '#F3E4D4', fg: '#6B3F17' },
  legumes: { bg: '#E8EED8', fg: '#4A5A1C' },
  nuts: { bg: '#EFE3DA', fg: '#5C3A24' },
  oils: { bg: '#F6F0CF', fg: '#5F5310' },
  sweets: { bg: '#F7E1EA', fg: '#7F2A4E' },
  drinks: { bg: '#DCF0F1', fg: '#1E5A5E' },
  other: { bg: '#EDEAE2', fg: '#4A4740' },
} as const;

/** Fast-food chain tiles (keys = `RESTAURANTS`). */
export const restaurantColors = {
  mcdonalds: { bg: '#FBEFC8', fg: '#8A1F11' },
  kfc: { bg: '#F7DCDC', fg: '#8E1B1F' },
  burgerking: { bg: '#F6E4D2', fg: '#6B3410' },
  pizzahut: { bg: '#F3DDE0', fg: '#7A1A2B' },
  other: { bg: '#EDEAE2', fg: '#4A4740' },
} as const;

export const radii = {
  sm: 9,
  md: 12,
  control: 14,
  lg: 16,
  card: 20,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

/** Minimum touch target height. */
export const touch = 44;

export const fonts = {
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  heading: 'Manrope_700Bold',
  headingHeavy: 'Manrope_800ExtraBold',
} as const;

export const shadow = {
  card: {
    shadowColor: '#1D1C19',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
} as const;
