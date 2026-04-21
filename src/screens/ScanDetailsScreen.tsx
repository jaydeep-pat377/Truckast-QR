import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  Share,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAppTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {useAlert} from '../contexts/AlertContext';
import {deleteScanRecord} from '../storage/scanHistory';
import {generateTicketPdf} from '../utils/ticketPdf';
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
  const {backendUrl, getAccessToken} = useAuth();
  const {showAlert} = useAlert();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const {scan} = route.params;
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);

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

  const dataTypeIconName = useMemo(() => {
    const icons: Record<string, string> = {
      url: 'globe-outline',
      email: 'mail-outline',
      email_plain: 'mail-outline',
      phone: 'call-outline',
      phone_plain: 'call-outline',
      sms: 'chatbubble-outline',
      wifi: 'wifi-outline',
      contact: 'person-outline',
      event: 'calendar-outline',
      text: 'document-text-outline',
    };
    return icons[dataType] || 'document-outline';
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
        showAlert({
          type: 'error',
          title: 'Cannot Open Link',
          message: 'This link type is not supported on your device.',
        });
      }
    });
  }, [scan.data, dataType, showAlert]);

  const handleDelete = useCallback(() => {
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
            await deleteScanRecord(scan.id, token, backendUrl);
            navigation.goBack();
          },
        },
      ],
    });
  }, [scan.id, navigation, getAccessToken, backendUrl, showAlert]);

  const handleDownloadPdf = useCallback(async () => {
    if (!scan.tkData) {
      return;
    }

    setDownloading(true);
    try {
      const filePath = await generateTicketPdf(scan);

      // Copy to Downloads on Android
      if (Platform.OS === 'android') {
        const ticketCode = (scan.tkData as TKTicketData).ticketCode || 'ticket';
        const destPath = `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/Ticket-${ticketCode}.pdf`;
        await ReactNativeBlobUtil.fs.cp(filePath, destPath);

        ReactNativeBlobUtil.android.addCompleteDownload({
          title: `Ticket ${ticketCode}`,
          description: 'Ticket PDF downloaded',
          mime: 'application/pdf',
          path: destPath,
          showNotification: true,
        });
      }

      showToast('PDF saved to Downloads');
    } catch (err) {
      console.error('[PDF] Error:', err);
      showAlert({
        type: 'error',
        title: 'Download Failed',
        message: err instanceof Error ? err.message : 'Could not generate PDF',
      });
    } finally {
      setDownloading(false);
    }
  }, [scan, showToast, showAlert]);

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

    console.log('[SCAN-DETAILS] ── Scan Record ──');
    console.log('[SCAN-DETAILS]   ID:', scan.id);
    console.log('[SCAN-DETAILS]   Type:', scan.type);
    console.log('[SCAN-DETAILS]   Verified:', verified);
    console.log('[SCAN-DETAILS]   isTicket:', isTicket, '| isTruck:', isTruck);
    console.log('[SCAN-DETAILS] ── TK Data ──');
    console.log('[SCAN-DETAILS]   Kind:', tkData.kind);
    console.log('[SCAN-DETAILS]   Ticket #:', (tkData as any).ticketCode);
    console.log('[SCAN-DETAILS]   Order #:', (tkData as any).orderCode);
    console.log('[SCAN-DETAILS]   Order ID:', (tkData as any).orderId);
    console.log('[SCAN-DETAILS]   Truck #:', tkData.truckCode);
    console.log('[SCAN-DETAILS]   Tenant:', tkData.tenantName);
    console.log('[SCAN-DETAILS]   IAT:', tkData.iat ? new Date(tkData.iat).toISOString() : 'N/A');
    console.log('[SCAN-DETAILS] ── API Data ──');
    console.log('[SCAN-DETAILS]   Has apiData:', !!apiData);
    console.log('[SCAN-DETAILS]   Has apiTicket:', !!apiTicket);
    console.log('[SCAN-DETAILS]   Has apiTruck:', !!apiTruck);
    if (apiTicket) {
      console.log('[SCAN-DETAILS]   Ticket Code:', apiTicket.ticket_code);
      console.log('[SCAN-DETAILS]   Order Code:', apiTicket.order_code);
      console.log('[SCAN-DETAILS]   Order Date:', apiTicket.order_date);
      console.log('[SCAN-DETAILS]   Truck Code:', apiTicket.truck?.truck_code);
      console.log('[SCAN-DETAILS]   Truck Desc:', apiTicket.truck?.truck_description);
      console.log('[SCAN-DETAILS]   Driver:', apiTicket.driver_name);
      console.log('[SCAN-DETAILS]   Plant:', apiTicket.plant_name);
      console.log('[SCAN-DETAILS]   Status:', apiTicket.status_display);
      console.log('[SCAN-DETAILS]   Load #:', apiTicket.load);
      console.log('[SCAN-DETAILS]   Product:', apiTicket.product);
      console.log('[SCAN-DETAILS]   Load Qty:', apiTicket.load_qty);
      console.log('[SCAN-DETAILS]   Running/Ordered:', apiTicket.run_qty_ord_qty);
      console.log('[SCAN-DETAILS]   Progress:', apiTicket.progress_display);
      console.log('[SCAN-DETAILS]   Customer:', apiTicket.customer_name);
      console.log('[SCAN-DETAILS]   Project:', apiTicket.project_name);
      console.log('[SCAN-DETAILS]   Delivery:', apiTicket.delivery_address);
      console.log('[SCAN-DETAILS]   Timestamps:', JSON.stringify(apiTicket.timestamps));
    }
    if (apiTruck) {
      console.log('[SCAN-DETAILS]   Truck Code:', apiTruck.code);
      console.log('[SCAN-DETAILS]   Description:', apiTruck.description);
      console.log('[SCAN-DETAILS]   Driver:', apiTruck.current_driver_name);
      console.log('[SCAN-DETAILS]   Status:', apiTruck.ticket_status);
      console.log('[SCAN-DETAILS]   Order:', apiTruck.order_code);
      console.log('[SCAN-DETAILS]   Customer:', apiTruck.customer_name);
      console.log('[SCAN-DETAILS]   Delivery:', apiTruck.delivery_address);
      console.log('[SCAN-DETAILS]   Plant:', apiTruck.plant_name);
    }

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
              <MCIcon name={isTicket ? 'ticket-confirmation-outline' : 'truck-outline'} size={40} color={theme.colors.primary.main} />
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
            <>
              {/* Ticket Info */}
              <View style={styles.card}>
                <Text style={styles.cardSectionTitle}>TICKET INFORMATION</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Order</Text>
                  <Text style={styles.infoValue}>
                    {apiTicket?.order_code || ticketLocal.orderCode}
                  </Text>
                </View>
                {apiTicket?.order_date && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Order Date</Text>
                      <Text style={styles.infoValue}>{apiTicket.order_date}</Text>
                    </View>
                  </>
                )}
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Truck</Text>
                  <Text style={styles.infoValue}>
                    {apiTicket?.truck?.truck_code || ticketLocal.truckCode}
                  </Text>
                </View>
                {apiTicket?.truck?.truck_description && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Truck Description</Text>
                      <Text style={styles.infoValue}>
                        {apiTicket.truck.truck_description}
                      </Text>
                    </View>
                  </>
                )}
                {apiTicket?.driver_name && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Driver</Text>
                      <Text style={styles.infoValue}>{apiTicket.driver_name}</Text>
                    </View>
                  </>
                )}
                {apiTicket?.plant_name && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Plant</Text>
                      <Text style={styles.infoValue}>{apiTicket.plant_name}</Text>
                    </View>
                  </>
                )}
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
                      <Text style={styles.infoLabel}>Load</Text>
                      <Text style={styles.infoValue}>{apiTicket.load}</Text>
                    </View>
                  </>
                )}
              </View>

              {/* Product & Quantity */}
              {(apiTicket?.product || apiTicket?.load_qty || apiTicket?.progress_display) && (
                <View style={styles.card}>
                  <Text style={styles.cardSectionTitle}>PRODUCT & QUANTITY</Text>
                  {apiTicket?.product && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Product</Text>
                      <Text style={styles.infoValue}>{apiTicket.product}</Text>
                    </View>
                  )}
                  {apiTicket?.load_qty && (
                    <>
                      {apiTicket?.product && <View style={styles.divider} />}
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Load Qty</Text>
                        <Text style={styles.infoValue}>{apiTicket.load_qty}</Text>
                      </View>
                    </>
                  )}
                  {apiTicket?.run_qty_ord_qty && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Running / Ordered</Text>
                        <Text style={styles.infoValue}>{apiTicket.run_qty_ord_qty}</Text>
                      </View>
                    </>
                  )}
                  {apiTicket?.progress_display && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Progress</Text>
                        <Text style={styles.infoValue}>{apiTicket.progress_display}</Text>
                      </View>
                    </>
                  )}
                </View>
              )}

              {/* Customer & Delivery */}
              {(apiTicket?.customer_name || apiTicket?.delivery_address) && (
                <View style={styles.card}>
                  <Text style={styles.cardSectionTitle}>CUSTOMER & DELIVERY</Text>
                  {apiTicket?.customer_name && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Customer</Text>
                      <Text style={styles.infoValue}>{apiTicket.customer_name}</Text>
                    </View>
                  )}
                  {apiTicket?.project_name && (
                    <>
                      {apiTicket?.customer_name && <View style={styles.divider} />}
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Project</Text>
                        <Text style={styles.infoValue}>{apiTicket.project_name}</Text>
                      </View>
                    </>
                  )}
                  {apiTicket?.delivery_address && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Delivery Address</Text>
                        <Text style={styles.infoValue}>{apiTicket.delivery_address}</Text>
                      </View>
                    </>
                  )}
                </View>
              )}

              {/* Timeline */}
              {apiTicket?.timestamps && (
                <View style={styles.card}>
                  <Text style={styles.cardSectionTitle}>TIMELINE</Text>
                  {apiTicket.timestamps.ticketed && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Ticketed</Text>
                      <Text style={styles.infoValue}>{apiTicket.timestamps.ticketed}</Text>
                    </View>
                  )}
                  {apiTicket.timestamps.loading && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Loading</Text>
                        <Text style={styles.infoValue}>{apiTicket.timestamps.loading}</Text>
                      </View>
                    </>
                  )}
                  {apiTicket.timestamps.loaded && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Loaded</Text>
                        <Text style={styles.infoValue}>{apiTicket.timestamps.loaded}</Text>
                      </View>
                    </>
                  )}
                  {apiTicket.timestamps.to_job && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>To Job</Text>
                        <Text style={styles.infoValue}>{apiTicket.timestamps.to_job}</Text>
                      </View>
                    </>
                  )}
                  {apiTicket.timestamps.eta_at_job && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>ETA At Job</Text>
                        <Text style={styles.infoValue}>{apiTicket.timestamps.eta_at_job}</Text>
                      </View>
                    </>
                  )}
                  {apiTicket.timestamps.at_job && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>At Job</Text>
                        <Text style={styles.infoValue}>{apiTicket.timestamps.at_job}</Text>
                      </View>
                    </>
                  )}
                  {apiTicket.timestamps.pouring && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Pouring</Text>
                        <Text style={styles.infoValue}>{apiTicket.timestamps.pouring}</Text>
                      </View>
                    </>
                  )}
                  {apiTicket.timestamps.washing && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Washing</Text>
                        <Text style={styles.infoValue}>{apiTicket.timestamps.washing}</Text>
                      </View>
                    </>
                  )}
                  {apiTicket.timestamps.to_plant && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>To Plant</Text>
                        <Text style={styles.infoValue}>{apiTicket.timestamps.to_plant}</Text>
                      </View>
                    </>
                  )}
                  {apiTicket.timestamps.at_plant && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>At Plant</Text>
                        <Text style={styles.infoValue}>{apiTicket.timestamps.at_plant}</Text>
                      </View>
                    </>
                  )}
                </View>
              )}

              {/* Scan Info */}
              <View style={styles.card}>
                <Text style={styles.cardSectionTitle}>SCAN INFORMATION</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Scanned At</Text>
                  <Text style={styles.infoValue}>
                    {formatTimestamp(scan.timestamp)}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>QR Issued At</Text>
                  <Text style={styles.infoValue}>
                    {formatIssuedAt(tkData.iat)}
                  </Text>
                </View>
              </View>
            </>
          )}

          {/* Truck-specific fields */}
          {isTruck && (
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Truck</Text>
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

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {isTicket && (
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryAction]}
                onPress={handleDownloadPdf}
                disabled={downloading}
                activeOpacity={0.8}>
                {downloading ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary.contrast}
                    style={{marginRight: theme.spacing.xs}}
                  />
                ) : (
                  <Icon name="download-outline" size={18} color={theme.colors.primary.contrast} style={styles.actionIcon} />
                )}
                <Text style={styles.primaryActionText}>
                  {downloading ? 'Saving...' : 'Download Ticket'}
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
                onPress={handleShare}
                activeOpacity={0.8}>
                <Icon name="share-outline" size={18} color={theme.colors.text} style={styles.actionIcon} />
                <Text style={styles.secondaryActionText}>Share</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.actionButton, styles.dangerAction]}
              onPress={handleDelete}
              activeOpacity={0.8}>
              <Icon name="trash-outline" size={18} color={theme.colors.error.main} style={styles.actionIcon} />
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
            <Text style={styles.toastText}><Icon name="checkmark-circle" size={14} color={theme.colors.common.white} /> {toastMessage}</Text>
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
            <Icon name={dataTypeIconName} size={40} color={theme.colors.primary.main} />
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
                <Icon name="copy-outline" size={18} color={theme.colors.textSecondary} />
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
              <Icon
                name={dataType === 'url' ? 'globe-outline' : dataType.includes('email') ? 'mail-outline' : 'call-outline'}
                size={18}
                color={theme.colors.primary.contrast}
                style={styles.actionIcon}
              />
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
              <Icon name="copy-outline" size={18} color={theme.colors.text} style={styles.actionIcon} />
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
              <Icon name="share-outline" size={18} color={theme.colors.text} style={styles.actionIcon} />
              <Text style={styles.secondaryActionText}>Share</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerAction]}
            onPress={handleDelete}
            activeOpacity={0.8}>
            <Icon name="trash-outline" size={18} color={theme.colors.error.main} style={styles.actionIcon} />
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
          <Text style={styles.toastText}><Icon name="checkmark-circle" size={14} color={theme.colors.common.white} /> {toastMessage}</Text>
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
    cardSectionTitle: {
      ...theme.typography.label,
      color: theme.colors.textHint,
      marginBottom: theme.spacing.sm,
      letterSpacing: 1,
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
