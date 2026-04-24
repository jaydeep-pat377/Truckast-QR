import React, {useState, useCallback, useRef} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StatusBar,
  Keyboard,
  type TextInput as TextInputType,
} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAppTheme} from '../contexts/ThemeContext';
import {useAlert} from '../contexts/AlertContext';
import {RootStackParamList} from '../types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const brandLogo = require('../assets/logo.png');

type ThemeType = ReturnType<typeof useAppTheme>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const RequestQRAccessScreen: React.FC = () => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const {showAlert} = useAlert();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const emailRef = useRef<TextInputType>(null);
  const phoneRef = useRef<TextInputType>(null);
  const passwordRef = useRef<TextInputType>(null);
  const confirmRef = useRef<TextInputType>(null);

  const handleRequest = useCallback(() => {
    Keyboard.dismiss();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setError('');
    showAlert({
      type: 'success',
      icon: 'checkmark-circle-outline',
      title: 'Request Submitted!',
      message:
        'Your QR scanner access request has been sent to the producer for approval. You will receive an email notification once your request is approved.',
      buttons: [
        {
          text: 'OK',
          style: 'default',
          onPress: () => navigation.navigate('Login'),
        },
      ],
    });
  }, [fullName, email, phone, password, confirmPassword, navigation, showAlert]);

  const styles = createStyles(theme);
  const primary = theme.colors.primary.main;

  return (
    <View style={styles.container}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + theme.spacing.lg,
            paddingBottom: 0,
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

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Request QR Scanner Access</Text>
          <Text style={styles.description}>
            Submit your details below to request access. Your producer will
            review and approve your request.
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="John Doe"
            placeholderTextColor={theme.colors.textHint}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />

          <Text style={styles.label}>Email *</Text>
          <TextInput
            ref={emailRef}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
            placeholderTextColor={theme.colors.textHint}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            ref={phoneRef}
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+1 (555) 000-0000"
            placeholderTextColor={theme.colors.textHint}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Password *</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              ref={passwordRef}
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 8 characters"
              placeholderTextColor={theme.colors.textHint}
              secureTextEntry={!showPassword}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(prev => !prev)}
              activeOpacity={0.6}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Icon
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirm Password *</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              ref={confirmRef}
              style={styles.passwordInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password"
              placeholderTextColor={theme.colors.textHint}
              secureTextEntry={!showConfirmPassword}
              returnKeyType="done"
              onSubmitEditing={handleRequest}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(prev => !prev)}
              activeOpacity={0.6}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Icon
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleRequest}
            activeOpacity={0.8}>
            <Text style={styles.buttonText}>Submit Request</Text>
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already have access? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}>
              <Text style={styles.switchLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.footer, {marginBottom: insets.bottom + 20}]}>
          Authorized personnel only
        </Text>
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
    scrollContent: {
      paddingHorizontal: theme.screenPadding.horizontal,
    },
    brandSection: {
      alignItems: 'center',
      marginBottom: theme.spacing['3xl'],
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
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      height: theme.componentHeight.button,
    },
    passwordInput: {
      flex: 1,
      paddingVertical: 0,
      paddingHorizontal: theme.spacing.md,
      ...theme.typography.body,
      lineHeight: undefined,
      color: theme.colors.text,
      height: '100%',
    },
    eyeButton: {
      paddingHorizontal: theme.spacing.sm,
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
    },
    button: {
      backgroundColor: theme.colors.primary.main,
      borderRadius: theme.borderRadius.md,
      height: theme.componentHeight.button,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: theme.spacing.xl,
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
