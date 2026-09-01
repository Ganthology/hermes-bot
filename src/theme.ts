/** Visual tokens for Hermes Bot. Keep the shell quiet — brand first, one job per screen. */
export const colors = {
  bg: '#0B1220',
  bgElevated: '#121A2B',
  bgSoft: '#182234',
  border: '#2A3548',
  text: '#F4F7FB',
  textMuted: '#9AA6B2',
  textDim: '#6B7785',
  accent: '#3D9CF0',
  accentPressed: '#2F7FC4',
  danger: '#E25C5C',
  success: '#3CB889',
  userBubble: '#1E3A5F',
  assistantBubble: '#182234',
  card: '#151E30',
  warning: '#D4A017',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

export const typography = {
  brand: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.6,
  },
  title: {
    fontSize: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
};
