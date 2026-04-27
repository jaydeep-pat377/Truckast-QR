import React, {useEffect} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAppTheme} from '../contexts/ThemeContext';
import {useSignup} from '../contexts/SignupContext';
import {RootStackParamList} from '../types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const brandLogo = require('../assets/logo.png');

type ThemeType = ReturnType<typeof useAppTheme>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SignupSuccessScreen: React.FC = () => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const {data, reset} = useSignup();

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  const handleGoToLogin = () => {
    reset();
    navigation.reset({
      index: 0,
      routes: [{name: 'Login'}],
    });
  };

  const styles = createStyles(theme);
  const primary = theme.colors.primary.main;

  return (
    <View style={styles.container}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + theme.spacing['3xl'],
            paddingBottom: insets.bottom + 20,
          },
        ]}>
        {/* Brand */}
        <View style={styles.brandSection}>
          <Image source={brandLogo} style={styles.logo} />
          <Text style={styles.brandName}>
            TRUCKAST <Text style={{color: primary}}>QR</Text>
          </Text>
        </View>

        {/* Success Card */}
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Icon
                name="checkmark-circle"
                size={64}
                color={theme.colors.success.main}
              />
            </View>
          </View>

          <Text style={styles.title}>Signup Successful!</Text>
          <Text style={styles.message}>
            You have successfully completed signup. Once admin approves your
            request, you will be notified via email or phone.
          </Text>

          {data.email ? (
            <View style={styles.detailsBox}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{data.email}</Text>
              {data.phone ? (
                <>
                  <Text style={[styles.detailLabel, {marginTop: 8}]}>
                    Phone
                  </Text>
                  <Text style={styles.detailValue}>{data.phone}</Text>
                </>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.note}>
            You will be notified once your access has been approved.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={handleGoToLogin}
            activeOpacity={0.8}>
            <Text style={styles.buttonText}>Go to Sign In</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Authorized personnel only</Text>
      </View>
    </View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.screenPadding.horizontal,
      justifyContent: 'center',
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
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius['2xl'],
      padding: theme.spacing['2xl'],
      ...theme.shadows.lg,
      alignItems: 'center',
    },
    iconContainer: {
      marginBottom: theme.spacing.lg,
    },
    iconCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.colors.success.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      ...theme.typography.h2,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    message: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: theme.spacing.xl,
    },
    detailsBox: {
      width: '100%',
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    detailLabel: {
      ...theme.typography.caption,
      color: theme.colors.textHint,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    detailValue: {
      ...theme.typography.body,
      color: theme.colors.text,
      fontWeight: '500',
      marginTop: 2,
    },
    note: {
      ...theme.typography.caption,
      color: theme.colors.textHint,
      textAlign: 'center',
      fontStyle: 'italic',
      marginBottom: theme.spacing.xl,
    },
    button: {
      width: '100%',
      backgroundColor: theme.colors.primary.main,
      borderRadius: theme.borderRadius.md,
      height: theme.componentHeight.button,
      justifyContent: 'center',
      alignItems: 'center',
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

export default SignupSuccessScreen;
