import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, StatusBar, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ThemeProvider, useTheme} from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/SplashScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';

const PRIVACY_STORAGE_KEY = '@privacy_accepted';

const AppContent: React.FC = () => {
  const {isDark, theme, isLoading} = useTheme();
  const [splashVisible, setSplashVisible] = useState(true);
  const [privacyAccepted, setPrivacyAccepted] = useState<boolean | null>(null);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  // Load privacy acceptance status on mount
  useEffect(() => {
    AsyncStorage.getItem(PRIVACY_STORAGE_KEY).then(value => {
      setPrivacyAccepted(value === 'true');
    });
  }, []);

  // Splash stays until both theme + privacy status are loaded
  const isAppReady = !isLoading && privacyAccepted !== null;

  const handleSplashFinish = useCallback(() => {
    Animated.timing(splashOpacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => setSplashVisible(false));
  }, [splashOpacity]);

  const handlePrivacyAccept = useCallback(async () => {
    await AsyncStorage.setItem(PRIVACY_STORAGE_KEY, 'true');
    setPrivacyAccepted(true);
  }, []);

  return (
    <>
      {/* Layer 1 (bottom): Main app — always mounted */}
      <NavigationContainer
        theme={{
          dark: isDark,
          colors: {
            primary: theme.colors.primary.main,
            background: theme.colors.background,
            card: theme.colors.surface,
            text: theme.colors.text,
            border: theme.colors.border,
            notification: theme.colors.primary.main,
          },
          fonts: {
            regular: {fontFamily: 'System', fontWeight: '400'},
            medium: {fontFamily: 'System', fontWeight: '500'},
            bold: {fontFamily: 'System', fontWeight: '700'},
            heavy: {fontFamily: 'System', fontWeight: '900'},
          },
        }}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.background}
        />
        <AppNavigator />
      </NavigationContainer>

      {/* Layer 2: Privacy policy — covers app until accepted (first launch only) */}
      {!splashVisible && privacyAccepted === false && (
        <PrivacyPolicyScreen theme={theme} onAccept={handlePrivacyAccept} />
      )}

      {/* Layer 3 (top): Splash — covers everything until ready */}
      {splashVisible && (
        <Animated.View
          style={[StyleSheet.absoluteFill, {opacity: splashOpacity}]}
          pointerEvents="none">
          <SplashScreen
            theme={theme}
            isAppReady={isAppReady}
            onFinish={handleSplashFinish}
          />
        </Animated.View>
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <ThemeProvider initialMode="system">
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;
