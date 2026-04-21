import React, {useCallback, useEffect, useRef} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  StatusBar,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {Theme} from '../theme';

interface PrivacyPolicyScreenProps {
  theme: Theme;
  onAccept: () => void;
}

interface PolicySection {
  iconName: string;
  title: string;
  description: string;
}

const POLICY_SECTIONS: PolicySection[] = [
  {
    iconName: 'camera-outline',
    title: 'Camera Access',
    description:
      'We require camera access solely to scan authorized tickets. Camera data is processed on-device and is never recorded, stored, or transmitted externally.',
  },
  {
    iconName: 'phone-portrait-outline',
    title: 'Local Data Storage',
    description:
      'Scan history is stored exclusively on your device using local storage. No scan data is uploaded to external servers or cloud services.',
  },
  {
    iconName: 'lock-closed-outline',
    title: 'No Third-Party Sharing',
    description:
      'We do not collect, share, or sell any personal data or scan information to third parties. Your data stays on your device.',
  },
  {
    iconName: 'trash-outline',
    title: 'Your Control',
    description:
      'You can clear all scan history at any time from within the app. Uninstalling the app permanently removes all locally stored data.',
  },
];

const PrivacyPolicyScreen: React.FC<PrivacyPolicyScreenProps> = ({
  theme,
  onAccept,
}) => {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Fade out then call onAccept
  const handleAccept = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => onAccept());
  }, [fadeAnim, onAccept]);

  const styles = createStyles(theme);
  const primary = theme.colors.primary.main;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {/* ── Header ── */}
        <Animated.View
          style={[styles.header, {transform: [{translateY: slideAnim}]}]}>
          <View
            style={[
              styles.shieldCircle,
              {
                backgroundColor: theme.colors.primaryTint,
              },
            ]}>
            <Icon name="shield-checkmark-outline" size={36} color={theme.colors.primary.main} />
          </View>
          <Text style={styles.title}>Privacy & Data Policy</Text>
          <Text style={styles.subtitle}>
            How we protect your information
          </Text>
        </Animated.View>

        {/* ── Policy sections card ── */}
        <View style={styles.sectionsCard}>
          {POLICY_SECTIONS.map((section, index) => (
            <View key={section.title}>
              {index > 0 && <View style={styles.sectionDivider} />}
              <View style={styles.sectionRow}>
                <View
                  style={[
                    styles.sectionIconWrap,
                    {
                      backgroundColor: theme.colors.elevatedBackground,
                    },
                  ]}>
                  <Icon name={section.iconName} size={20} color={theme.colors.primary.main} />
                </View>
                <View style={styles.sectionContent}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionDesc}>
                    {section.description}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* ── Legal text ── */}
        <Text style={styles.legalText}>
          By tapping "Accept & Continue", you acknowledge that you have read
          and agree to our privacy and data handling practices as outlined
          above.
        </Text>

        {/* ── Accept button ── */}
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={handleAccept}
          activeOpacity={0.8}>
          <Text style={styles.acceptButtonText}>Accept & Continue</Text>
        </TouchableOpacity>

        {/* ── Version ── */}
        <Text style={styles.versionText}>Privacy Policy v1.0</Text>
      </ScrollView>
    </Animated.View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingHorizontal: theme.screenPadding.horizontal,
      paddingTop: theme.spacing['2xl'],
      paddingBottom: theme.spacing['3xl'],
    },

    // Header
    header: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    shieldCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    shieldIcon: {
      fontSize: 36,
    },
    title: {
      ...theme.typography.h2,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
      textAlign: 'center',
    },
    subtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },

    // Sections card
    sectionsCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.xl,
      ...theme.shadows.sm,
    },
    sectionDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing.sm,
    },
    sectionRow: {
      flexDirection: 'row',
      paddingVertical: theme.spacing.xs,
    },
    sectionIconWrap: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
      marginTop: 2,
    },
    sectionIcon: {
      fontSize: 20,
    },
    sectionContent: {
      flex: 1,
    },
    sectionTitle: {
      ...theme.typography.h4,
      color: theme.colors.text,
      marginBottom: theme.spacing.xxs,
    },
    sectionDesc: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },

    // Legal
    legalText: {
      ...theme.typography.caption,
      color: theme.colors.textHint,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
      lineHeight: 18,
    },

    // Accept button
    acceptButton: {
      backgroundColor: theme.colors.primary.main,
      borderRadius: theme.borderRadius.lg,
      height: theme.componentHeight.buttonLarge,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    acceptButtonText: {
      ...theme.typography.button,
      color: theme.colors.primary.contrast,
    },

    // Version
    versionText: {
      ...theme.typography.captionSmall,
      color: theme.colors.textHint,
      textAlign: 'center',
      marginTop: theme.spacing.lg,
    },
  });

export default PrivacyPolicyScreen;
