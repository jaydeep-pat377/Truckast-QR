import React from 'react';
import {StyleSheet, View, Text, TouchableOpacity} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';

type ThemeOption = {
  key: 'light' | 'dark' | 'system';
  label: string;
  description: string;
  icon: string;
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    key: 'light',
    label: 'Light Mode',
    description: 'Always use light theme',
    icon: '☀️',
  },
  {
    key: 'dark',
    label: 'Dark Mode',
    description: 'Always use dark theme',
    icon: '🌙',
  },
  {
    key: 'system',
    label: 'System Default',
    description: 'Follow device theme setting',
    icon: '📱',
  },
];

const SettingsScreen: React.FC = () => {
  const {theme, themeMode, setThemeMode} = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>APPEARANCE</Text>
        <View style={styles.card}>
          {THEME_OPTIONS.map((option, index) => {
            const isSelected = themeMode === option.key;
            return (
              <React.Fragment key={option.key}>
                {index > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => setThemeMode(option.key)}
                  activeOpacity={0.7}>
                  <Text style={styles.optionIcon}>{option.icon}</Text>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    <Text style={styles.optionDescription}>
                      {option.description}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      isSelected && styles.radioSelected,
                    ]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    section: {
      paddingHorizontal: theme.screenPadding.horizontal,
      paddingTop: theme.spacing.xl,
    },
    sectionTitle: {
      ...theme.typography.label,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
      marginLeft: theme.spacing.xxs,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      ...theme.shadows.sm,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginLeft: theme.spacing.md + 36,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
    },
    optionIcon: {
      fontSize: 22,
      marginRight: theme.spacing.sm,
    },
    optionContent: {
      flex: 1,
    },
    optionLabel: {
      ...theme.typography.body,
      color: theme.colors.text,
      fontWeight: theme.fontWeight.medium,
    },
    optionDescription: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioSelected: {
      borderColor: theme.colors.primary.main,
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.primary.main,
    },
  });

export default SettingsScreen;
