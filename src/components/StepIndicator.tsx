import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useAppTheme} from '../contexts/ThemeContext';

type ThemeType = ReturnType<typeof useAppTheme>;

const STEP_LABELS = ['Sign Up', 'Email OTP', 'Phone', 'Phone OTP', 'Password'];

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  totalSteps = 5,
}) => {
  const theme = useAppTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      {Array.from({length: totalSteps}, (_, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;

        return (
          <React.Fragment key={stepNum}>
            {i > 0 && (
              <View
                style={[
                  styles.line,
                  (isCompleted || isActive) && styles.lineActive,
                ]}
              />
            )}
            <View style={styles.stepWrapper}>
              <View
                style={[
                  styles.circle,
                  isActive && styles.circleActive,
                  isCompleted && styles.circleCompleted,
                ]}>
                <Text
                  style={[
                    styles.circleText,
                    (isActive || isCompleted) && styles.circleTextActive,
                  ]}>
                  {isCompleted ? '\u2713' : stepNum}
                </Text>
              </View>
              <Text
                style={[
                  styles.label,
                  isActive && styles.labelActive,
                  isCompleted && styles.labelCompleted,
                ]}
                numberOfLines={1}>
                {STEP_LABELS[i]}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.sm,
      marginBottom: theme.spacing.xl,
    },
    stepWrapper: {
      alignItems: 'center',
      width: 64,
    },
    circle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.background,
      borderWidth: 2,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    circleActive: {
      borderColor: theme.colors.primary.main,
      backgroundColor: theme.colors.primary.main,
    },
    circleCompleted: {
      borderColor: theme.colors.primary.main,
      backgroundColor: theme.colors.primary.main,
    },
    circleText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textHint,
    },
    circleTextActive: {
      color: theme.colors.primary.contrast,
    },
    label: {
      ...theme.typography.captionSmall,
      color: theme.colors.textHint,
      marginTop: theme.spacing.xxs,
      textAlign: 'center',
    },
    labelActive: {
      color: theme.colors.primary.main,
      fontWeight: '600',
    },
    labelCompleted: {
      color: theme.colors.primary.main,
    },
    line: {
      flex: 1,
      height: 2,
      backgroundColor: theme.colors.border,
      marginBottom: 18,
    },
    lineActive: {
      backgroundColor: theme.colors.primary.main,
    },
  });

export default StepIndicator;
