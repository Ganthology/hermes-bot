import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
} from '@expo-google-fonts/ibm-plex-sans';

/** Psyche type — same faces as prototypes/themes (IBM Plex Sans + Mono). */
export const fonts = {
  sans: {
    400: 'IBMPlexSans_400Regular',
    500: 'IBMPlexSans_500Medium',
    600: 'IBMPlexSans_600SemiBold',
    700: 'IBMPlexSans_700Bold',
  },
  mono: {
    400: 'IBMPlexMono_400Regular',
    500: 'IBMPlexMono_500Medium',
    600: 'IBMPlexMono_600SemiBold',
  },
} as const;

export const plexSans = {
  regular: { fontFamily: fonts.sans[400] },
  medium: { fontFamily: fonts.sans[500] },
  semibold: { fontFamily: fonts.sans[600] },
  bold: { fontFamily: fonts.sans[700] },
} as const;

export const plexMono = {
  regular: { fontFamily: fonts.mono[400] },
  medium: { fontFamily: fonts.mono[500] },
  semibold: { fontFamily: fonts.mono[600] },
} as const;

export const fontSources = {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
};
