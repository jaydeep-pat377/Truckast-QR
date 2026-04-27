import React, {useState, useCallback, useEffect, useRef} from 'react';
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
  Modal,
  FlatList,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAppTheme} from '../contexts/ThemeContext';
import {useSignup} from '../contexts/SignupContext';
import {RootStackParamList} from '../types';
import {sendPhoneOTP} from '../services/signupService';
import StepIndicator from '../components/StepIndicator';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const brandLogo = require('../assets/logo.png');

type ThemeType = ReturnType<typeof useAppTheme>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PhoneRouteProp = RouteProp<RootStackParamList, 'PhoneInput'>;

interface CountryCode {
  name: string;
  dial: string;
  flag: string;
}

const COUNTRY_CODES: CountryCode[] = [
  {name: 'United States', dial: '+1', flag: '🇺🇸'},
  {name: 'Canada', dial: '+1', flag: '🇨🇦'},
  {name: 'United Kingdom', dial: '+44', flag: '🇬🇧'},
  {name: 'India', dial: '+91', flag: '🇮🇳'},
  {name: 'Australia', dial: '+61', flag: '🇦🇺'},
  {name: 'Germany', dial: '+49', flag: '🇩🇪'},
  {name: 'France', dial: '+33', flag: '🇫🇷'},
  {name: 'Brazil', dial: '+55', flag: '🇧🇷'},
  {name: 'Mexico', dial: '+52', flag: '🇲🇽'},
  {name: 'Japan', dial: '+81', flag: '🇯🇵'},
  {name: 'China', dial: '+86', flag: '🇨🇳'},
  {name: 'South Korea', dial: '+82', flag: '🇰🇷'},
  {name: 'Italy', dial: '+39', flag: '🇮🇹'},
  {name: 'Spain', dial: '+34', flag: '🇪🇸'},
  {name: 'Netherlands', dial: '+31', flag: '🇳🇱'},
  {name: 'Russia', dial: '+7', flag: '🇷🇺'},
  {name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦'},
  {name: 'UAE', dial: '+971', flag: '🇦🇪'},
  {name: 'Singapore', dial: '+65', flag: '🇸🇬'},
  {name: 'South Africa', dial: '+27', flag: '🇿🇦'},
  {name: 'New Zealand', dial: '+64', flag: '🇳🇿'},
  {name: 'Ireland', dial: '+353', flag: '🇮🇪'},
  {name: 'Pakistan', dial: '+92', flag: '🇵🇰'},
  {name: 'Bangladesh', dial: '+880', flag: '🇧🇩'},
  {name: 'Nigeria', dial: '+234', flag: '🇳🇬'},
  {name: 'Philippines', dial: '+63', flag: '🇵🇭'},
  {name: 'Indonesia', dial: '+62', flag: '🇮🇩'},
  {name: 'Thailand', dial: '+66', flag: '🇹🇭'},
  {name: 'Malaysia', dial: '+60', flag: '🇲🇾'},
  {name: 'Turkey', dial: '+90', flag: '🇹🇷'},
  {name: 'Israel', dial: '+972', flag: '🇮🇱'},
  {name: 'Egypt', dial: '+20', flag: '🇪🇬'},
  {name: 'Kenya', dial: '+254', flag: '🇰🇪'},
  {name: 'Colombia', dial: '+57', flag: '🇨🇴'},
  {name: 'Argentina', dial: '+54', flag: '🇦🇷'},
  {name: 'Chile', dial: '+56', flag: '🇨🇱'},
  {name: 'Sweden', dial: '+46', flag: '🇸🇪'},
  {name: 'Norway', dial: '+47', flag: '🇳🇴'},
  {name: 'Denmark', dial: '+45', flag: '🇩🇰'},
  {name: 'Poland', dial: '+48', flag: '🇵🇱'},
  {name: 'Portugal', dial: '+351', flag: '🇵🇹'},
  {name: 'Switzerland', dial: '+41', flag: '🇨🇭'},
  {name: 'Austria', dial: '+43', flag: '🇦🇹'},
  {name: 'Belgium', dial: '+32', flag: '🇧🇪'},
  {name: 'Vietnam', dial: '+84', flag: '🇻🇳'},
  {name: 'Sri Lanka', dial: '+94', flag: '🇱🇰'},
  {name: 'Nepal', dial: '+977', flag: '🇳🇵'},
  {name: 'Ghana', dial: '+233', flag: '🇬🇭'},
  {name: 'Qatar', dial: '+974', flag: '🇶🇦'},
  {name: 'Kuwait', dial: '+965', flag: '🇰🇼'},
];

const PhoneInputScreen: React.FC = () => {
  const theme = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PhoneRouteProp>();
  const {data, updateData, setStep, step} = useSignup();
  const {email} = route.params;

  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(
    COUNTRY_CODES[0],
  );
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const phoneRef = useRef<TextInput>(null);

  useEffect(() => {
    if (step < 2) {
      navigation.navigate('RequestQRAccess');
    } else {
      setStep(3);
    }
  }, [step, setStep, navigation]);

  const filteredCountries = searchQuery
    ? COUNTRY_CODES.filter(
        c =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.dial.includes(searchQuery),
      )
    : COUNTRY_CODES;

  const handleSelectCountry = useCallback((country: CountryCode) => {
    setSelectedCountry(country);
    setShowPicker(false);
    setSearchQuery('');
    setTimeout(() => phoneRef.current?.focus(), 200);
  }, []);

  const handleSubmit = useCallback(async () => {
    setError('');

    const cleanNumber = phoneNumber.replace(/[\s\-()]/g, '');
    if (!cleanNumber) {
      setError('Phone number is required');
      return;
    }
    if (cleanNumber.length < 6 || cleanNumber.length > 15) {
      setError('Please enter a valid phone number');
      return;
    }
    if (!/^\d+$/.test(cleanNumber)) {
      setError('Phone number should contain only digits');
      return;
    }

    const fullPhone = `${selectedCountry.dial}${cleanNumber}`;

    setIsLoading(true);
    try {
      await sendPhoneOTP(email, selectedCountry.dial, cleanNumber);
      updateData({phone: fullPhone});
      setStep(4);
      navigation.navigate('PhoneOTPVerification', {
        email,
        phone: fullPhone,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to send OTP';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [phoneNumber, selectedCountry, email, updateData, setStep, navigation]);

  const styles = createStyles(theme);
  const primary = theme.colors.primary.main;

  const renderCountryItem = ({item}: {item: CountryCode}) => (
    <TouchableOpacity
      style={[
        styles.countryItem,
        item.dial === selectedCountry.dial &&
          item.name === selectedCountry.name &&
          styles.countryItemSelected,
      ]}
      onPress={() => handleSelectCountry(item)}
      activeOpacity={0.7}>
      <Text style={styles.countryFlag}>{item.flag}</Text>
      <Text style={styles.countryName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.countryDial}>{item.dial}</Text>
    </TouchableOpacity>
  );

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

        <StepIndicator currentStep={3} />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Phone Number</Text>
          <Text style={styles.description}>
            Enter your phone number to receive a verification code via SMS.
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.successBadge}>
            <Text style={styles.successText}>Verified Email: {email}</Text>
          </View>

          <Text style={styles.label}>Phone Number *</Text>
          <View style={styles.phoneRow}>
            {/* Country Code Dropdown */}
            <TouchableOpacity
              style={styles.countryCodeButton}
              onPress={() => setShowPicker(true)}
              activeOpacity={0.7}
              disabled={isLoading}>
              <Text style={styles.countryCodeFlag}>
                {selectedCountry.flag}
              </Text>
              <Text style={styles.countryCodeText}>
                {selectedCountry.dial}
              </Text>
              <Icon
                name="chevron-down"
                size={16}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Phone Number Input */}
            <TextInput
              ref={phoneRef}
              style={[
                styles.phoneInput,
                error ? styles.inputError : null,
              ]}
              value={phoneNumber}
              onChangeText={t => {
                setPhoneNumber(t.replace(/[^\d]/g, ''));
                setError('');
              }}
              placeholder="555 123 4567"
              placeholderTextColor={theme.colors.textHint}
              keyboardType="number-pad"
              autoFocus
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={theme.colors.primary.contrast} />
            ) : (
              <Text style={styles.buttonText}>Send OTP</Text>
            )}
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Back to </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.switchLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footer}>Authorized personnel only</Text>
      </ScrollView>

      {/* Country Code Picker Modal */}
      <Modal
        visible={showPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPicker(false);
                  setSearchQuery('');
                }}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Icon
                  name="close"
                  size={24}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Icon
                name="search"
                size={18}
                color={theme.colors.textHint}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search country or code..."
                placeholderTextColor={theme.colors.textHint}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon
                    name="close-circle"
                    size={18}
                    color={theme.colors.textHint}
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Country List */}
            <FlatList
              data={filteredCountries}
              keyExtractor={(item, index) => `${item.dial}-${item.name}-${index}`}
              renderItem={renderCountryItem}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No countries found</Text>
              }
            />
          </View>
        </View>
      </Modal>
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
      marginBottom: theme.spacing.xl,
    },
    successBadge: {
      backgroundColor: theme.colors.success.background,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    successText: {
      ...theme.typography.caption,
      color: theme.colors.success.main,
      fontWeight: '600',
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
      marginBottom: theme.spacing.xs,
      marginTop: theme.spacing.md,
    },
    phoneRow: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    countryCodeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.sm,
      height: theme.componentHeight.button,
      gap: 4,
    },
    countryCodeFlag: {
      fontSize: 18,
    },
    countryCodeText: {
      ...theme.typography.body,
      color: theme.colors.text,
      fontWeight: '600',
    },
    phoneInput: {
      flex: 1,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      ...theme.typography.body,
      lineHeight: undefined,
      color: theme.colors.text,
      height: theme.componentHeight.button,
      fontSize: 18,
      letterSpacing: 1,
    },
    inputError: {
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

    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.borderRadius['2xl'],
      borderTopRightRadius: theme.borderRadius['2xl'],
      maxHeight: '70%',
      paddingBottom: 34,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      ...theme.typography.h4,
      color: theme.colors.text,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      marginHorizontal: theme.spacing.lg,
      marginVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      height: 40,
    },
    searchIcon: {
      marginRight: theme.spacing.xs,
    },
    searchInput: {
      flex: 1,
      ...theme.typography.bodySmall,
      color: theme.colors.text,
      paddingVertical: 0,
    },
    countryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    countryItemSelected: {
      backgroundColor: theme.colors.primaryTint,
    },
    countryFlag: {
      fontSize: 22,
      width: 32,
    },
    countryName: {
      flex: 1,
      ...theme.typography.body,
      color: theme.colors.text,
    },
    countryDial: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    emptyText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textHint,
      textAlign: 'center',
      padding: theme.spacing.xl,
    },
  });

export default PhoneInputScreen;
