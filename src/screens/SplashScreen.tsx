import React, {useEffect, useRef, useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {Theme} from '../theme';

const LOGO_SIZE = 120;
const FINDER_SIZE = 28;
const FINDER_INNER = 12;
const FINDER_BORDER = 3;
const FINDER_OFFSET = 14;
const DOT_SIZE = 5;
const VERIFY_SIZE = 30;
const GLOW_SIZE = 200;
const MIN_DISPLAY_MS = 2500;

interface SplashScreenProps {
  theme: Theme;
  isAppReady: boolean;
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({
  theme,
  isAppReady,
  onFinish,
}) => {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const scanAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // Animations
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(12)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const authBadgeOpacity = useRef(new Animated.Value(0)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  // Minimum display time
  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Staggered entrance — smooth timing, no springs (controlled/professional)
  useEffect(() => {
    Animated.sequence([
      // 1. Logo fades in with controlled scale
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // 2. Title slides up
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(titleSlide, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
      // 3. Subtitle + loading
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(loadingOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      // 4. Auth badge appears last
      Animated.timing(authBadgeOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    logoScale,
    logoOpacity,
    titleOpacity,
    titleSlide,
    subtitleOpacity,
    loadingOpacity,
    authBadgeOpacity,
  ]);

  // Subtle glow pulse behind logo (breathing/radar feel)
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [glowPulse]);

  // Scan line inside logo — starts after logo is visible
  useEffect(() => {
    const timer = setTimeout(() => {
      scanAnimRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ]),
      );
      scanAnimRef.current.start();
    }, 700);

    return () => {
      clearTimeout(timer);
      scanAnimRef.current?.stop();
    };
  }, [scanLineAnim]);

  // Exit when both app ready + min time elapsed
  useEffect(() => {
    if (isAppReady && minTimeElapsed) {
      onFinish();
    }
  }, [isAppReady, minTimeElapsed, onFinish]);

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, LOGO_SIZE - FINDER_OFFSET * 2 - 2],
  });

  const glowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.04, 0.12],
  });

  const primary = theme.colors.primary.main;
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      {/* ── Logo section ── */}
      <Animated.View
        style={[
          styles.logoSection,
          {opacity: logoOpacity, transform: [{scale: logoScale}]},
        ]}>
        {/* Outer glow */}
        <Animated.View
          style={[
            styles.logoGlow,
            {backgroundColor: primary, opacity: glowOpacity},
          ]}
        />

        {/* QR code frame */}
        <View style={[styles.logoFrame, {borderColor: `${primary}25`}]}>
          {/* Finder patterns */}
          <View
            style={[styles.finder, styles.finderTL, {borderColor: primary}]}>
            <View
              style={[styles.finderInner, {backgroundColor: primary}]}
            />
          </View>
          <View
            style={[styles.finder, styles.finderTR, {borderColor: primary}]}>
            <View
              style={[styles.finderInner, {backgroundColor: primary}]}
            />
          </View>
          <View
            style={[styles.finder, styles.finderBL, {borderColor: primary}]}>
            <View
              style={[styles.finderInner, {backgroundColor: primary}]}
            />
          </View>

          {/* Data dots */}
          <View style={styles.dotsGrid}>
            <View style={[styles.dot, {backgroundColor: primary}]} />
            <View
              style={[styles.dot, {backgroundColor: `${primary}50`}]}
            />
            <View style={[styles.dot, {backgroundColor: primary}]} />
            <View style={[styles.dot, {backgroundColor: primary}]} />
            <View style={styles.dotEmpty} />
            <View
              style={[styles.dot, {backgroundColor: `${primary}70`}]}
            />
            <View
              style={[styles.dot, {backgroundColor: `${primary}50`}]}
            />
            <View style={[styles.dot, {backgroundColor: primary}]} />
            <View style={styles.dotEmpty} />
          </View>

          {/* Scan line */}
          <Animated.View
            style={[
              styles.scanLine,
              {
                backgroundColor: primary,
                shadowColor: primary,
                transform: [{translateY: scanLineTranslateY}],
              },
            ]}
          />
        </View>

        {/* Verification badge */}
        <View style={[styles.verifyBadge, {backgroundColor: primary}]}>
          <Icon name="checkmark" size={15} color={theme.colors.common.white} />
        </View>
      </Animated.View>

      {/* ── Title ── */}
      <Animated.View
        style={[
          styles.titleWrap,
          {opacity: titleOpacity, transform: [{translateY: titleSlide}]},
        ]}>
        <Text style={styles.title}>TICKET SCANNER</Text>
      </Animated.View>

      {/* ── Subtitle ── */}
      <Animated.Text style={[styles.subtitle, {opacity: subtitleOpacity}]}>
        Authorized Ticket Verification
      </Animated.Text>

      {/* ── Loading section ── */}
      <Animated.View
        style={[styles.loadingSection, {opacity: loadingOpacity}]}>
        <View style={[styles.separator, {backgroundColor: `${primary}20`}]} />
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={primary} />
          <Text style={styles.loadingText}>
            Initializing Secure Scanner...
          </Text>
        </View>
      </Animated.View>

      {/* ── Authorization badge (bottom) ── */}
      <Animated.View
        style={[
          styles.authBadge,
          {opacity: authBadgeOpacity, borderColor: `${primary}25`},
        ]}>
        <Icon name="lock-closed" size={11} color={`${primary}CC`} />
        <Text style={[styles.authText, {color: `${primary}CC`}]}>
          AUTHORIZED USE ONLY
        </Text>
      </Animated.View>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Logo section
    logoSection: {
      marginBottom: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoGlow: {
      position: 'absolute',
      width: GLOW_SIZE,
      height: GLOW_SIZE,
      borderRadius: GLOW_SIZE / 2,
      top: (LOGO_SIZE - GLOW_SIZE) / 2,
      left: (LOGO_SIZE - GLOW_SIZE) / 2,
    },
    logoFrame: {
      width: LOGO_SIZE,
      height: LOGO_SIZE,
      borderRadius: 20,
      borderWidth: 2,
      position: 'relative',
      overflow: 'hidden',
    },

    // Finder patterns
    finder: {
      position: 'absolute',
      width: FINDER_SIZE,
      height: FINDER_SIZE,
      borderWidth: FINDER_BORDER,
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },
    finderTL: {
      top: FINDER_OFFSET,
      left: FINDER_OFFSET,
    },
    finderTR: {
      top: FINDER_OFFSET,
      right: FINDER_OFFSET,
    },
    finderBL: {
      bottom: FINDER_OFFSET,
      left: FINDER_OFFSET,
    },
    finderInner: {
      width: FINDER_INNER,
      height: FINDER_INNER,
      borderRadius: 2,
    },

    // Data dots
    dotsGrid: {
      position: 'absolute',
      bottom: FINDER_OFFSET + 2,
      right: FINDER_OFFSET + 2,
      flexDirection: 'row',
      flexWrap: 'wrap',
      width: DOT_SIZE * 3 + 6,
      gap: 3,
    },
    dot: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: 1,
    },
    dotEmpty: {
      width: DOT_SIZE,
      height: DOT_SIZE,
    },

    // Scan line
    scanLine: {
      position: 'absolute',
      top: FINDER_OFFSET,
      left: FINDER_OFFSET,
      right: FINDER_OFFSET,
      height: 2,
      borderRadius: 1,
      shadowOffset: {width: 0, height: 0},
      shadowOpacity: 0.8,
      shadowRadius: 6,
      elevation: 4,
    },

    // Verification badge
    verifyBadge: {
      position: 'absolute',
      bottom: -5,
      right: -5,
      width: VERIFY_SIZE,
      height: VERIFY_SIZE,
      borderRadius: VERIFY_SIZE / 2,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: theme.colors.background,
      shadowColor: theme.colors.common.shadow,
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 6,
    },
    verifyIcon: {
      fontSize: 15,
      color: theme.colors.common.white,
      fontWeight: '700',
    },

    // Title
    titleWrap: {
      marginBottom: 6,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      letterSpacing: 2.5,
    },

    // Subtitle
    subtitle: {
      fontSize: 14,
      fontWeight: '400',
      color: theme.colors.textHint,
      marginBottom: 36,
      letterSpacing: 0.5,
    },

    // Loading section
    loadingSection: {
      alignItems: 'center',
    },
    separator: {
      width: 48,
      height: 1,
      marginBottom: 20,
      borderRadius: 0.5,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    loadingText: {
      fontSize: 13,
      fontWeight: '400',
      color: theme.colors.textHint,
    },

    // Authorization badge
    authBadge: {
      position: 'absolute',
      bottom: 52,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 16,
      gap: 7,
    },
    authIcon: {
      fontSize: 11,
    },
    authText: {
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1.5,
    },
  });

export default SplashScreen;
