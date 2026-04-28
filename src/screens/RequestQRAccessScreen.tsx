import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StatusBar,
  Keyboard,
  ActivityIndicator,
  type TextInput as TextInputType,
} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAppTheme} from '../contexts/ThemeContext';
import {useSignup} from '../contexts/SignupContext';
import {RootStackParamList} from '../types';
import {signup} from '../services/signupService';
import StepIndicator from '../components/StepIndicator';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const brandLogo = require('../assets/logo.png');

type ThemeType = ReturnType<typeof useAppTheme>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RequestQRAccessScreen: React.FC = () => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const {data, updateData, setStep} = useSignup();

  const [firstName, setFirstName] = useState(data.firstName);
  const [lastName, setLastName] = useState(data.lastName);
  const [email, setEmail] = useState(data.email);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const lastNameRef = useRef<TextInputType>(null);
  const emailRef = useRef<TextInputType>(null);

  useEffect(() => {
    setStep(1);
  }, [setStep]);

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [firstName, lastName, email]);

  const handleSubmit = useCallback(async () => {
    Keyboard.dismiss();
    setError('');

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await signup({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      });

      console.log('[CreateAccount] API result:', JSON.stringify(result));

      if (!result.success) {
        setError(result.message || 'Signup failed');
        return;
      }

      updateData({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      });

      // Handle already-verified states — skip to the correct step
      if (result.code === 'VERIFICATION_COMPLETE') {
        setStep(5);
        navigation.navigate('SetPassword', {email: email.trim()});
        return;
      }
      if (result.code === 'EMAIL_ALREADY_VERIFIED') {
        setStep(3);
        navigation.navigate('PhoneInput', {email: email.trim()});
        return;
      }

      setStep(2);
      navigation.navigate('EmailOTPVerification', {email: email.trim()});
    } catch (err: unknown) {
      console.log('[CreateAccount] Error:', err);
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [firstName, lastName, email, validate, updateData, setStep, navigation]);

  const styles = createStyles(theme);
  const primary = theme.colors.primary.main;

  return (
    <View style={styles.container}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      {/* Back Arrow */}
      <TouchableOpacity
        style={[styles.backButton, {top: insets.top + theme.spacing.xs}]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
        <Icon name="arrow-back" size={24} color={theme.colors.text} />
      </TouchableOpacity>
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + theme.spacing.lg,
            paddingBottom: insets.bottom + 20,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={40}
        keyboardOpeningTime={0}>
        {/* Brand */}
        <View style={styles.brandSection}>
          <Image source={brandLogo} style={styles.logo} />
          <Text style={styles.brandName}>
            TRUCKAST <Text style={{color: primary}}>QR</Text>
          </Text>
          <Text style={styles.subtitle}>Secure Ticket Scanner</Text>
        </View>

        {/* Step Indicator */}
        <StepIndicator currentStep={1} />

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Account</Text>
          <Text style={styles.description}>
            Enter your details to request QR scanner access.
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>First Name *</Text>
          <TextInput
            style={[
              styles.input,
              fieldErrors.firstName ? styles.inputError : null,
            ]}
            value={firstName}
            onChangeText={t => {
              setFirstName(t);
              setFieldErrors(prev => ({...prev, firstName: ''}));
            }}
            placeholder="John"
            placeholderTextColor={theme.colors.textHint}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => lastNameRef.current?.focus()}
            editable={!isLoading}
          />
          {fieldErrors.firstName ? (
            <Text style={styles.fieldError}>{fieldErrors.firstName}</Text>
          ) : null}

          <Text style={styles.label}>Last Name *</Text>
          <TextInput
            ref={lastNameRef}
            style={[
              styles.input,
              fieldErrors.lastName ? styles.inputError : null,
            ]}
            value={lastName}
            onChangeText={t => {
              setLastName(t);
              setFieldErrors(prev => ({...prev, lastName: ''}));
            }}
            placeholder="Doe"
            placeholderTextColor={theme.colors.textHint}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            editable={!isLoading}
          />
          {fieldErrors.lastName ? (
            <Text style={styles.fieldError}>{fieldErrors.lastName}</Text>
          ) : null}

          <Text style={styles.label}>Email *</Text>
          <TextInput
            ref={emailRef}
            style={[
              styles.input,
              fieldErrors.email ? styles.inputError : null,
            ]}
            value={email}
            onChangeText={t => {
              setEmail(t);
              setFieldErrors(prev => ({...prev, email: ''}));
            }}
            placeholder="you@company.com"
            placeholderTextColor={theme.colors.textHint}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            editable={!isLoading}
          />
          {fieldErrors.email ? (
            <Text style={styles.fieldError}>{fieldErrors.email}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={theme.colors.primary.contrast} />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already have access? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.switchLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footer}>Authorized personnel only</Text>
      </KeyboardAwareScrollView>
    </View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    backButton: {
      position: 'absolute',
      left: theme.spacing.md,
      zIndex: 10,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    scrollContent: {
      paddingHorizontal: theme.screenPadding.horizontal,
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
      marginBottom: theme.spacing.xl,
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
    label: {
      ...theme.typography.label,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xxs,
      marginTop: theme.spacing.md,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: 0,
      paddingHorizontal: theme.spacing.md,
      ...theme.typography.body,
      lineHeight: undefined,
      color: theme.colors.text,
      height: theme.componentHeight.button,
    },
    inputError: {
      borderColor: theme.colors.error.main,
    },
    fieldError: {
      ...theme.typography.captionSmall,
      color: theme.colors.error.main,
      marginTop: theme.spacing.xxs,
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
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: theme.spacing.lg,
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

export default RequestQRAccessScreen;
