import { plexMono, plexSans } from './fonts';

/** Psyche light — Nous glass. #F8FAFF field, ink #0E2766, accent #0053FD, 4px. */
export const colors = {
  bg: '#F8FAFF',
  bgElevated: '#FFFFFF',
  bgSoft: '#F4F7FF',
  border: '#C2D4F7',
  text: '#0E2766',
  textMuted: '#3D4F7A',
  textDim: '#6B7785',
  accent: '#0053FD',
  accentPressed: '#0040C8',
  onAccent: '#F8FAFF',
  danger: '#C23B3B',
  success: '#3CB889',
  userBubble: '#E8F0FF',
  assistantBubble: '#FFFFFF',
  card: '#E8F0FF',
  warning: '#C47B00',
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
  sm: 4,
  md: 4,
  lg: 4,
} as const;

export const typography = {
  brand: {
    ...plexSans.bold,
    fontSize: 34,
    letterSpacing: -0.7,
  },
  title: {
    ...plexSans.semibold,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  body: {
    ...plexSans.regular,
    fontSize: 16,
    lineHeight: 22,
  },
  caption: {
    ...plexSans.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  mono: {
    ...plexMono.medium,
    fontSize: 11,
    letterSpacing: 0.14 * 11,
    textTransform: 'uppercase' as const,
  },
};
