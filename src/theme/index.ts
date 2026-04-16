export * from './colors';
export * from './typography';
export * from './spacing';

import {colors, ColorTheme} from './colors';
import {typography, fontSize, fontWeight} from './typography';
import {
  spacing,
  borderRadius,
  shadows,
  iconSize,
  componentHeight,
  screenPadding,
} from './spacing';

export const darkTheme = {
  colors: {
    ...colors,
    background: colors.dark.background,
    surface: colors.dark.surface,
    card: colors.dark.card,
    cardElevated: colors.dark.cardElevated,
    border: colors.dark.border,
    text: colors.dark.text.primary,
    textSecondary: colors.dark.text.secondary,
    textDisabled: colors.dark.text.disabled,
    textHint: colors.dark.text.hint,
    primaryTint: colors.tint.dark.primary,
    primaryTintStrong: colors.tint.dark.primaryStrong,
    dangerBackground: colors.tint.dark.danger,
    elevatedBackground: colors.dark.cardElevated,
  },
  typography,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
  shadows,
  iconSize,
  componentHeight,
  screenPadding,
  isDark: true,
};

export const lightTheme = {
  colors: {
    ...colors,
    background: colors.light.background,
    surface: colors.light.surface,
    card: colors.light.card,
    cardElevated: colors.light.cardElevated,
    border: colors.light.border,
    text: colors.light.text.primary,
    textSecondary: colors.light.text.secondary,
    textDisabled: colors.light.text.disabled,
    textHint: colors.light.text.hint,
    primaryTint: colors.tint.light.primary,
    primaryTintStrong: colors.tint.light.primaryStrong,
    dangerBackground: colors.error.background,
    elevatedBackground: colors.grey[5],
  },
  typography,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
  shadows,
  iconSize,
  componentHeight,
  screenPadding,
  isDark: false,
};

export type Theme = typeof darkTheme;

export const getTheme = (mode: ColorTheme): Theme => {
  return mode === 'dark' ? darkTheme : lightTheme;
};

export const defaultTheme = darkTheme;
