/**
 * Ticket PDF Generator
 *
 * Generates a styled PDF receipt for a scanned ticket.
 */
import {generatePDF} from 'react-native-html-to-pdf';
import type {TKTicketData, APITicketDetails, ScanRecord} from '../types';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function row(label: string, value: string | undefined | null): string {
  if (!value) {
    return '';
  }
  return `
    <tr>
      <td class="label">${label}</td>
      <td class="value">${value}</td>
    </tr>`;
}

function timestampRow(label: string, time: string | null | undefined): string {
  if (!time) {
    return '';
  }
  return `
    <tr>
      <td class="ts-label">${label}</td>
      <td class="ts-value">${time}</td>
    </tr>`;
}

function buildHtml(scan: ScanRecord): string {
  const tkData = scan.tkData as TKTicketData | undefined;
  const apiData = scan.apiData as APITicketDetails | undefined;

  const ticketCode = apiData?.ticket_code || tkData?.ticketCode || '—';
  const orderCode = apiData?.order_code || tkData?.orderCode || '—';
  const truckCode = apiData?.truck?.truck_code || tkData?.truckCode || '—';
  const truckDesc = apiData?.truck?.truck_description || null;
  const driverName = apiData?.driver_name || null;
  const plantName = apiData?.plant_name || null;
  const status = apiData?.status_display || apiData?.status || '—';
  const tenantName = tkData?.tenantName || tkData?.tenantSubdomain || '—';

  const statusColor =
    status.toLowerCase().includes('plant') ? '#10b981' :
    status.toLowerCase().includes('job') ? '#6366f1' :
    status.toLowerCase().includes('pour') ? '#f59e0b' :
    status.toLowerCase().includes('load') ? '#8b5cf6' :
    status.toLowerCase().includes('cancel') ? '#ef4444' :
    '#64748b';

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
    background: #f8fafc;
    color: #0f172a;
    padding: 0;
  }

  .page {
    max-width: 600px;
    margin: 0 auto;
    background: #fff;
  }

  /* Header */
  .header {
    background: linear-gradient(135deg, #458b00 0%, #2d6b00 100%);
    padding: 32px 28px 24px;
    color: white;
  }
  .header-brand {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    opacity: 0.8;
    margin-bottom: 4px;
  }
  .header-tenant {
    font-size: 22px;
    font-weight: 800;
    margin-bottom: 16px;
  }
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .header-ticket-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 2px;
    opacity: 0.7;
  }
  .header-ticket-code {
    font-size: 32px;
    font-weight: 900;
    letter-spacing: 1px;
  }
  .status-badge {
    display: inline-block;
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    background: ${statusColor};
    color: white;
  }

  /* Divider */
  .divider {
    height: 3px;
    background: linear-gradient(90deg, #458b00, #2d6b00, #458b00);
  }

  /* Content */
  .content {
    padding: 24px 28px;
  }

  .section-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #94a3b8;
    margin-bottom: 12px;
    margin-top: 24px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e2e8f0;
  }
  .section-title:first-child {
    margin-top: 0;
  }

  /* Data table */
  .data-table {
    width: 100%;
    border-collapse: collapse;
  }
  .data-table tr {
    border-bottom: 1px solid #f1f5f9;
  }
  .data-table tr:last-child {
    border-bottom: none;
  }
  .label {
    padding: 10px 0;
    font-size: 12px;
    color: #64748b;
    font-weight: 500;
    width: 40%;
    vertical-align: top;
  }
  .value {
    padding: 10px 0;
    font-size: 13px;
    color: #0f172a;
    font-weight: 600;
    text-align: right;
    width: 60%;
  }

  /* Timestamps */
  .ts-table {
    width: 100%;
    border-collapse: collapse;
  }
  .ts-table tr {
    border-bottom: 1px solid #f1f5f9;
  }
  .ts-label {
    padding: 8px 0;
    font-size: 11px;
    color: #64748b;
    width: 50%;
  }
  .ts-value {
    padding: 8px 0;
    font-size: 12px;
    color: #0f172a;
    font-weight: 600;
    text-align: right;
    width: 50%;
  }

  /* Footer */
  .footer {
    margin-top: 32px;
    padding: 20px 28px;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    text-align: center;
  }
  .footer-text {
    font-size: 10px;
    color: #94a3b8;
    letter-spacing: 0.5px;
  }
  .footer-brand {
    font-size: 11px;
    font-weight: 700;
    color: #458b00;
    margin-top: 4px;
    letter-spacing: 1px;
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="header-brand">TRUCKAST QR</div>
    <div class="header-tenant">${tenantName}</div>
    <div class="header-row">
      <div>
        <div class="header-ticket-label">Ticket Number</div>
        <div class="header-ticket-code">${ticketCode}</div>
      </div>
      <div class="status-badge">${status}</div>
    </div>
  </div>

  <div class="divider"></div>

  <div class="content">

    <!-- Ticket Info -->
    <div class="section-title">Ticket Information</div>
    <table class="data-table">
      ${row('Ticket #', ticketCode)}
      ${row('Order #', orderCode)}
      ${row('Truck #', truckCode)}
      ${row('Truck Description', truckDesc)}
      ${row('Driver', driverName)}
      ${row('Plant', plantName)}
      ${row('Load #', apiData?.load)}
      ${row('Status', status)}
    </table>

    <!-- Product & Quantity -->
    ${(apiData?.product || apiData?.load_qty || apiData?.run_qty_ord_qty) ? `
    <div class="section-title">Product &amp; Quantity</div>
    <table class="data-table">
      ${row('Product', apiData?.product)}
      ${row('Load Qty', apiData?.load_qty)}
      ${row('Running / Ordered', apiData?.run_qty_ord_qty)}
      ${row('Progress', apiData?.progress_display)}
    </table>
    ` : ''}

    <!-- Customer & Delivery -->
    ${(apiData?.customer_name || apiData?.delivery_address) ? `
    <div class="section-title">Customer &amp; Delivery</div>
    <table class="data-table">
      ${row('Customer', apiData?.customer_name)}
      ${row('Project', apiData?.project_name)}
      ${row('Delivery Address', apiData?.delivery_address)}
      ${row('Order Date', apiData?.order_date)}
    </table>
    ` : ''}

    <!-- Timestamps -->
    ${apiData?.timestamps ? `
    <div class="section-title">Timeline</div>
    <table class="ts-table">
      ${timestampRow('Ticketed', apiData.timestamps.ticketed)}
      ${timestampRow('Loading', apiData.timestamps.loading)}
      ${timestampRow('Loaded', apiData.timestamps.loaded)}
      ${timestampRow('To Job', apiData.timestamps.to_job)}
      ${timestampRow('At Job', apiData.timestamps.at_job)}
      ${timestampRow('Pouring', apiData.timestamps.pouring)}
      ${timestampRow('Washing', apiData.timestamps.washing)}
      ${timestampRow('To Plant', apiData.timestamps.to_plant)}
      ${timestampRow('At Plant', apiData.timestamps.at_plant)}
    </table>
    ` : ''}

    <!-- Scan Info -->
    <div class="section-title">Scan Information</div>
    <table class="data-table">
      ${row('Scanned At', formatDate(scan.timestamp))}
      ${row('QR Issued At', tkData?.iat ? formatDate(tkData.iat) : undefined)}
      ${row('Tenant', tenantName)}
      ${row('Verification', scan.verified === 'verified' ? 'Verified' : scan.verified === 'offline' ? 'Offline' : 'Unverified')}
    </table>

  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-text">Generated on ${formatDate(Date.now())}</div>
    <div class="footer-brand">TRUCKAST QR SCANNER</div>
  </div>

</div>
</body>
</html>`;
}

export async function generateTicketPdf(scan: ScanRecord): Promise<string> {
  const tkData = scan.tkData as TKTicketData | undefined;
  const apiData = scan.apiData as APITicketDetails | undefined;
  const ticketCode = tkData?.ticketCode || 'ticket';

  console.log('[PDF] ── Generating PDF ──');
  console.log('[PDF] Scan ID:', scan.id);
  console.log('[PDF] Scan Type:', scan.type);
  console.log('[PDF] Scanned At:', new Date(scan.timestamp).toISOString());
  console.log('[PDF] Verified:', scan.verified);
  console.log('[PDF] ── TK Data ──');
  console.log('[PDF]   Kind:', tkData?.kind);
  console.log('[PDF]   Ticket #:', tkData?.ticketCode);
  console.log('[PDF]   Order #:', tkData?.orderCode);
  console.log('[PDF]   Order ID:', tkData?.orderId);
  console.log('[PDF]   Truck #:', tkData?.truckCode);
  console.log('[PDF]   Tenant:', tkData?.tenantName);
  console.log('[PDF]   Tenant Subdomain:', tkData?.tenantSubdomain);
  console.log('[PDF]   QR Issued At:', tkData?.iat ? new Date(tkData.iat).toISOString() : 'N/A');
  console.log('[PDF] ── API Data ──');
  console.log('[PDF]   Ticket Code:', apiData?.ticket_code);
  console.log('[PDF]   Order Code:', apiData?.order_code);
  console.log('[PDF]   Order Date:', apiData?.order_date);
  console.log('[PDF]   Truck Code:', apiData?.truck?.truck_code);
  console.log('[PDF]   Truck Desc:', apiData?.truck?.truck_description);
  console.log('[PDF]   Driver:', apiData?.driver_name);
  console.log('[PDF]   Plant:', apiData?.plant_name);
  console.log('[PDF]   Load #:', apiData?.load);
  console.log('[PDF]   Status:', apiData?.status_display);
  console.log('[PDF]   Product:', apiData?.product);
  console.log('[PDF]   Load Qty:', apiData?.load_qty);
  console.log('[PDF]   Running/Ordered:', apiData?.run_qty_ord_qty);
  console.log('[PDF]   Progress:', apiData?.progress_display);
  console.log('[PDF]   Customer:', apiData?.customer_name);
  console.log('[PDF]   Project:', apiData?.project_name);
  console.log('[PDF]   Delivery Address:', apiData?.delivery_address);
  console.log('[PDF]   Timestamps:', JSON.stringify(apiData?.timestamps));

  const html = buildHtml(scan);

  console.log('[PDF] HTML length:', html.length);
  console.log('[PDF] Generating file: Ticket-' + ticketCode + '.pdf');

  const pdf = await generatePDF({
    html,
    fileName: `Ticket-${ticketCode}`,
    directory: 'Documents',
    width: 612,
    height: 792,
  });

  if (!pdf.filePath) {
    console.log('[PDF] ❌ Generation failed — no filePath returned');
    throw new Error('PDF generation failed');
  }

  console.log('[PDF] ✅ Generated:', pdf.filePath);
  return pdf.filePath;
}
