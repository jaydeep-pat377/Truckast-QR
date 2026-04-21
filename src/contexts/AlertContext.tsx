import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAppTheme} from './ThemeContext';
import {Theme} from '../theme';

type AlertType = 'error' | 'warning' | 'info' | 'success' | 'confirm';

interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
}

interface AlertConfig {
  type?: AlertType;
  icon?: string;
  title: string;
  message: string;
  buttons?: AlertButton[];
}

interface AlertContextValue {
  showAlert: (config: AlertConfig) => void;
}

const AlertContext = createContext<AlertContextValue | null>(null);

// Global ref so non-component code (api.ts, network.ts) can show alerts
let globalShowAlert: ((config: AlertConfig) => void) | null = null;

/** Call from anywhere (services, utils) — works after AlertProvider mounts */
export function showGlobalAlert(config: AlertConfig): void {
  if (globalShowAlert) {
    globalShowAlert(config);
  }
}

const ICONS: Record<AlertType, string> = {
  error: 'warning-outline',
  warning: 'alert-circle-outline',
  info: 'information-circle-outline',
  success: 'checkmark-circle-outline',
  confirm: 'help-circle-outline',
};

export const AlertProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const theme = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const styles = createStyles(theme);

  const showAlert = useCallback((cfg: AlertConfig) => {
    setConfig(cfg);
    setLoadingIndex(null);
    setVisible(true);
  }, []);

  // Register global ref
  globalShowAlert = showAlert;

  const dismiss = useCallback(() => {
    setVisible(false);
    setConfig(null);
    setLoadingIndex(null);
  }, []);

  const handleButtonPress = useCallback(
    async (button: AlertButton, index: number) => {
      if (button.onPress) {
        setLoadingIndex(index);
        try {
          await button.onPress();
        } catch {
          // swallow — caller handles errors
        }
        setLoadingIndex(null);
      }
      dismiss();
    },
    [dismiss],
  );

  const alertType = config?.type || 'info';
  const icon = config?.icon || ICONS[alertType];
  const buttons: AlertButton[] =
    config?.buttons && config.buttons.length > 0
      ? config.buttons
      : [{text: 'OK', style: 'default'}];

  const iconCircleBg = useMemo(() => {
    switch (alertType) {
      case 'error':
        return theme.colors.dangerBackground;
      case 'warning':
        return theme.colors.warning.background;
      case 'success':
        return theme.colors.success.background;
      case 'confirm':
        return theme.colors.primaryTint;
      default:
        return theme.colors.primaryTint;
    }
  }, [alertType, theme]);

  const iconColor = useMemo(() => {
    switch (alertType) {
      case 'error':
        return theme.colors.error.main;
      case 'warning':
        return theme.colors.warning.main;
      case 'success':
        return theme.colors.success.main;
      case 'confirm':
        return theme.colors.primary.main;
      default:
        return theme.colors.primary.main;
    }
  }, [alertType, theme]);

  const value = useMemo(() => ({showAlert}), [showAlert]);

  return (
    <AlertContext.Provider value={value}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => loadingIndex === null && dismiss()}>
        <Pressable
          style={styles.overlay}
          onPress={() => loadingIndex === null && dismiss()}>
          <Pressable style={styles.card} onPress={() => {}}>
            <View style={[styles.iconCircle, {backgroundColor: iconCircleBg}]}>
              <Icon name={icon} size={30} color={iconColor} />
            </View>
            <Text style={styles.title}>{config?.title}</Text>
            <Text style={styles.message}>{config?.message}</Text>
            <View
              style={[
                styles.buttonsRow,
                buttons.length === 1 && styles.buttonsSingle,
              ]}>
              {buttons.map((btn, i) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';
                const isLoading = loadingIndex === i;
                const isDisabled = loadingIndex !== null;

                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.button,
                      buttons.length > 1 && styles.buttonFlex,
                      isCancel && styles.cancelBtn,
                      isDestructive && styles.destructiveBtn,
                      !isCancel && !isDestructive && styles.defaultBtn,
                      isDisabled && !isLoading && styles.buttonDisabled,
                    ]}
                    onPress={() => handleButtonPress(btn, i)}
                    disabled={isDisabled}
                    activeOpacity={0.8}>
                    {isLoading ? (
                      <ActivityIndicator
                        size="small"
                        color={
                          isCancel
                            ? theme.colors.text
                            : theme.colors.common.white
                        }
                      />
                    ) : (
                      <Text
                        style={[
                          styles.buttonText,
                          isCancel && styles.cancelBtnText,
                          isDestructive && styles.destructiveBtnText,
                          !isCancel && !isDestructive && styles.defaultBtnText,
                        ]}>
                        {btn.text}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AlertContext.Provider>
  );
};

export function useAlert(): AlertContextValue {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.isDark
        ? 'rgba(0, 0, 0, 0.7)'
        : 'rgba(0, 0, 0, 0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.screenPadding.horizontal,
    },
    card: {
      width: '100%',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius['2xl'],
      padding: theme.spacing['2xl'],
      alignItems: 'center',
      ...theme.shadows.lg,
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    icon: {
      fontSize: 30,
    },
    title: {
      ...theme.typography.h3,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    message: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: theme.spacing.xl,
    },
    buttonsRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      width: '100%',
    },
    buttonsSingle: {
      justifyContent: 'center',
    },
    button: {
      height: theme.componentHeight.button,
      borderRadius: theme.borderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    buttonFlex: {
      flex: 1,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      ...theme.typography.button,
    },
    // Cancel
    cancelBtn: {
      backgroundColor: theme.colors.elevatedBackground,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cancelBtnText: {
      color: theme.colors.text,
    },
    // Destructive
    destructiveBtn: {
      backgroundColor: theme.colors.error.main,
    },
    destructiveBtnText: {
      color: theme.colors.common.white,
    },
    // Default (primary)
    defaultBtn: {
      backgroundColor: theme.colors.primary.main,
    },
    defaultBtnText: {
      color: theme.colors.primary.contrast,
    },
  });
