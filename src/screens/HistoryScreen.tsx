import React, {useCallback, useRef, useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {Swipeable} from 'react-native-gesture-handler';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAppTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {useAlert} from '../contexts/AlertContext';
import {getScanHistory, clearScanHistory, deleteScanRecord} from '../storage/scanHistory';
import {Pagination} from '../services/scanHistoryService';
import {RootStackParamList, ScanRecord} from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PAGE_SIZE = 20;

const HistoryScreen: React.FC = () => {
  const theme = useAppTheme();
  const {getAccessToken, backendUrl} = useAuth();
  const {showAlert} = useAlert();
  const navigation = useNavigation<NavigationProp>();
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const currentPage = useRef(1);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const closeSwipeable = useCallback((id: string) => {
    swipeableRefs.current.get(id)?.close();
  }, []);

  const handleDeleteItem = useCallback(
    (item: ScanRecord) => {
      closeSwipeable(item.id);
      showAlert({
        type: 'confirm',
        icon: 'trash-outline',
        title: 'Delete Scan',
        message: 'Are you sure you want to delete this scan?',
        buttons: [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const token = await getAccessToken();
              await deleteScanRecord(item.id, token, backendUrl);
              setHistory(prev => prev.filter(h => h.id !== item.id));
              if (pagination) {
                setPagination(p =>
                  p ? {...p, total: p.total - 1} : null,
                );
              }
            },
          },
        ],
      });
    },
    [showAlert, getAccessToken, backendUrl, closeSwipeable, pagination],
  );

  const loadHistory = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        const token = await getAccessToken();
        const result = await getScanHistory(token, backendUrl, page, PAGE_SIZE);
        if (append) {
          setHistory(prev => [...prev, ...(result?.records ?? [])]);
        } else {
          setHistory(result?.records ?? []);
        }
        setPagination(result?.pagination ?? null);
        currentPage.current = result?.pagination?.page ?? page;
      } catch {
        if (!append) {
          setHistory([]);
        }
        setPagination(null);
      }
    },
    [getAccessToken, backendUrl],
  );

  useFocusEffect(
    useCallback(() => {
      setInitialLoading(true);
      loadHistory(1).finally(() => setInitialLoading(false));
    }, [loadHistory]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory(1);
    setRefreshing(false);
  }, [loadHistory]);

  const onEndReached = useCallback(async () => {
    if (loadingMore || !pagination?.has_next) {
      return;
    }
    setLoadingMore(true);
    await loadHistory(currentPage.current + 1, true);
    setLoadingMore(false);
  }, [loadHistory, loadingMore, pagination]);

  const handleClearHistory = useCallback(() => {
    showAlert({
      type: 'confirm',
      icon: 'trash-outline',
      title: 'Clear History',
      message: 'Are you sure you want to delete all scan history?',
      buttons: [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            const token = await getAccessToken();
            await clearScanHistory(token, backendUrl);
            setHistory([]);
            setPagination(null);
          },
        },
      ],
    });
  }, [getAccessToken, backendUrl, showAlert]);

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

  const getTypeIconName = (type: string) => {
    switch (type) {
      case 'qr':
        return 'qrcode-scan';
      case 'ean-13':
      case 'ean-8':
        return 'barcode';
      case 'code-128':
      case 'code-39':
      case 'code-93':
        return 'barcode-scan';
      default:
        return 'barcode';
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
  const totalCount = pagination?.total ?? history.length;

  const renderRightActions = (
    item: ScanRecord,
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={styles.swipeDeleteBtn}
        onPress={() => handleDeleteItem(item)}
        activeOpacity={0.8}>
        <Animated.View style={{transform: [{scale}]}}>
          <Icon name="trash-outline" size={22} color={theme.colors.common.white} />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({item}: {item: ScanRecord}) => {
    const tkData = item.tkData;
    const apiData = item.apiData;
    const isTicket = tkData?.kind === 'ticket';
    const isTruck = tkData?.kind === 'truck';
    const isTK = isTicket || isTruck;

    const ticketCode = isTicket
      ? (apiData as any)?.ticket_code || (tkData as any)?.ticketCode
      : null;
    const truckCode = isTruck
      ? (apiData as any)?.code || (tkData as any)?.truckCode
      : null;
    const tenantName = tkData?.tenantName || null;

    const iconName = isTicket
      ? 'ticket-confirmation-outline'
      : isTruck
        ? 'truck-outline'
        : getTypeIconName(item.type);

    const title = isTicket
      ? `Ticket ${ticketCode || '—'}`
      : isTruck
        ? `Truck ${truckCode || '—'}`
        : item.data;

    return (
      <Swipeable
        ref={ref => {
          if (ref) {
            swipeableRefs.current.set(item.id, ref);
          } else {
            swipeableRefs.current.delete(item.id);
          }
        }}
        renderRightActions={(progress, dragX) =>
          renderRightActions(item, progress, dragX)
        }
        overshootRight={false}
        rightThreshold={40}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('ScanDetails', {scan: item})}
          activeOpacity={0.7}>
          <View
            style={[
              styles.cardIcon,
              isTicket && styles.cardIconTicket,
              isTruck && styles.cardIconTruck,
            ]}>
            <MCIcon
              name={iconName}
              size={22}
              color={
                isTicket
                  ? theme.colors.primary.main
                  : isTruck
                    ? theme.colors.info?.main || theme.colors.primary.main
                    : theme.colors.primary.main
              }
            />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.cardMeta}>
              {tenantName && (
                <View style={styles.tenantBadge}>
                  <Text style={styles.tenantBadgeText}>{tenantName}</Text>
                </View>
              )}
              {!isTK && (
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>
                    {getTypeLabel(item.type)}
                  </Text>
                </View>
              )}
              <Text style={styles.cardTime}>{formatDate(item.timestamp)}</Text>
            </View>
          </View>
          <Icon
            name="chevron-forward"
            size={20}
            color={theme.colors.textHint}
          />
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MCIcon
        name="qrcode-scan"
        size={64}
        color={theme.colors.textHint}
        style={{marginBottom: theme.spacing.xl}}
      />
      <Text style={styles.emptyTitle}>No Scans Yet</Text>
      <Text style={styles.emptyText}>
        Scan a QR code or barcode to see it here
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) {
      return null;
    }
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator
          size="small"
          color={theme.colors.primary.main}
        />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  };

  if (initialLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.main} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {totalCount > 0 && (
        <View style={styles.subHeader}>
          <Text style={styles.countText}>
            {totalCount} scan{totalCount !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity onPress={handleClearHistory} activeOpacity={0.7}>
            <Text style={styles.clearButton}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={
          history.length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const createStyles = (
  theme: ReturnType<typeof import('../contexts/ThemeContext').useAppTheme>,
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loaderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    subHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.screenPadding.horizontal,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xs,
    },
    clearButton: {
      ...theme.typography.buttonSmall,
      color: theme.colors.error.main,
    },
    countText: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
    },
    list: {
      padding: theme.screenPadding.horizontal,
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing['5xl'],
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
    swipeDeleteBtn: {
      backgroundColor: theme.colors.error.main,
      justifyContent: 'center',
      alignItems: 'center',
      width: 72,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.sm,
      marginLeft: theme.spacing.xs,
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.elevatedBackground,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
      alignSelf: 'flex-start',
      marginTop: theme.spacing.xxs,
    },
    cardIconTicket: {
      backgroundColor: theme.colors.primaryTint,
    },
    cardIconTruck: {
      backgroundColor: theme.colors.info?.background || theme.colors.primaryTint,
    },
    cardContent: {
      flex: 1,
      marginRight: theme.spacing.xs,
    },
    cardTitle: {
      ...theme.typography.body,
      color: theme.colors.text,
      fontWeight: theme.fontWeight.semiBold,
      marginBottom: theme.spacing.xxs,
    },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: theme.spacing.xxs,
    },
    tenantBadge: {
      backgroundColor: theme.colors.primaryTint,
      borderRadius: theme.borderRadius.xs,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 2,
    },
    tenantBadgeText: {
      ...theme.typography.captionSmall,
      color: theme.colors.primary.main,
      fontWeight: theme.fontWeight.medium,
    },
    typeBadge: {
      backgroundColor: theme.colors.primaryTint,
      borderRadius: theme.borderRadius.xs,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 2,
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
    // Footer loader
    footerLoader: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    footerText: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
    },
    // Empty state
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing['3xl'],
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
