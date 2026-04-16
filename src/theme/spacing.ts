const BASE_UNIT = 4;

export const spacing = {
  xxs: BASE_UNIT,
  xs: BASE_UNIT * 2,
  sm: BASE_UNIT * 3,
  md: BASE_UNIT * 4,
  lg: BASE_UNIT * 5,
  xl: BASE_UNIT * 6,
  '2xl': BASE_UNIT * 8,
  '3xl': BASE_UNIT * 10,
  '4xl': BASE_UNIT * 12,
  '5xl': BASE_UNIT * 16,
};

export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

export const borderWidth = {
  none: 0,
  thin: 0.5,
  base: 1,
  thick: 2,
};

export const iconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 64,
};

export const componentHeight = {
  buttonSmall: 32,
  button: 44,
  buttonLarge: 52,
  input: 48,
  inputLarge: 56,
  header: 56,
  tabBar: 64,
};

export const screenPadding = {
  horizontal: spacing.md,
  vertical: spacing.md,
  top: spacing.lg,
  bottom: spacing.xl,
};

import {colors} from './colors';

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: colors.common.shadow,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: colors.common.shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.common.shadow,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: colors.common.shadow,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
};
