import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Animated,
  Platform,
  Vibration,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAppTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {saveScanRecord, getScanHistory} from '../storage/scanHistory';
import {RootStackParamList, ScanRecord} from '../types';
import {isTKQR, isTKPipeQR} from '../utils/qrDecryption';
import {verifyQRPayload} from '../services/ticketService';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const brandLogo = require('../assets/logo.png');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type FeedbackState = 'idle' | 'success' | 'error' | 'processing';
type ThemeType = ReturnType<
  typeof import('../contexts/ThemeContext').useAppTheme
>;

const CORNER_LENGTH = 28;
const CORNER_THICKNESS = 3;
const CORNER_RADIUS = 14;

const QRScannerScreen: React.FC = () => {
  const theme = useAppTheme();
  const {getAccessToken, backendUrl} = useAuth();
  const insets = useSafeAreaInsets();
  const {width: screenWidth} = useWindowDimensions();
  const navigation = useNavigation<NavigationProp>();
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice('back');
  const [isActive, setIsActive] = useState(true);
  const [flashOn, setFlashOn] = useState(false);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('idle');
  const [historyCount, setHistoryCount] = useState(0);
  const isProcessing = useRef(false);
  const scanCooldownRef = useRef(false);
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SCAN_AREA_SIZE = Math.min(screenWidth * 0.65, 260);

  // Animations
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const cornerPulseAnim = useRef(new Animated.Value(0.6)).current;
  const feedbackScaleAnim = useRef(new Animated.Value(0.3)).current;
  const feedbackOpacityAnim = useRef(new Animated.Value(0)).current;
  const scanLineGlowAnim = useRef(new Animated.Value(0.5)).current;
  const historyBtnScale = useRef(new Animated.Value(1)).current;
  const brandFadeAnim = useRef(new Animated.Value(0)).current;

  // Load history count + reset scanner on focus
  useFocusEffect(
    useCallback(() => {
      // Clear any pending timers from previous scan
      if (navTimeoutRef.current) {
        clearTimeout(navTimeoutRef.current);
        navTimeoutRef.current = null;
      }
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }

      // Camera ON — never toggle isActive during scanning,
      // only on screen focus/blur to avoid vision-camera restart bugs
      setIsActive(true);

      // Brief cooldown on return to prevent instant re-scan
      scanCooldownRef.current = true;
      const cooldown = setTimeout(() => {
        scanCooldownRef.current = false;
        isProcessing.current = false;
        setFeedbackState('idle');
      }, 800);

      const loadCount = async () => {
        const data = await getScanHistory();
        setHistoryCount(data.length);
      };
      loadCount();

      return () => {
        clearTimeout(cooldown);
        setIsActive(false); // Camera OFF only when leaving screen
      };
    }, []),
  );

  // Brand header fade-in
  useEffect(() => {
    Animated.timing(brandFadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [brandFadeAnim]);

  // Scan line sweep
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [scanLineAnim]);

  // Corner pulse
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(cornerPulseAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(cornerPulseAnim, {
          toValue: 0.5,
          duration: 1400,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [cornerPulseAnim]);

  // Scan line glow
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineGlowAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineGlowAnim, {
          toValue: 0.5,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [scanLineGlowAnim]);

  const showFeedback = useCallback(
    (state: 'success' | 'error') => {
      setFeedbackState(state);
      feedbackScaleAnim.setValue(0.3);
      feedbackOpacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(feedbackScaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(feedbackOpacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [feedbackScaleAnim, feedbackOpacityAnim],
  );

  const [errorMessage, setErrorMessage] = useState('');

  const resetScanner = useCallback((delay = 2000) => {
    cooldownTimerRef.current = setTimeout(() => {
      cooldownTimerRef.current = null;
      setFeedbackState('idle');
      setErrorMessage('');
      isProcessing.current = false;
      scanCooldownRef.current = false;
    }, delay);
  }, []);

  const processScanResult = useCallback(
    async (data: string, type: string) => {
      try {
        const scanRecord: ScanRecord = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          data,
          type,
          timestamp: Date.now(),
        };

        // ── Check QR type ──
        const isTK = isTKQR(data);
        const isPipe = isTKPipeQR(data);
        console.log('[SCAN] isTKQR:', isTK, '| isTKPipeQR:', isPipe, '| data preview:', data.substring(0, 50));

        // ── TK QR: send to server for decryption + verification ──
        if (isTK || isPipe) {
          setFeedbackState('processing');

          const token = await getAccessToken();
          console.log('[SCAN] Token available:', !!token, '| backendUrl:', backendUrl);

          const result = await verifyQRPayload(data, token, backendUrl);
          console.log('[SCAN] Server result:', result.status, '| message:', result.message, '| hasQrData:', !!result.qrData, '| hasApiData:', !!result.apiData);

          if (result.status === 'not_found') {
            showFeedback('error');
            setErrorMessage(result.message || 'Ticket not found');
            resetScanner();
            return;
          }

          if (result.status === 'error') {
            showFeedback('error');
            setErrorMessage(result.message || 'Verification failed');
            resetScanner();
            return;
          }

          if (result.status === 'offline') {
            showFeedback('error');
            setErrorMessage(result.message || 'Network error');
            resetScanner();
            return;
          }

          // Verified — store data and navigate
          scanRecord.verified = result.status;
          if (result.qrData) {
            scanRecord.tkData = result.qrData;
          }
          if (result.apiData) {
            scanRecord.apiData = result.apiData;
          }

          showFeedback('success');
          await saveScanRecord(scanRecord);
          setHistoryCount(prev => prev + 1);

          scanCooldownRef.current = true;
          navTimeoutRef.current = setTimeout(() => {
            navTimeoutRef.current = null;
            navigation.navigate('ScanDetails', {scan: scanRecord});
          }, 650);
          return;
        }

        // ── Non-TK QR: pass through directly ──
        showFeedback('success');
        await saveScanRecord(scanRecord);
        setHistoryCount(prev => prev + 1);

        scanCooldownRef.current = true;

        navTimeoutRef.current = setTimeout(() => {
          navTimeoutRef.current = null;
          navigation.navigate('ScanDetails', {scan: scanRecord});
        }, 650);
      } catch (err) {
        // Catch-all: ensure scanner always recovers from unexpected errors
        console.error('[SCAN] Unexpected error:', err);
        showFeedback('error');
        setErrorMessage('Something went wrong. Try again.');
        resetScanner();
      }
    },
    [navigation, showFeedback, resetScanner, getAccessToken, backendUrl],
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      console.log('[SCANNER] onCodeScanned! count:', codes.length);

      if (isProcessing.current || scanCooldownRef.current || codes.length === 0) {
        return;
      }

      const value = codes[0].value || '';
      console.log('[SCANNER] value:', value.substring(0, 60));

      if (!value) {
        return;
      }

      isProcessing.current = true;
      Vibration.vibrate(Platform.OS === 'ios' ? 10 : 50);
      processScanResult(value, codes[0].type || 'qr');
    },
  });

  const handleSettingsPress = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  const handleHistoryPress = useCallback(() => {
    navigation.navigate('History');
  }, [navigation]);

  const onHistoryPressIn = useCallback(() => {
    Animated.spring(historyBtnScale, {
      toValue: 0.92,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [historyBtnScale]);

  const onHistoryPressOut = useCallback(() => {
    Animated.spring(historyBtnScale, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [historyBtnScale]);

  const styles = createStyles(theme, SCAN_AREA_SIZE);
  const primary = theme.colors.primary.main;

  // ── Permission screen ──
  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.permissionCard}>
          <Image source={brandLogo} style={styles.permissionLogo} />
          <Text style={styles.permissionBrand}>
            TRUCKAST <Text style={{color: primary}}>QR</Text>
          </Text>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            Camera access is needed to scan your tickets securely.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
            activeOpacity={0.8}>
            <Text style={styles.permissionButtonText}>Enable Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsLink}
            onPress={() => Linking.openSettings()}
            activeOpacity={0.8}>
            <Text style={styles.settingsLinkText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Loading camera ──
  if (!device) {
    return (
      <View style={styles.permissionContainer}>
        <Image source={brandLogo} style={styles.loadingLogo} />
        <ActivityIndicator
          size="large"
          color={primary}
          style={{marginTop: theme.spacing.xl}}
        />
        <Text style={[styles.loadingText, {marginTop: theme.spacing.md}]}>
          Initializing camera...
        </Text>
      </View>
    );
  }

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_AREA_SIZE - 4],
  });

  const isScanning = feedbackState === 'idle';

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        codeScanner={codeScanner}
        torch={flashOn ? 'on' : 'off'}
        photo={true}
      />

      {/* ── Full-screen overlay ── */}
      <View style={styles.overlay}>
        {/* ── Top: Brand header + instructions ── */}
        <View style={styles.overlayTop}>
          {/* Brand bar */}
          <Animated.View
            style={[
              styles.brandBar,
              {paddingTop: insets.top + 8, opacity: brandFadeAnim},
            ]}>
            <Image source={brandLogo} style={styles.brandLogo} />
            <Text style={styles.brandName}>
              TRUCKAST <Text style={[styles.brandAccent, {color: primary}]}>QR</Text>
            </Text>
            <View style={styles.brandBarSpacer} />
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={handleSettingsPress}
              activeOpacity={0.7}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Text style={styles.settingsBtnIcon}>⚙️</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Instructions (pushed to bottom of flex area, above scanner) */}
          <View style={styles.instructionArea}>
            <Text style={styles.headerTitle}>Scan your ticket</Text>
            <Text style={styles.headerSubtitle}>
              Position your ticket within the frame
            </Text>
          </View>
        </View>

        {/* ── Middle: scan frame cutout ── */}
        <View style={styles.overlayMiddleRow}>
          <View style={styles.overlaySide} />
          <View style={styles.scanArea}>
            <Animated.View
              style={[
                styles.corner,
                styles.cornerTL,
                {opacity: cornerPulseAnim},
              ]}
            />
            <Animated.View
              style={[
                styles.corner,
                styles.cornerTR,
                {opacity: cornerPulseAnim},
              ]}
            />
            <Animated.View
              style={[
                styles.corner,
                styles.cornerBL,
                {opacity: cornerPulseAnim},
              ]}
            />
            <Animated.View
              style={[
                styles.corner,
                styles.cornerBR,
                {opacity: cornerPulseAnim},
              ]}
            />

            {isScanning && (
              <Animated.View
                style={[
                  styles.scanLineWrap,
                  {transform: [{translateY: scanLineTranslateY}]},
                ]}>
                <Animated.View
                  style={[styles.scanLineGlow, {opacity: scanLineGlowAnim}]}
                />
                <View style={styles.scanLine} />
              </Animated.View>
            )}

            {feedbackState === 'processing' && (
              <View style={styles.feedbackCenter}>
                <ActivityIndicator
                  size="large"
                  color={theme.colors.common.white}
                />
                <Text style={styles.feedbackLabel}>Verifying...</Text>
              </View>
            )}

            {feedbackState === 'success' && (
              <Animated.View
                style={[
                  styles.feedbackCenter,
                  {
                    opacity: feedbackOpacityAnim,
                    transform: [{scale: feedbackScaleAnim}],
                  },
                ]}>
                <View style={styles.successCircle}>
                  <Text style={styles.feedbackSymbol}>✓</Text>
                </View>
                <Text style={styles.feedbackLabel}>Scanned!</Text>
              </Animated.View>
            )}

            {feedbackState === 'error' && (
              <Animated.View
                style={[
                  styles.feedbackCenter,
                  {
                    opacity: feedbackOpacityAnim,
                    transform: [{scale: feedbackScaleAnim}],
                  },
                ]}>
                <View style={styles.errorCircle}>
                  <Text style={styles.feedbackSymbol}>✕</Text>
                </View>
                <Text style={styles.feedbackLabel}>
                  {errorMessage || 'Try again'}
                </Text>
              </Animated.View>
            )}
          </View>
          <View style={styles.overlaySide} />
        </View>

        {/* ── Bottom: controls ── */}
        <View style={styles.overlayBottom}>
          {/* Flash toggle */}
          <TouchableOpacity
            style={[
              styles.controlPill,
              flashOn && styles.controlPillActive,
            ]}
            onPress={() => setFlashOn(prev => !prev)}
            activeOpacity={0.7}>
            <Text style={styles.controlPillIcon}>
              {flashOn ? '⚡' : '🔦'}
            </Text>
            <Text
              style={[
                styles.controlPillLabel,
                flashOn && styles.controlPillLabelActive,
              ]}>
              {flashOn ? 'On' : 'Flash'}
            </Text>
          </TouchableOpacity>

          {/* History navigation button */}
          <Animated.View
            style={[
              styles.historyBtnWrap,
              {transform: [{scale: historyBtnScale}]},
            ]}>
            <TouchableOpacity
              style={styles.historyBtn}
              onPress={handleHistoryPress}
              onPressIn={onHistoryPressIn}
              onPressOut={onHistoryPressOut}
              activeOpacity={0.85}>
              <Text style={styles.historyBtnIcon}>🕐</Text>
              <Text style={styles.historyBtnText}>History</Text>
              {historyCount > 0 && (
                <View style={styles.historyBadge}>
                  <Text style={styles.historyBadgeText}>
                    {historyCount > 99 ? '99+' : historyCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Auth hint */}
          <Text style={styles.authHint}>Authorized ticket scanning only</Text>
        </View>
      </View>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────
const createStyles = (theme: ThemeType, scanAreaSize: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.common.black,
    },

    // ── Permission / Loading ──
    permissionContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      padding: theme.screenPadding.horizontal,
    },
    permissionLogo: {
      width: 72,
      height: 72,
      borderRadius: 16,
      marginBottom: theme.spacing.md,
    },
    permissionBrand: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      letterSpacing: 1.5,
      marginBottom: theme.spacing.xl,
    },
    permissionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius['2xl'],
      padding: theme.spacing['3xl'],
      alignItems: 'center',
      width: '100%',
      ...theme.shadows.lg,
    },
    permissionTitle: {
      ...theme.typography.h3,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    permissionText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
      lineHeight: 22,
    },
    permissionButton: {
      backgroundColor: theme.colors.primary.main,
      borderRadius: theme.borderRadius.md,
      width: '100%',
      alignItems: 'center',
      height: theme.componentHeight.button,
      justifyContent: 'center',
    },
    permissionButtonText: {
      ...theme.typography.button,
      color: theme.colors.primary.contrast,
    },
    settingsLink: {
      marginTop: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    settingsLinkText: {
      ...theme.typography.buttonSmall,
      color: theme.colors.primary.main,
    },
    loadingLogo: {
      width: 64,
      height: 64,
      borderRadius: 14,
    },
    loadingText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },

    // ── Overlay ──
    overlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'space-between',
    },

    // Top section: brand bar + instructions
    overlayTop: {
      flex: 1,
      backgroundColor: theme.colors.scanner.overlay,
    },
    brandBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
    },
    brandLogo: {
      width: 32,
      height: 32,
      borderRadius: 8,
      marginRight: theme.spacing.sm,
    },
    brandName: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.common.white,
      letterSpacing: 1.2,
    },
    brandAccent: {
      fontWeight: '400',
    },
    brandBarSpacer: {
      flex: 1,
    },
    settingsBtn: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.scanner.controlBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    settingsBtnIcon: {
      fontSize: 16,
    },
    instructionArea: {
      flex: 1,
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingBottom: theme.spacing['2xl'],
    },
    headerTitle: {
      ...theme.typography.h2,
      color: theme.colors.common.white,
      marginBottom: theme.spacing.xs,
    },
    headerSubtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.scanner.textSecondary,
      letterSpacing: 0.3,
    },

    // Middle: scan frame
    overlayMiddleRow: {
      flexDirection: 'row',
    },
    overlaySide: {
      flex: 1,
      backgroundColor: theme.colors.scanner.overlay,
    },
    scanArea: {
      width: scanAreaSize,
      height: scanAreaSize,
      position: 'relative',
      overflow: 'hidden',
    },
    corner: {
      position: 'absolute',
      width: CORNER_LENGTH,
      height: CORNER_LENGTH,
      borderColor: theme.colors.scanner.cornerBorder,
    },
    cornerTL: {
      top: 0,
      left: 0,
      borderTopWidth: CORNER_THICKNESS,
      borderLeftWidth: CORNER_THICKNESS,
      borderTopLeftRadius: CORNER_RADIUS,
    },
    cornerTR: {
      top: 0,
      right: 0,
      borderTopWidth: CORNER_THICKNESS,
      borderRightWidth: CORNER_THICKNESS,
      borderTopRightRadius: CORNER_RADIUS,
    },
    cornerBL: {
      bottom: 0,
      left: 0,
      borderBottomWidth: CORNER_THICKNESS,
      borderLeftWidth: CORNER_THICKNESS,
      borderBottomLeftRadius: CORNER_RADIUS,
    },
    cornerBR: {
      bottom: 0,
      right: 0,
      borderBottomWidth: CORNER_THICKNESS,
      borderRightWidth: CORNER_THICKNESS,
      borderBottomRightRadius: CORNER_RADIUS,
    },

    // Scan line
    scanLineWrap: {
      position: 'absolute',
      left: CORNER_LENGTH / 2,
      right: CORNER_LENGTH / 2,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scanLineGlow: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 20,
      backgroundColor: theme.colors.primary.main,
      opacity: 0.15,
      borderRadius: 10,
    },
    scanLine: {
      height: 2,
      width: '100%',
      backgroundColor: theme.colors.primary.main,
      borderRadius: 1,
      shadowColor: theme.colors.primary.main,
      shadowOffset: {width: 0, height: 0},
      shadowOpacity: 0.9,
      shadowRadius: 6,
      elevation: 4,
    },

    // Feedback
    feedbackCenter: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.scanner.feedbackOverlay,
    },
    successCircle: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: theme.colors.success.main,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.success.main,
      shadowOffset: {width: 0, height: 0},
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 8,
    },
    errorCircle: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: theme.colors.error.main,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.error.main,
      shadowOffset: {width: 0, height: 0},
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 8,
    },
    feedbackSymbol: {
      fontSize: 30,
      color: theme.colors.common.white,
      fontWeight: '700',
    },
    feedbackLabel: {
      ...theme.typography.buttonSmall,
      color: theme.colors.common.white,
      marginTop: theme.spacing.sm,
    },

    // Bottom overlay
    overlayBottom: {
      flex: 1,
      backgroundColor: theme.colors.scanner.overlay,
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingTop: theme.spacing['2xl'],
    },
    controlPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.scanner.controlBackground,
      borderRadius: theme.borderRadius.full,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.xxs,
      marginBottom: theme.spacing.xl,
    },
    controlPillActive: {
      backgroundColor: theme.colors.scanner.flashlight,
    },
    controlPillIcon: {
      fontSize: 14,
    },
    controlPillLabel: {
      ...theme.typography.captionSmall,
      color: theme.colors.scanner.controlText,
    },
    controlPillLabelActive: {
      color: theme.colors.common.black,
    },

    // History button
    historyBtnWrap: {
      marginBottom: theme.spacing.xl,
    },
    historyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.scanner.buttonBackground,
      borderWidth: 1,
      borderColor: theme.colors.scanner.buttonBorder,
      borderRadius: theme.borderRadius.full,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xl,
      gap: theme.spacing.xs,
    },
    historyBtnIcon: {
      fontSize: 16,
    },
    historyBtnText: {
      ...theme.typography.buttonSmall,
      color: theme.colors.common.white,
    },
    historyBadge: {
      backgroundColor: theme.colors.primary.main,
      borderRadius: theme.borderRadius.full,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xxs + 2,
      marginLeft: theme.spacing.xxs,
    },
    historyBadgeText: {
      ...theme.typography.captionSmall,
      color: theme.colors.primary.contrast,
      fontWeight: theme.fontWeight.semiBold,
    },
    authHint: {
      ...theme.typography.captionSmall,
      color: theme.colors.scanner.hintText,
      textAlign: 'center',
      letterSpacing: 0.4,
    },
  });

export default QRScannerScreen;
