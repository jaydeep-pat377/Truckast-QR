import React, {useState, useCallback} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAppTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const brandLogo = require('../assets/logo.png');

type ThemeType = ReturnType<typeof useAppTheme>;

const LoginScreen: React.FC = () => {
  const theme = useAppTheme();
  const {login} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(email.trim(), password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [email, password, login]);

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

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
            placeholderTextColor={theme.colors.textHint}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor={theme.colors.textHint}
              secureTextEntry={!showPassword}
              editable={!loading}
              onSubmitEditing={handleLogin}
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

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color={theme.colors.primary.contrast} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
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
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      ...theme.typography.button,
      color: theme.colors.primary.contrast,
    },
    footer: {
      ...theme.typography.captionSmall,
      color: theme.colors.textHint,
      textAlign: 'center',
      marginTop: theme.spacing.xl,
      letterSpacing: 0.4,
    },
  });

export default LoginScreen;
