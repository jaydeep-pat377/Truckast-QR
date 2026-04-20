import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Share,
  Animated,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAppTheme} from '../contexts/ThemeContext';
import {deleteScanRecord} from '../storage/scanHistory';
import {
  RootStackParamList,
  TKTicketData,
  APITicketDetails,
  APITruckDetails,
} from '../types';

type RouteProps = RouteProp<RootStackParamList, 'ScanDetails'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ThemeType = ReturnType<typeof import('../contexts/ThemeContext').useAppTheme>;

const ScanDetailsScreen: React.FC = () => {
  const theme = useAppTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const {scan} = route.params;
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // Entry animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // ── Data type detection ──
  const dataType = useMemo(() => {
    const data = scan.data;
    if (/^https?:\/\//i.test(data)) {
      return 'url';
    }
    if (/^mailto:/i.test(data)) {
      return 'email';
    }
    if (/^tel:/i.test(data)) {
      return 'phone';
    }
    if (/^sms:/i.test(data)) {
      return 'sms';
    }
    if (/^wifi:/i.test(data)) {
      return 'wifi';
    }
    if (/^BEGIN:VCARD/i.test(data)) {
      return 'contact';
    }
    if (/^BEGIN:VEVENT/i.test(data)) {
      return 'event';
    }
    if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(data)) {
      return 'email_plain';
    }
    if (/^\+?[\d\s()-]{7,}$/.test(data)) {
      return 'phone_plain';
    }
    return 'text';
  }, [scan.data]);

  const dataTypeLabel = useMemo(() => {
    const labels: Record<string, string> = {
      url: 'Website URL',
      email: 'Email Link',
      email_plain: 'Email Address',
      phone: 'Phone Link',
      phone_plain: 'Phone Number',
      sms: 'SMS Link',
      wifi: 'WiFi Network',
      contact: 'Contact Card',
      event: 'Calendar Event',
      text: 'Plain Text',
    };
    return labels[dataType] || 'Data';
  }, [dataType]);

  const dataTypeIcon = useMemo(() => {
    const icons: Record<string, string> = {
      url: '🌐',
      email: '📧',
      email_plain: '📧',
      phone: '📞',
      phone_plain: '📞',
      sms: '💬',
      wifi: '📶',
      contact: '👤',
      event: '📅',
      text: '📝',
    };
    return icons[dataType] || '📄';
  }, [dataType]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      qr: 'QR Code',
      'ean-13': 'EAN-13 Barcode',
      'ean-8': 'EAN-8 Barcode',
      'code-128': 'Code 128 Barcode',
      'code-39': 'Code 39 Barcode',
      'code-93': 'Code 93 Barcode',
      manual: 'Manual Entry',
    };
    return labels[type] || 'Barcode';
  };

  const getShortTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      qr: 'QR Code',
      'ean-13': 'EAN-13',
      'ean-8': 'EAN-8',
      'code-128': 'Code 128',
      'code-39': 'Code 39',
      'code-93': 'Code 93',
      manual: 'Manual',
    };
    return labels[type] || 'Barcode';
  };

  // ── Toast ──
  const showToast = useCallback(
    (message: string) => {
      setToastMessage(message);
      setToastVisible(true);
      toastAnim.setValue(0);
      Animated.sequence([
        Animated.timing(toastAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setToastVisible(false));
    },
    [toastAnim],
  );

  // ── Handlers ──
  const handleCopy = useCallback(() => {
    Clipboard.setString(scan.data);
    showToast('Copied to clipboard');
  }, [scan.data, showToast]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({message: scan.data});
    } catch (error) {
      console.log('Error sharing:', error);
    }
  }, [scan.data]);

  const handleOpenLink = useCallback(() => {
    let url = scan.data;
    if (dataType === 'email_plain') {
      url = `mailto:${scan.data}`;
    } else if (dataType === 'phone_plain') {
      url = `tel:${scan.data}`;
    }

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this link');
      }
    });
  }, [scan.data, dataType]);

  const handleDelete = useCallback(() => {
    Alert.alert('Delete Scan', 'Are you sure you want to delete this scan?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteScanRecord(scan.id);
          navigation.goBack();
        },
      },
    ]);
  }, [scan.id, navigation]);

  const canOpenLink =
    dataType === 'url' ||
    dataType === 'email' ||
    dataType === 'email_plain' ||
    dataType === 'phone' ||
    dataType === 'phone_plain' ||
    dataType === 'sms';

  const tkData = scan.tkData;
  const isTicket = tkData?.kind === 'ticket';
  const isTruck = tkData?.kind === 'truck';
  const verified = scan.verified;
  const apiData = scan.apiData;
  const apiTicket = isTicket ? (apiData as APITicketDetails | undefined) : undefined;
  const apiTruck = isTruck ? (apiData as APITruckDetails | undefined) : undefined;

  const styles = createStyles(theme);

  const toastTranslateY = toastAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });

  const formatIssuedAt = (iat: number) => {
    const date = new Date(iat);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ── Verification badge helper ──
  const verificationBadge = () => {
    if (verified === 'verified') {
      return {label: 'Verified', color: theme.colors.success.main, bg: theme.colors.success.background};
    }
    if (verified === 'offline') {
      return {label: 'Offline — Local Data', color: theme.colors.warning.main, bg: theme.colors.warning.background};
    }
    // Fallback for old records without verification
    return {label: 'Unverified', color: theme.colors.textSecondary, bg: theme.colors.surface};
  };

  // ── TK QR Detail View ──
  if (tkData) {
    const badge = verificationBadge();
    const ticketLocal = tkData as TKTicketData;

    return (
      <View style={styles.container}>
        <Animated.ScrollView
          style={{opacity: fadeAnim, transform: [{translateY: slideAnim}]}}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.hero}>
            <View
              style={[
                styles.heroIconCircle,
                isTicket && styles.tkTicketHero,
                isTruck && styles.tkTruckHero,
              ]}>
              <Text style={styles.heroIcon}>{isTicket ? '🎫' : '🚛'}</Text>
            </View>
            <Text style={styles.heroLabel}>
              {isTicket ? 'Ticket' : 'Truck'}
            </Text>
            <View style={[styles.verificationBadge, {backgroundColor: badge.bg}]}>
              <Text style={[styles.verificationBadgeText, {color: badge.color}]}>
                {badge.label}
              </Text>
            </View>
          </View>

          {/* Tenant info */}
          <View style={styles.contentCard}>
            <View
              style={[styles.contentCardAccent, styles.tkTenantAccent]}
            />
            <View style={styles.contentCardInner}>
              <Text style={styles.cardLabel}>TENANT</Text>
              <Text style={styles.tkTenantName}>{tkData.tenantName}</Text>
              <Text style={styles.tkTenantSub}>
                {tkData.tenantSubdomain}
              </Text>
            </View>
          </View>

          {/* Ticket-specific fields — prefer API data, fall back to QR data */}
          {isTicket && (
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ticket #</Text>
                <Text style={styles.infoValue}>
                  {apiTicket?.ticket_code || ticketLocal.ticketCode}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Order #</Text>
                <Text style={styles.infoValue}>
                  {apiTicket?.order_code || ticketLocal.orderCode}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Truck #</Text>
                <Text style={styles.infoValue}>
                  {apiTicket?.truck?.truck_code || ticketLocal.truckCode}
                </Text>
              </View>
              {apiTicket?.status_display && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status</Text>
                    <Text style={styles.infoValue}>
                      {apiTicket.status_display}
                    </Text>
                  </View>
                </>
              )}
              {apiTicket?.load && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Load #</Text>
                    <Text style={styles.infoValue}>{apiTicket.load}</Text>
                  </View>
                </>
              )}
              {apiTicket?.product && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Product</Text>
                    <Text style={styles.infoValue}>{apiTicket.product}</Text>
                  </View>
                </>
              )}
              {apiTicket?.load_qty && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Load Qty</Text>
                    <Text style={styles.infoValue}>{apiTicket.load_qty}</Text>
                  </View>
                </>
              )}
              {apiTicket?.progress_display && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Progress</Text>
                    <Text style={styles.infoValue}>
                      {apiTicket.progress_display}
                    </Text>
                  </View>
                </>
              )}
              {apiTicket?.customer_name && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Customer</Text>
                    <Text style={styles.infoValue}>
                      {apiTicket.customer_name}
                    </Text>
                  </View>
                </>
              )}
              {apiTicket?.delivery_address && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Destination</Text>
                    <Text style={styles.infoValue}>
                      {apiTicket.delivery_address}
                    </Text>
                  </View>
                </>
              )}
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Issued At</Text>
                <Text style={styles.infoValue}>
                  {formatIssuedAt(tkData.iat)}
                </Text>
              </View>
            </View>
          )}

          {/* Truck-specific fields */}
          {isTruck && (
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Truck #</Text>
                <Text style={styles.infoValue}>
                  {apiTruck?.code || tkData.truckCode}
                </Text>
              </View>
              {apiTruck?.description && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Description</Text>
                    <Text style={styles.infoValue}>
                      {apiTruck.description}
                    </Text>
                  </View>
                </>
              )}
              {apiTruck?.current_driver_name && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Driver</Text>
                    <Text style={styles.infoValue}>
                      {apiTruck.current_driver_name}
                    </Text>
                  </View>
                </>
              )}
              {apiTruck?.ticket_status && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status</Text>
                    <Text style={styles.infoValue}>
                      {apiTruck.ticket_status}
                    </Text>
                  </View>
                </>
              )}
              {apiTruck?.order_code && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Current Order</Text>
                    <Text style={styles.infoValue}>
                      {apiTruck.order_code}
                    </Text>
                  </View>
                </>
              )}
              {apiTruck?.customer_name && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Customer</Text>
                    <Text style={styles.infoValue}>
                      {apiTruck.customer_name}
                    </Text>
                  </View>
                </>
              )}
              {apiTruck?.delivery_address && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Delivery</Text>
                    <Text style={styles.infoValue}>
                      {apiTruck.delivery_address}
                    </Text>
                  </View>
                </>
              )}
              {apiTruck?.plant_name && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Plant</Text>
                    <Text style={styles.infoValue}>
                      {apiTruck.plant_name}
                    </Text>
                  </View>
                </>
              )}
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Issued At</Text>
                <Text style={styles.infoValue}>
                  {formatIssuedAt(tkData.iat)}
                </Text>
              </View>
            </View>
          )}

          {/* Scan meta */}
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Scanned At</Text>
              <Text style={styles.infoValue}>
                {formatTimestamp(scan.timestamp)}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.secondaryAction,
                  styles.flex1,
                ]}
                onPress={handleShare}
                activeOpacity={0.8}>
                <Text style={styles.actionIcon}>📤</Text>
                <Text style={styles.secondaryActionText}>Share</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.actionButton, styles.dangerAction]}
              onPress={handleDelete}
              activeOpacity={0.8}>
              <Text style={styles.actionIcon}>🗑️</Text>
              <Text style={styles.dangerActionText}>Delete Scan</Text>
            </TouchableOpacity>
          </View>
        </Animated.ScrollView>

        {toastVisible && (
          <Animated.View
            style={[
              styles.toast,
              {
                opacity: toastAnim,
                transform: [{translateY: toastTranslateY}],
              },
            ]}
            pointerEvents="none">
            <Text style={styles.toastText}>✓ {toastMessage}</Text>
          </Animated.View>
        )}
      </View>
    );
  }

  // ── Generic QR Detail View (non-TK) ──
  return (
    <View style={styles.container}>
      <Animated.ScrollView
        style={{opacity: fadeAnim, transform: [{translateY: slideAnim}]}}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.heroIconCircle}>
            <Text style={styles.heroIcon}>{dataTypeIcon}</Text>
          </View>
          <Text style={styles.heroLabel}>{dataTypeLabel}</Text>
          <View style={styles.formatBadge}>
            <Text style={styles.formatBadgeText}>
              {getShortTypeLabel(scan.type)}
            </Text>
          </View>
        </View>

        {/* ── Content card with accent ── */}
        <View style={styles.contentCard}>
          <View style={styles.contentCardAccent} />
          <View style={styles.contentCardInner}>
            <View style={styles.contentCardHeader}>
              <Text style={styles.cardLabel}>SCANNED CONTENT</Text>
              <TouchableOpacity
                onPress={handleCopy}
                activeOpacity={0.5}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Text style={styles.inlineCopyIcon}>📋</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.dataText} selectable>
              {scan.data}
            </Text>
          </View>
        </View>

        {/* ── Details card ── */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Format</Text>
            <Text style={styles.infoValue}>{getTypeLabel(scan.type)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Scanned At</Text>
            <Text style={styles.infoValue}>
              {formatTimestamp(scan.timestamp)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Content Type</Text>
            <Text style={styles.infoValue}>{dataTypeLabel}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Characters</Text>
            <Text style={styles.infoValue}>{scan.data.length}</Text>
          </View>
        </View>

        {/* ── Actions ── */}
        <View style={styles.actionsContainer}>
          {canOpenLink && (
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryAction]}
              onPress={handleOpenLink}
              activeOpacity={0.8}>
              <Text style={styles.actionIcon}>
                {dataType === 'url'
                  ? '🌐'
                  : dataType.includes('email')
                    ? '📧'
                    : '📞'}
              </Text>
              <Text style={styles.primaryActionText}>
                {dataType === 'url'
                  ? 'Open URL'
                  : dataType.includes('email')
                    ? 'Send Email'
                    : 'Call Number'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.secondaryAction,
                styles.flex1,
              ]}
              onPress={handleCopy}
              activeOpacity={0.8}>
              <Text style={styles.actionIcon}>📋</Text>
              <Text style={styles.secondaryActionText}>Copy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.secondaryAction,
                styles.flex1,
              ]}
              onPress={handleShare}
              activeOpacity={0.8}>
              <Text style={styles.actionIcon}>📤</Text>
              <Text style={styles.secondaryActionText}>Share</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerAction]}
            onPress={handleDelete}
            activeOpacity={0.8}>
            <Text style={styles.actionIcon}>🗑️</Text>
            <Text style={styles.dangerActionText}>Delete Scan</Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>

      {/* ── Toast notification ── */}
      {toastVisible && (
        <Animated.View
          style={[
            styles.toast,
            {opacity: toastAnim, transform: [{translateY: toastTranslateY}]},
          ]}
          pointerEvents="none">
          <Text style={styles.toastText}>✓ {toastMessage}</Text>
        </Animated.View>
      )}
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────
const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: theme.screenPadding.horizontal,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing['5xl'],
    },

    // Hero
    hero: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    heroIconCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: theme.colors.primaryTint,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    heroIcon: {
      fontSize: 40,
    },
    heroLabel: {
      ...theme.typography.h3,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    formatBadge: {
      backgroundColor: theme.colors.primaryTintStrong,
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xxs + 1,
    },
    formatBadgeText: {
      ...theme.typography.caption,
      color: theme.colors.primary.main,
      fontWeight: theme.fontWeight.medium,
    },

    // Content card with accent bar
    contentCard: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.md,
      overflow: 'hidden',
      ...theme.shadows.sm,
    },
    contentCardAccent: {
      width: 3,
      backgroundColor: theme.colors.primary.main,
    },
    contentCardInner: {
      flex: 1,
      padding: theme.spacing.md,
    },
    contentCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    cardLabel: {
      ...theme.typography.label,
      color: theme.colors.textHint,
    },
    inlineCopyIcon: {
      fontSize: 16,
    },
    dataText: {
      ...theme.typography.body,
      color: theme.colors.text,
      lineHeight: 24,
    },

    // Info card
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      ...theme.shadows.sm,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },
    infoLabel: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
    },
    infoValue: {
      ...theme.typography.bodySmall,
      color: theme.colors.text,
      fontWeight: theme.fontWeight.medium,
      flex: 1,
      textAlign: 'right',
      marginLeft: theme.spacing.md,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },

    // Actions
    actionsContainer: {
      marginTop: theme.spacing.sm,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      height: theme.componentHeight.button,
      marginBottom: theme.spacing.sm,
    },
    actionIcon: {
      fontSize: 18,
      marginRight: theme.spacing.xs,
    },
    primaryAction: {
      backgroundColor: theme.colors.primary.main,
      ...theme.shadows.sm,
    },
    primaryActionText: {
      ...theme.typography.button,
      color: theme.colors.primary.contrast,
    },
    actionRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    flex1: {
      flex: 1,
    },
    secondaryAction: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    secondaryActionText: {
      ...theme.typography.button,
      color: theme.colors.text,
    },
    dangerAction: {
      backgroundColor: theme.colors.dangerBackground,
    },
    dangerActionText: {
      ...theme.typography.button,
      color: theme.colors.error.main,
    },

    // Verification badge
    verificationBadge: {
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xxs + 1,
    },
    verificationBadgeText: {
      ...theme.typography.caption,
      fontWeight: theme.fontWeight.semiBold,
    },

    // TK QR specific
    tkTicketHero: {
      backgroundColor: theme.colors.primaryTint,
    },
    tkTruckHero: {
      backgroundColor: theme.colors.info.background,
    },
    tkTenantAccent: {
      backgroundColor: theme.colors.success.main,
    },
    tkTenantName: {
      ...theme.typography.h3,
      color: theme.colors.text,
      marginTop: theme.spacing.xxs,
    },
    tkTenantSub: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xxs,
    },

    // Toast
    toast: {
      position: 'absolute',
      top: theme.spacing.md,
      alignSelf: 'center',
      backgroundColor: theme.colors.success.main,
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.sm,
      ...theme.shadows.md,
    },
    toastText: {
      ...theme.typography.buttonSmall,
      color: theme.colors.common.white,
    },
  });

export default ScanDetailsScreen;
