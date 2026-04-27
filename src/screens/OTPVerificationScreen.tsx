import React, {useState, useRef, useCallback, useEffect} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  type TextInput as TextInputType,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAppTheme} from '../contexts/ThemeContext';
import {useSignup} from '../contexts/SignupContext';
import {RootStackParamList} from '../types';
import {verifyEmailOTP, resendEmailOTP} from '../services/signupService';
import StepIndicator from '../components/StepIndicator';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const brandLogo = require('../assets/logo.png');

type ThemeType = ReturnType<typeof useAppTheme>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type OTPRouteProp = RouteProp<RootStackParamList, 'EmailOTPVerification'>;

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;
const OTP_EXPIRY_SECONDS = 300; // 5 minutes

const OTPVerificationScreen: React.FC = () => {
  const theme = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<OTPRouteProp>();
  const {setStep} = useSignup();
  const {email} = route.params;

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [expiryTimer, setExpiryTimer] = useState(OTP_EXPIRY_SECONDS);
  const inputRefs = useRef<(TextInputType | null)[]>([]);

  useEffect(() => {
    setStep(2);
  }, [setStep]);

  // Auto-focus first input
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // OTP expiry countdown
  useEffect(() => {
    if (expiryTimer <= 0) {
      return;
    }
    const interval = setInterval(() => {
      setExpiryTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [expiryTimer]);

  const handleChange = useCallback(
    (text: string, index: number) => {
      if (text.length > 1) {
        const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
        const newOtp = [...otp];
        digits.forEach((digit, i) => {
          if (index + i < OTP_LENGTH) {
            newOtp[index + i] = digit;
          }
        });
        setOtp(newOtp);
        const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
        inputRefs.current[nextIndex]?.focus();
        return;
      }

      const digit = text.replace(/\D/g, '');
      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);
      setError('');

      if (digit && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [otp],
  );

  const handleKeyPress = useCallback(
    (key: string, index: number) => {
      if (key === 'Backspace' && !otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    },
    [otp],
  );

  const handleVerify = useCallback(async () => {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) {
      setError('Please enter the complete verification code');
      return;
    }

    if (expiryTimer <= 0) {
      setError('OTP has expired. Please request a new one.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await verifyEmailOTP(email, code);
      setStep(3);
      navigation.navigate('PhoneInput', {email});
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Verification failed';
      console.log('[EmailOTP] Setting error on screen:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [otp, email, expiryTimer, setStep, navigation]);

  const handleResend = useCallback(async () => {
    if (resendTimer > 0) {
      return;
    }

    try {
      await resendEmailOTP(email);
      setOtp(Array(OTP_LENGTH).fill(''));
      setExpiryTimer(OTP_EXPIRY_SECONDS);
      setError('');
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to resend OTP';
      setError(message);
    }

    setResendTimer(RESEND_COOLDOWN);
    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [resendTimer, email]);

  const formatExpiry = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const styles = createStyles(theme);
  const primary = theme.colors.primary.main;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {/* Brand */}
        <View style={styles.brandSection}>
          <Image source={brandLogo} style={styles.logo} />
          <Text style={styles.brandName}>
            TRUCKAST <Text style={{color: primary}}>QR</Text>
          </Text>
          <Text style={styles.subtitle}>Secure Ticket Scanner</Text>
        </View>

        {/* Step Indicator */}
        <StepIndicator currentStep={2} />

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Verify Email</Text>
          <Text style={styles.description}>
            Enter the 6-digit code sent to{' '}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>

          {expiryTimer > 0 ? (
            <Text style={styles.timerText}>
              Code expires in{' '}
              <Text style={styles.timerBold}>
                {formatExpiry(expiryTimer)}
              </Text>
            </Text>
          ) : (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                OTP has expired. Please resend.
              </Text>
            </View>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  styles.otpInput,
                  digit ? styles.otpInputFilled : null,
                  error ? styles.otpInputError : null,
                ]}
                value={digit}
                onChangeText={text => handleChange(text, index)}
                onKeyPress={({nativeEvent}) =>
                  handleKeyPress(nativeEvent.key, index)
                }
                keyboardType="number-pad"
                maxLength={index === 0 ? OTP_LENGTH : 1}
                selectTextOnFocus
                editable={!isLoading}
                placeholderTextColor={theme.colors.textHint}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleVerify}
            activeOpacity={0.8}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={theme.colors.primary.contrast} />
            ) : (
              <Text style={styles.buttonText}>Verify Email</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendTimer > 0}>
              <Text
                style={[
                  styles.resendLink,
                  resendTimer > 0 && styles.resendDisabled,
                ]}>
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Back to </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.switchLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footer}>Authorized personnel only</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: theme.screenPadding.horizontal,
    },
    brandSection: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    logo: {
      width: 80,
      height: 80,
      borderRadius: 18,
      marginBottom: theme.spacing.md,
    },
    brandName: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.text,
      letterSpacing: 1.5,
    },
    subtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xxs,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius['2xl'],
      padding: theme.spacing['2xl'],
      ...theme.shadows.lg,
    },
    cardTitle: {
      ...theme.typography.h3,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    description: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
    },
    emailHighlight: {
      color: theme.colors.primary.main,
      fontWeight: '600',
    },
    timerText: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    timerBold: {
      fontWeight: '700',
      color: theme.colors.text,
    },
    errorBox: {
      backgroundColor: theme.colors.error.background,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    errorText: {
      ...theme.typography.bodySmall,
      color: theme.colors.error.main,
    },
    otpContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.xs,
    },
    otpInput: {
      flex: 1,
      height: 52,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      textAlign: 'center',
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.text,
    },
    otpInputFilled: {
      borderColor: theme.colors.primary.main,
    },
    otpInputError: {
      borderColor: theme.colors.error.main,
    },
    button: {
      backgroundColor: theme.colors.primary.main,
      borderRadius: theme.borderRadius.md,
      height: theme.componentHeight.button,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: theme.spacing.xl,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      ...theme.typography.button,
      color: theme.colors.primary.contrast,
    },
    resendRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: theme.spacing.lg,
    },
    resendText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
    },
    resendLink: {
      ...theme.typography.bodySmall,
      color: theme.colors.primary.main,
      fontWeight: '600',
    },
    resendDisabled: {
      color: theme.colors.textHint,
      fontWeight: '400',
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: theme.spacing.md,
    },
    switchText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
    },
    switchLink: {
      ...theme.typography.bodySmall,
      color: theme.colors.primary.main,
      fontWeight: '600',
    },
    footer: {
      ...theme.typography.captionSmall,
      color: theme.colors.textHint,
      textAlign: 'center',
      marginTop: theme.spacing.xl,
      letterSpacing: 0.4,
    },
  });

export default OTPVerificationScreen;
