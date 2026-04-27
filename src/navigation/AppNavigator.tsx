import React from 'react';
import {View, Text, StyleSheet, Pressable, StatusBar} from 'react-native';
import {createNativeStackNavigator, NativeStackHeaderProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAppTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {SignupProvider} from '../contexts/SignupContext';
import {RootStackParamList} from '../types';
import LoginScreen from '../screens/LoginScreen';

import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import RequestQRAccessScreen from '../screens/RequestQRAccessScreen';
import OTPVerificationScreen from '../screens/OTPVerificationScreen';
import PhoneInputScreen from '../screens/PhoneInputScreen';
import PhoneOTPVerificationScreen from '../screens/PhoneOTPVerificationScreen';
import SetPasswordScreen from '../screens/SetPasswordScreen';
import SignupSuccessScreen from '../screens/SignupSuccessScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import ScanDetailsScreen from '../screens/ScanDetailsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PdfViewerScreen from '../screens/PdfViewerScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function CustomHeader({navigation, options}: NativeStackHeaderProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const canGoBack = navigation.canGoBack();
  const title = typeof options.title === 'string' ? options.title : '';

  return (
    <View style={[hStyles.container, {backgroundColor: theme.colors.primary.main, paddingTop: insets.top}]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary.main} translucent />
      <View style={hStyles.content}>
        {canGoBack ? (
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            style={({pressed}) => [hStyles.backButton, {opacity: pressed ? 0.6 : 1}]}>
            <Icon name="arrow-back" size={24} color={theme.colors.primary.contrast} />
          </Pressable>
        ) : (
          <View style={hStyles.backPlaceholder} />
        )}
        <Text
          style={[hStyles.title, theme.typography.h4, {color: theme.colors.primary.contrast}]}
          numberOfLines={1}>
          {title}
        </Text>
        <View style={hStyles.backPlaceholder} />
      </View>
    </View>
  );
}

const hStyles = StyleSheet.create({
  container: {
    width: '100%',
  },
  content: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backPlaceholder: {
    width: 48,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
});

const AppNavigator: React.FC = () => {
  const theme = useAppTheme();
  const {isAuthenticated, isLoading} = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <SignupProvider>
      <Stack.Navigator
        screenOptions={{
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
          header: (props) => <CustomHeader {...props} />,
          animation: 'slide_from_right',
        }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="RequestQRAccess"
              component={RequestQRAccessScreen}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="EmailOTPVerification"
              component={OTPVerificationScreen}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="PhoneInput"
              component={PhoneInputScreen}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="PhoneOTPVerification"
              component={PhoneOTPVerificationScreen}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="SetPassword"
              component={SetPasswordScreen}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="SignupSuccess"
              component={SignupSuccessScreen}
              options={{headerShown: false, gestureEnabled: false}}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="MainTabs"
              component={QRScannerScreen}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="ScanDetails"
              component={ScanDetailsScreen}
              options={({route}) => {
                const scan = route.params?.scan;
                const tkData = scan?.tkData;
                const apiData = scan?.apiData as any;
                let title = 'Scan Details';
                if (tkData?.kind === 'ticket') {
                  const code = apiData?.ticket_code || tkData?.ticketCode;
                  if (code) {
                    title = `Ticket ${code}`;
                  }
                } else if (tkData?.kind === 'truck') {
                  const code = apiData?.code || tkData?.truckCode;
                  if (code) {
                    title = `Truck ${code}`;
                  }
                }
                return {title};
              }}
            />
            <Stack.Screen
              name="PdfViewer"
              component={PdfViewerScreen}
              options={({route}) => ({
                title: route.params?.title || 'View PDF',
              })}
            />
            <Stack.Screen
              name="History"
              component={HistoryScreen}
              options={{
                title: 'Scan History',
              }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                title: 'Settings',
              }}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{
                title: 'Change Password',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </SignupProvider>
  );
};

export default AppNavigator;
