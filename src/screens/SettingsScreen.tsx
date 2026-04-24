import React, {useCallback} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {useAlert} from '../contexts/AlertContext';
import {Theme} from '../theme';
import {RootStackParamList} from '../types';

type ThemeOption = {
  key: 'light' | 'dark' | 'system';
  label: string;
  description: string;
  iconName: string;
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    key: 'light',
    label: 'Light Mode',
    description: 'Always use light theme',
    iconName: 'sunny-outline',
  },
  {
    key: 'dark',
    label: 'Dark Mode',
    description: 'Always use dark theme',
    iconName: 'moon-outline',
  },
  {
    key: 'system',
    label: 'System Default',
    description: 'Follow device theme setting',
    iconName: 'phone-portrait-outline',
  },
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SettingsScreen: React.FC = () => {
  const {theme, themeMode, setThemeMode} = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const {logout, user} = useAuth();
  const {showAlert} = useAlert();
  const styles = createStyles(theme);

  const handleLogout = useCallback(() => {
    showAlert({
      type: 'confirm',
      icon: 'log-out-outline',
      title: 'Sign Out',
      message:
        'Are you sure you want to sign out? You will need to log in again to scan tickets.',
      buttons: [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ],
    });
  }, [logout, showAlert]);

  const fullName = user?.metadata?.full_name || 'User';
  const initials = fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const tenantName = user?.metadata?.tenant?.tenant_name;
  const userRole = user?.metadata?.user_role || user?.role;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* User profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{fullName}</Text>
          {user?.email && (
            <Text style={styles.profileEmail}>{user.email}</Text>
          )}
          {(userRole || tenantName) && (
            <View style={styles.profileBadges}>
              {userRole && (
                <View style={styles.profileBadge}>
                  <Text style={styles.profileBadgeText}>{userRole}</Text>
                </View>
              )}
              {tenantName && (
                <View style={[styles.profileBadge, styles.tenantBadge]}>
                  <Text
                    style={[styles.profileBadgeText, styles.tenantBadgeText]}>
                    {tenantName}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Appearance section */}
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
                    <Icon name={option.iconName} size={22} color={theme.colors.text} style={styles.optionIcon} />
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

        {/* Account section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => navigation.navigate('ChangePassword')}
              activeOpacity={0.7}>
              <Icon name="lock-closed-outline" size={22} color={theme.colors.text} style={styles.optionIcon} />
              <View style={styles.optionContent}>
                <Text style={styles.optionLabel}>Change Password</Text>
                <Text style={styles.optionDescription}>
                  Update your account password
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={theme.colors.textHint} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign out */}
        <View style={styles.section}>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.optionRow}
              onPress={handleLogout}
              activeOpacity={0.7}>
              <Icon name="log-out-outline" size={22} color={theme.colors.error.main} style={styles.optionIcon} />
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, styles.logoutLabel]}>
                  Sign Out
                </Text>
                <Text style={styles.optionDescription}>
                  Log out of your account
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    // Profile card
    profileCard: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.screenPadding.horizontal,
      marginTop: theme.spacing.xl,
      borderRadius: theme.borderRadius['2xl'],
      paddingVertical: theme.spacing['2xl'],
      paddingHorizontal: theme.spacing.xl,
      ...theme.shadows.md,
    },
    avatarCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.colors.primary.main,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    avatarText: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.colors.primary.contrast,
    },
    profileName: {
      ...theme.typography.h3,
      color: theme.colors.text,
      marginBottom: theme.spacing.xxs,
    },
    profileEmail: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    profileBadges: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xxs,
    },
    profileBadge: {
      backgroundColor: theme.colors.primaryTint,
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xxs + 1,
    },
    profileBadgeText: {
      ...theme.typography.captionSmall,
      color: theme.colors.primary.main,
      fontWeight: '600',
    },
    tenantBadge: {
      backgroundColor: theme.colors.success.background,
    },
    tenantBadgeText: {
      color: theme.colors.success.main,
    },

    // Sections
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
    logoutLabel: {
      color: theme.colors.error.main,
    },
  });

export default SettingsScreen;
