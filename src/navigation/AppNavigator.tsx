import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAppTheme} from '../contexts/ThemeContext';
import {RootStackParamList} from '../types';
import QRScannerScreen from '../screens/QRScannerScreen';
import ScanDetailsScreen from '../screens/ScanDetailsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const theme = useAppTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary.main,
        },
        headerTintColor: theme.colors.primary.contrast,
        headerTitleStyle: {
          ...theme.typography.h4,
          color: theme.colors.primary.contrast,
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}>
      <Stack.Screen
        name="MainTabs"
        component={QRScannerScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="ScanDetails"
        component={ScanDetailsScreen}
        options={{
          title: 'Scan Details',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: 'Scan History',
          headerBackTitle: 'Scanner',
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
