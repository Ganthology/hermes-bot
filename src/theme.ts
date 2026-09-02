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
