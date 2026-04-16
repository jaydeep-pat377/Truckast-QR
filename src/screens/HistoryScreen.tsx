import React, {useCallback, useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAppTheme} from '../contexts/ThemeContext';
import {getScanHistory, clearScanHistory} from '../storage/scanHistory';
import {RootStackParamList, ScanRecord} from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HistoryScreen: React.FC = () => {
  const theme = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    const data = await getScanHistory();
    setHistory(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [loadHistory]);

  const handleClearHistory = useCallback(() => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all scan history?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearScanHistory();
            setHistory([]);
          },
        },
      ],
    );
  }, []);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    }
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'qr':
        return '📱';
      case 'ean-13':
      case 'ean-8':
        return '🏷️';
      case 'code-128':
      case 'code-39':
      case 'code-93':
        return '📊';
      default:
        return '📄';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'qr':
        return 'QR Code';
      case 'ean-13':
        return 'EAN-13';
      case 'ean-8':
        return 'EAN-8';
      case 'code-128':
        return 'Code 128';
      case 'code-39':
        return 'Code 39';
      case 'code-93':
        return 'Code 93';
      default:
        return 'Barcode';
    }
  };

  const styles = createStyles(theme);

  const renderItem = ({item}: {item: ScanRecord}) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ScanDetails', {scan: item})}
      activeOpacity={0.7}>
      <View style={styles.cardIcon}>
        <Text style={styles.cardIconText}>{getTypeIcon(item.type)}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardData} numberOfLines={1}>
          {item.data}
        </Text>
        <View style={styles.cardMeta}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{getTypeLabel(item.type)}</Text>
          </View>
          <Text style={styles.cardTime}>{formatDate(item.timestamp)}</Text>
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📷</Text>
      <Text style={styles.emptyTitle}>No Scans Yet</Text>
      <Text style={styles.emptyText}>
        Scan a QR code or barcode to see it here
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scan History</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={handleClearHistory} activeOpacity={0.7}>
            <Text style={styles.clearButton}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length > 0 && (
        <Text style={styles.countText}>
          {history.length} scan{history.length !== 1 ? 's' : ''}
        </Text>
      )}

      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={
          history.length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={renderEmpty}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof import('../contexts/ThemeContext').useAppTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.screenPadding.horizontal,
      paddingTop: theme.spacing['2xl'],
      paddingBottom: theme.spacing.sm,
    },
    headerTitle: {
      ...theme.typography.h1,
      color: theme.colors.text,
    },
    clearButton: {
      ...theme.typography.buttonSmall,
      color: theme.colors.error.main,
    },
    countText: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      paddingHorizontal: theme.screenPadding.horizontal,
      marginBottom: theme.spacing.sm,
    },
    list: {
      padding: theme.screenPadding.horizontal,
      paddingTop: theme.spacing.xs,
    },
    emptyList: {
      flex: 1,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      ...theme.shadows.sm,
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.elevatedBackground,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    cardIconText: {
      fontSize: 22,
    },
    cardContent: {
      flex: 1,
      marginRight: theme.spacing.xs,
    },
    cardData: {
      ...theme.typography.body,
      color: theme.colors.text,
      fontWeight: theme.fontWeight.medium,
      marginBottom: theme.spacing.xxs,
    },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    typeBadge: {
      backgroundColor: theme.colors.primaryTint,
      borderRadius: theme.borderRadius.xs,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 2,
      marginRight: theme.spacing.xs,
    },
    typeBadgeText: {
      ...theme.typography.captionSmall,
      color: theme.colors.primary.main,
      fontWeight: theme.fontWeight.medium,
    },
    cardTime: {
      ...theme.typography.caption,
      color: theme.colors.textHint,
    },
    chevron: {
      fontSize: 24,
      color: theme.colors.textHint,
      fontWeight: '300',
    },
    // Empty state
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing['3xl'],
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: theme.spacing.xl,
    },
    emptyTitle: {
      ...theme.typography.h3,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    emptyText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });

export default HistoryScreen;
