import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from 'react';
import {useColorScheme} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Theme, darkTheme, lightTheme, ColorTheme} from '../theme';

const THEME_STORAGE_KEY = '@app_theme_mode';

interface ThemeContextType {
  theme: Theme;
  themeMode: ColorTheme | 'system';
  isDark: boolean;
  isLoading: boolean;
  setThemeMode: (mode: ColorTheme | 'system') => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  initialMode?: ColorTheme | 'system';
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialMode = 'dark',
}) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ColorTheme | 'system'>(
    initialMode,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (
          savedTheme &&
          (savedTheme === 'dark' ||
            savedTheme === 'light' ||
            savedTheme === 'system')
        ) {
          setThemeModeState(savedTheme as ColorTheme | 'system');
        }
      } catch (error) {
        console.log('Error loading theme:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSavedTheme();
  }, []);

  const setThemeMode = useCallback(
    async (mode: ColorTheme | 'system') => {
      setThemeModeState(mode);
      try {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      } catch (error) {
        console.log('Error saving theme:', error);
      }
    },
    [],
  );

  const resolvedTheme = useMemo((): ColorTheme => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return themeMode;
  }, [themeMode, systemColorScheme]);

  const theme = useMemo(() => {
    return resolvedTheme === 'dark' ? darkTheme : lightTheme;
  }, [resolvedTheme]);

  const toggleTheme = useCallback(() => {
    const newMode = (() => {
      if (themeMode === 'system') {
        return systemColorScheme === 'dark' ? 'light' : 'dark';
      }
      return themeMode === 'dark' ? 'light' : 'dark';
    })();
    setThemeMode(newMode);
  }, [themeMode, systemColorScheme, setThemeMode]);

  const value = useMemo(
    () => ({
      theme,
      themeMode,
      isDark: theme.isDark,
      isLoading,
      setThemeMode,
      toggleTheme,
    }),
    [theme, themeMode, isLoading, setThemeMode, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const useAppTheme = (): Theme => {
  const {theme} = useTheme();
  return theme;
};

export default ThemeContext;
