import jsPDF from 'jspdf';
import autoTable, {type RowInput} from 'jspdf-autotable';
import ReactNativeBlobUtil from 'react-native-blob-util';
import qrcode from 'qrcode-generator';
import {Buffer} from 'buffer';
import {TRUCKAST_GREEN_LOGO} from '../lib/truckastLogo';
import type {ScanRecord, FullTicket, TicketProduct, TKTicketData, APITicketDetails} from '../types';

function f(v: string | number | null | undefined): string {
  if (v == null) return '';
  return String(v).trim();
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return '\u2014';
  try {
    return new Date(v).toLocaleDateString('en-US', {month: '2-digit', day: '2-digit', year: 'numeric'});
  } catch {
    return '\u2014';
  }
}

function fmtTime(v: string | null | undefined): string {
  if (!v || !v.trim()) return '';
  try {
    let s = v.trim();
    s = s.replace(/\.\d{1,3}/, '');
    s = s.replace(/[+-]\d{2}(:\d{2})?$/, '');
    s = s.replace(/Z$/, '');
    const match = s.match(/[T ](\d{2}):(\d{2})/);
    if (match) return `${match[1]}:${match[2]}`;
    // Handle bare time "HH:MM" or "HH:MM:SS"
    const bareMatch = s.match(/^(\d{1,2}):(\d{2})/);
    if (bareMatch) {
      let h = parseInt(bareMatch[1], 10);
      const m = bareMatch[2];
      const ampm = s.match(/\s*(AM|PM)$/i);
      if (ampm) {
        const isPM = ampm[1].toUpperCase() === 'PM';
        if (isPM && h < 12) h += 12;
        if (!isPM && h === 12) h = 0;
      }
      return `${String(h).padStart(2, '0')}:${m}`;
    }
    return '';
  } catch {
    return '';
  }
}

function addr(t: FullTicket): string {
  return [t.delivery_addr1, t.delivery_addr2, t.delivery_addr3]
    .filter(p => p && p.trim() !== '')
    .join(', ');
}

function mixProd(t: FullTicket): TicketProduct | undefined {
  const p = t.ticket_products || [];
  return p.find(x => x.is_mix === true) || p[0];
}

function qtyInfo(t: FullTicket) {
  const m = mixProd(t);
  const q = m?.load_qty ?? 0;
  const u = (m?.ticket_qty_unit || m?.order_qty_unit || '').toUpperCase();
  const oq = m?.order_qty ?? 0;
  const load = q > 0 ? `${q.toFixed(2)} ${u}` : '\u2014';
  const total = oq > 0 ? `${q.toFixed(2)} Of ${oq.toFixed(2)} ${u}` : q > 0 ? `${q.toFixed(2)} ${u}` : '\u2014';
  return {load, total};
}

function generateQrDataUrl(content: string): string | null {
  try {
    const qr = qrcode(0, 'M');
    qr.addData(content);
    qr.make();
    return qr.createDataURL(4, 0);
  } catch {
    return null;
  }
}

function buildFullTicketFromApi(
  apiData: APITicketDetails,
  tkData?: TKTicketData,
): FullTicket {
  let loadQty: number | null = null;
  let qtyUnit = '';
  if (apiData.load_qty) {
    const parts = apiData.load_qty.trim().split(/\s+/);
    loadQty = parseFloat(parts[0]);
    if (isNaN(loadQty)) loadQty = null;
    if (parts.length > 1) qtyUnit = parts.slice(1).join(' ');
  }
  if (!qtyUnit && apiData.run_qty_ord_qty) {
    const m = apiData.run_qty_ord_qty.match(/[\d.]+\s+(\w+)\s*$/);
    if (m) qtyUnit = m[1];
  }

  // Use full products array from API if available, otherwise build single product
  let products: TicketProduct[] | undefined;
  if (apiData.ticket_products && apiData.ticket_products.length > 0) {
    products = apiData.ticket_products;
  } else if (apiData.product || loadQty != null) {
    products = [{
      id: 0,
      ticket_id: 0,
      item_code: null,
      description: apiData.product || null,
      is_mix: true,
      load_qty: loadQty,
      order_qty: apiData.ordered_qty || null,
      ticket_qty_unit: qtyUnit || null,
      order_qty_unit: qtyUnit || null,
    }];
  }

  return {
    ticket_id: 0,
    ticket_code: apiData.ticket_code || tkData?.ticketCode || '',
    created_date: '',
    order_date: apiData.order_date || '',
    order_code: apiData.order_code || tkData?.orderCode || '',
    customer_name: apiData.customer_name || '',
    delivery_addr1: apiData.delivery_address || null,
    delivery_addr2: null,
    delivery_addr3: null,
    plant_code: null,
    plant_name: apiData.plant_name || null,
    plant_address: apiData.plant_address || null,
    slump: apiData.slump
      || (apiData.ticket_products?.find(p => p.is_mix)?.slump != null
        ? String(apiData.ticket_products.find(p => p.is_mix)!.slump)
        : null),
    truck_code: apiData.truck?.truck_code || tkData?.truckCode || null,
    driver_name: apiData.driver_name || null,
    project_name: apiData.project_name || null,
    ordered_by_name: apiData.ordered_by_name || null,
    ordered_by_phone: apiData.ordered_by_phone || null,
    purchase_order: apiData.purchase_order || null,
    customer_job: apiData.customer_job || null,
    amount: null,
    scheduled_on_job_time: null,
    printed_time: apiData.timestamps?.ticketed || null,
    load_time: apiData.timestamps?.loading || null,
    loaded_time: apiData.timestamps?.loaded || null,
    to_job_time: apiData.timestamps?.to_job || null,
    on_job_time: apiData.timestamps?.at_job || null,
    unload_time: apiData.timestamps?.pouring || null,
    end_unload: null,
    wash_time: apiData.timestamps?.washing || null,
    to_plant_time: apiData.timestamps?.to_plant || null,
    at_plant_time: apiData.timestamps?.at_plant || null,
    print_mix_weight: null,
    remove_reason_code: apiData.remove_reason_code || null,
    current_status: apiData.status_display || apiData.status || '',
    ticket_products: products,
  };
}

const P = {
  white: [255, 255, 255] as [number, number, number],
  dark: [15, 23, 42] as [number, number, number],
  lbl: [100, 116, 139] as [number, number, number],
  bdr: [203, 213, 225] as [number, number, number],
  bg: [248, 250, 252] as [number, number, number],
  muted: [148, 163, 184] as [number, number, number],
  cautionBg: [254, 243, 199] as [number, number, number],
  cautionBdr: [251, 191, 36] as [number, number, number],
  cautionTxt: [146, 64, 14] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
};

const lblS = {fontSize: 5, fontStyle: 'normal' as const, textColor: P.lbl, cellPadding: {top: 0.6, bottom: 0, left: 2, right: 2}, minCellHeight: 3.0};
const valS = {fontSize: 7.5, fontStyle: 'bold' as const, textColor: P.dark, cellPadding: {top: 0.2, bottom: 1.0, left: 2, right: 2}, minCellHeight: 4.0};
const tbl = {theme: 'grid' as const, styles: {lineColor: P.bdr, lineWidth: 0.2, cellPadding: 1.0, fontSize: 6.5, textColor: P.dark}};

function buildJsPdf(ticket: FullTicket, orderCode?: string | null, qrDataUrl?: string | null, qrSubtitle?: string | null): jsPDF {
  const doc = new jsPDF({orientation: 'portrait', unit: 'mm', format: 'letter'});
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ml = 10, mr = 10, cw = pw - ml - mr;
  const oCode = orderCode ?? ticket.order_code ?? '';
  const mix = mixProd(ticket);
  const qi = qtyInfo(ticket);
  const address = addr(ticket);
  const weather = ticket.weather_data;
  const weatherStr = weather ? `${weather.temperature_fahrenheit.toFixed(1)}\u00b0F ${weather.weather_description}` : '';
  const products = ticket.ticket_products || [];
  const now = new Date().toLocaleString('en-US');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastY = () => (doc as any).lastAutoTable.finalY as number;
  function banner(title: string, by: number): number { doc.setFillColor(120, 184, 41); doc.rect(ml, by, cw, 5.5, 'F'); doc.setTextColor(...P.white); doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.text(title, ml + 2, by + 3.8); return by + 5.5; }
  function footer(left: string) { doc.setTextColor(...P.muted); doc.setFontSize(5); doc.setFont('helvetica', 'normal'); doc.text(left, ml, ph - 5); doc.text(`Downloaded: ${now}`, pw - mr, ph - 5, {align: 'right'}); }

  let y = 0;
  doc.setFillColor(120, 184, 41); doc.rect(0, 0, pw, 22, 'F');
  try { doc.addImage(TRUCKAST_GREEN_LOGO, 'PNG', ml + 1, 3, 40, 13); } catch { doc.setTextColor(...P.white); doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text('TRUCKAST', ml + 2, 12); }
  doc.setTextColor(...P.white); doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('DOLESE BROS. CO.', pw / 2, 9, {align: 'center'}); doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.text('Concrete Delivery Ticket', pw / 2, 14, {align: 'center'});
  doc.setTextColor(255, 255, 255); doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.text('Ticket #', pw - mr - 2, 6, {align: 'right'}); doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text(ticket.ticket_code, pw - mr - 2, 15, {align: 'right'});
  doc.setFillColor(88, 145, 25); doc.rect(0, 22, pw, 1.5, 'F');
  y = 25;
  doc.setFillColor(...P.cautionBg); doc.rect(ml, y, cw, 8, 'F'); doc.setDrawColor(...P.cautionBdr); doc.setLineWidth(0.3); doc.rect(ml, y, cw, 8, 'S'); doc.setTextColor(...P.cautionTxt); doc.setFontSize(5.5); doc.setFont('helvetica', 'bold'); doc.text('CAUTION', ml + 2, y + 3); doc.setFontSize(3.5); doc.setFont('helvetica', 'normal'); doc.text('READY MIXED CONCRETE \u2014 AVOID CONTACT WITH EYES OR SKIN. Freshly mixed cement, mortar, concrete or grout forms a caustic solution. Wear protective clothing. If wet concrete gets into your eyes, flush immediately for 15 minutes. If discomfort persists, seek medical attention.', ml + 2, y + 5.5, {maxWidth: cw - 4});
  y += 9;
  const qrSize = 22; const qrX = pw - mr - qrSize - 1; const qrY = y;
  if (qrDataUrl) { try { doc.addImage(qrDataUrl, 'GIF', qrX, qrY, qrSize, qrSize); } catch { doc.setDrawColor(120, 184, 41); doc.setLineWidth(0.5); doc.rect(qrX, qrY, qrSize, qrSize, 'S'); doc.setTextColor(120, 184, 41); doc.setFontSize(5); doc.setFont('helvetica', 'bold'); doc.text('SCAN QR', qrX + qrSize / 2, qrY + qrSize / 2 - 1, {align: 'center'}); } } else { doc.setDrawColor(120, 184, 41); doc.setLineWidth(0.5); doc.rect(qrX, qrY, qrSize, qrSize, 'S'); doc.setTextColor(120, 184, 41); doc.setFontSize(5); doc.setFont('helvetica', 'bold'); doc.text('SCAN QR', qrX + qrSize / 2, qrY + qrSize / 2 - 1, {align: 'center'}); doc.setFontSize(3.5); doc.setFont('helvetica', 'normal'); doc.text('for live tracking', qrX + qrSize / 2, qrY + qrSize / 2 + 2, {align: 'center'}); }
  const subText = qrSubtitle && qrSubtitle.length > 45 ? qrSubtitle.substring(0, 42) + '...' : (qrSubtitle || 'Scan to verify ticket');
  doc.setTextColor(...P.muted); doc.setFontSize(3); doc.setFont('helvetica', 'normal'); doc.text(subText, qrX + qrSize / 2, qrY + qrSize + 2.5, {align: 'center'});
  const formW = cw - qrSize - 6; const triW = formW / 3;
  autoTable(doc, {startY: y, margin: {left: ml, right: pw - ml - formW}, ...tbl, body: [[{content: 'Ticket', styles: lblS}, {content: 'Order', styles: lblS}, {content: 'Date', styles: lblS}], [{content: ticket.ticket_code, styles: valS}, {content: f(oCode) || '\u2014', styles: valS}, {content: fmtDate(ticket.order_date), styles: valS}]] as RowInput[], columnStyles: {0: {cellWidth: triW}, 1: {cellWidth: triW}, 2: {cellWidth: triW}}});
  y = Math.max(lastY(), qrY + qrSize + 4);
  const fwFields: [string, string][] = []; fwFields.push(['Customer', f(ticket.customer_name) || '\u2014']); if (f(ticket.project_name)) fwFields.push(['Project', f(ticket.project_name)]); fwFields.push(['Delivery Address', f(address) || '\u2014']); if (f(ticket.lot_block_number)) fwFields.push(['LotBlock', f(ticket.lot_block_number)]); if (f(ticket.customer_job)) fwFields.push(['Customer Job Name', f(ticket.customer_job)]); if (f(ticket.job_number)) fwFields.push(['Customer Job Number', f(ticket.job_number)]); if (f(ticket.purchase_order)) fwFields.push(['Purchase Order Number', f(ticket.purchase_order)]); if (f(ticket.special_instructions)) fwFields.push(['Special Instructions', f(ticket.special_instructions)]);
  const fwBody: RowInput[] = []; fwFields.forEach(([label, value]) => { fwBody.push([{content: label, styles: lblS}]); fwBody.push([{content: value, styles: valS}]); });
  autoTable(doc, {startY: y, margin: {left: ml, right: mr}, ...tbl, body: fwBody, columnStyles: {0: {cellWidth: cw}}});
  y = lastY();
  const orderByName = f(ticket.ordered_by_name); const orderByPhone = f(ticket.ordered_by_phone);
  if (orderByName || orderByPhone) { autoTable(doc, {startY: y, margin: {left: ml, right: mr}, ...tbl, body: [[{content: 'Order By', styles: lblS}, {content: 'Order By Phone', styles: lblS}], [{content: orderByName || '\u2014', styles: valS}, {content: orderByPhone || '\u2014', styles: valS}]] as RowInput[], columnStyles: {0: {cellWidth: cw * 0.52}, 1: {cellWidth: cw * 0.48}}}); y = lastY(); }
  const pairs: [string, string, string, string][] = []; pairs.push(['Driver', f(ticket.driver_name) || '\u2014', 'Truck', f(ticket.truck_code) || '\u2014']); pairs.push(['Plant', f(ticket.plant_name || ticket.plant_code) || '\u2014', 'Plant Address', f(ticket.plant_address) || '\u2014']); if (f(ticket.truck_ahead)) pairs.push(['Producer', '\u2014', 'Truck Ahead', f(ticket.truck_ahead)]); pairs.push(['Load', qi.load, 'Slump', f(ticket.slump) || '\u2014']); pairs.push(['Usage', f(mix?.description) || '\u2014', 'Total Quantity', qi.total]); if (weatherStr) pairs.push(['Weather', weatherStr, 'Status', ticket.current_status || 'Pending']); else pairs.push(['Status', ticket.current_status || 'Pending', 'Order Date', fmtDate(ticket.order_date)]);
  const pairBody: RowInput[] = []; pairs.forEach(([lL, lV, rL, rV]) => { pairBody.push([{content: lL, styles: lblS}, {content: rL, styles: lblS}]); pairBody.push([{content: lV, styles: valS}, {content: rV, styles: valS}]); });
  autoTable(doc, {startY: y, margin: {left: ml, right: mr}, ...tbl, body: pairBody, columnStyles: {0: {cellWidth: cw * 0.52}, 1: {cellWidth: cw * 0.48}}});
  y = lastY() + 1;
  y = banner('PRODUCTS', y);
  const prodRows: RowInput[] = products.length > 0 ? products.map(p => [p.load_qty != null ? p.load_qty.toFixed(2) : '\u2014', f(p.item_code) || '\u2014', f(p.description) || '\u2014', f(p.ticket_qty_unit || p.order_qty_unit) || '\u2014', '\u2014', 'ON ACCOUNT']) : [[{content: 'No products recorded', colSpan: 6, styles: {halign: 'center' as const, fontStyle: 'italic' as const, textColor: P.muted}}]];
  autoTable(doc, {startY: y, margin: {left: ml, right: mr}, ...tbl, head: [['Load Qty', 'Product Code', 'Product Description', 'Unit', 'Unit Price', 'Amount']], body: prodRows, headStyles: {fillColor: P.bg, textColor: P.lbl, fontStyle: 'bold', fontSize: 5}, styles: {...tbl.styles, fontSize: 6}, columnStyles: {0: {halign: 'center', cellWidth: 18}, 1: {halign: 'center', cellWidth: 20}, 2: {cellWidth: 'auto'}, 3: {halign: 'center', cellWidth: 14}, 4: {halign: 'right', cellWidth: 18}, 5: {halign: 'right', cellWidth: 22}}});
  y = lastY();
  autoTable(doc, {startY: y, margin: {left: ml + cw * 0.62, right: mr}, ...tbl, body: [['Sub Total', 'ON ACCOUNT'], ['Gst/Hst', ''], ['Total', 'ON ACCOUNT']] as RowInput[], styles: {...tbl.styles, fontSize: 5, cellPadding: 1}, columnStyles: {0: {fontStyle: 'bold', textColor: P.lbl, cellWidth: (cw * 0.38) / 2}, 1: {halign: 'right', fontStyle: 'bold', textColor: P.dark, cellWidth: (cw * 0.38) / 2}}});
  y = lastY() + 1;
  y = banner('DELIVERY TIMELINE', y);
  const tPrinted = fmtTime(ticket.printed_time) || '\u2014'; const tLoading = fmtTime(ticket.load_time) || '\u2014'; const tLoaded = fmtTime(ticket.loaded_time) || '\u2014'; const tToJob = fmtTime(ticket.to_job_time) || '\u2014'; const tOnJob = fmtTime(ticket.on_job_time) || '\u2014'; const tPour = fmtTime(ticket.unload_time) || '\u2014'; const tWash = fmtTime(ticket.wash_time) || '\u2014'; const tToPlant = fmtTime(ticket.to_plant_time) || '\u2014'; const tAtPlant = fmtTime(ticket.at_plant_time) || '\u2014';
  const ctr = {halign: 'center' as const}; const bld = {halign: 'center' as const, fontStyle: 'bold' as const};
  autoTable(doc, {startY: y, margin: {left: ml, right: mr}, ...tbl, head: [[{content: 'Ticketed', styles: ctr}, {content: 'Loading', styles: ctr}, {content: 'Loaded', styles: ctr}, {content: 'To Job', styles: ctr}, {content: 'On Job', styles: ctr}, {content: 'Pouring', styles: ctr}, {content: 'Washing', styles: ctr}, {content: 'To Plant', styles: ctr}, {content: 'At Plant', styles: ctr}]], body: [[{content: tPrinted, styles: bld}, {content: tLoading, styles: bld}, {content: tLoaded, styles: bld}, {content: tToJob, styles: bld}, {content: tOnJob, styles: bld}, {content: tPour, styles: bld}, {content: tWash, styles: bld}, {content: tToPlant, styles: bld}, {content: tAtPlant, styles: bld}]] as RowInput[], headStyles: {fillColor: P.bg, textColor: [120, 184, 41] as [number, number, number], fontStyle: 'bold', fontSize: 5, halign: 'center'}, styles: {...tbl.styles, fontSize: 6.5}});
  y = lastY();
  autoTable(doc, {startY: y, margin: {left: ml, right: mr}, ...tbl, body: [['Customer added water ______ Litres', 'Estimated Returned Concrete ______ m3']] as RowInput[], styles: {...tbl.styles, fontSize: 5.5, textColor: P.lbl}, columnStyles: {0: {cellWidth: cw / 2}, 1: {cellWidth: cw / 2}}});
  y = lastY();
  autoTable(doc, {startY: y, margin: {left: ml, right: mr}, ...tbl, body: [[{content: 'Customer Notes:\n_________________________________________________________________________________\n_________________________________________________________________________________', styles: {fontSize: 5.5, fontStyle: 'bold' as const, textColor: P.dark, minCellHeight: 10}}]] as RowInput[], columnStyles: {0: {cellWidth: cw}}});
  footer('Dolese Bros. Co. \u2014 Concrete Delivery Ticket');

  doc.addPage();
  doc.setFillColor(120, 184, 41); doc.rect(0, 0, pw, 22, 'F');
  try { doc.addImage(TRUCKAST_GREEN_LOGO, 'PNG', ml + 1, 3, 40, 13); } catch { doc.setTextColor(...P.white); doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text('TRUCKAST', ml + 2, 12); }
  doc.setTextColor(...P.white); doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('DOLESE BROS. CO.', pw / 2, 9, {align: 'center'}); doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.text('Terms & Conditions', pw / 2, 14, {align: 'center'});
  doc.setTextColor(255, 255, 255); doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.text('Ticket #', pw - mr - 2, 6, {align: 'right'}); doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text(ticket.ticket_code, pw - mr - 2, 15, {align: 'right'});
  doc.setFillColor(88, 145, 25); doc.rect(0, 22, pw, 1.5, 'F');
  y = 27;
  doc.setTextColor(...P.lbl); doc.setFontSize(5); doc.setFont('helvetica', 'normal'); doc.text('Dolese Bros. Co. | P.O. Box 1247, Oklahoma City, OK 73101 | dolese.com | dolese.truckast.ai', ml, y); doc.text(`Downloaded: ${now}`, pw - mr, y, {align: 'right'});
  y += 5;
  doc.setTextColor(71, 85, 105); doc.setFontSize(6); doc.setFont('helvetica', 'normal');
  const terms = ['DOLESE BROS. CO. IS PLEASED TO DELIVER THE CONCRETE OR CONCRETE PRODUCTS ("PRODUCT") DESCRIBED ON THIS DELIVERY TICKET. PLEASE BE ADVISED THAT THE PRODUCT IS SUBJECT TO OUR TERMS AND CONDITIONS OF SALE \u2014 CONCRETE (AVAILABLE ON REQUEST). ANY PROPOSAL OR ATTEMPT TO MODIFY THESE TERMS, INCLUDING BY ANNOTATION ON THE FACE OF THIS DELIVERY TICKET, IS EXPRESSLY REJECTED. ANY DISAGREEMENTS WITH THE INFORMATION CONTAINED ON THIS TICKET MUST BE REPORTED WITHIN 24 HOURS OF DELIVERY, OTHERWISE ALL INFORMATION WILL BE DEEMED FINAL.', 'CUSTOMER ACKNOWLEDGES RECEIPT OF THE PRODUCT IN GOOD CONDITION AND AGREES TO THE TERMS AND CONDITIONS OF SALE. THE CUSTOMER WILL NOT HOLD THE PRODUCER LIABLE FOR ANY DAMAGES RESULTING FROM IMPROPER USE, PLACEMENT, OR FINISHING OF THE CONCRETE PRODUCT.', 'CUSTOMER IS RESPONSIBLE FOR ENSURING ADEQUATE ACCESS TO THE DELIVERY SITE AND THAT THE SITE IS SAFE FOR DELIVERY OPERATIONS. ANY ADDITIONAL TIME REQUIRED DUE TO SITE CONDITIONS WILL BE CHARGED AT THE PREVAILING RATE.', "ALL CLAIMS FOR DEFECTIVE PRODUCT MUST BE MADE IN WRITING WITHIN 72 HOURS OF DELIVERY. PRODUCER'S LIABILITY SHALL NOT EXCEED THE PURCHASE PRICE OF THE PRODUCT DELIVERED."];
  terms.forEach(para => { const lines = doc.splitTextToSize(para, cw); doc.text(lines, ml, y); y += lines.length * 2.8 + 2; });
  doc.setTextColor(...P.red); doc.setFontSize(5); doc.setFont('helvetica', 'bold');
  const redLines = doc.splitTextToSize('ANY DISAGREEMENTS WITH THE INFORMATION CONTAINED ON THIS TICKET MUST BE REPORTED WITHIN 24 HOURS OF DELIVERY, OTHERWISE ALL INFORMATION WILL BE DEEMED FINAL.', cw);
  doc.text(redLines, ml, y); y += redLines.length * 2.5 + 6;
  autoTable(doc, {startY: y, margin: {left: ml, right: mr}, ...tbl, head: [[{content: 'Received By:', styles: {halign: 'left' as const}}, {content: 'Signature:', styles: {halign: 'left' as const}}, {content: 'Time Signed:', styles: {halign: 'left' as const}}]], body: [[{content: 'Unsigned\n__________________________', styles: {minCellHeight: 12}}, {content: 'Unsigned\n__________________________', styles: {minCellHeight: 12}}, {content: 'Unsigned\n__________________________', styles: {minCellHeight: 12}}]] as RowInput[], headStyles: {fillColor: P.bg, textColor: P.lbl, fontStyle: 'bold', fontSize: 5.5}, styles: {...tbl.styles, fontSize: 7.5}, columnStyles: {0: {cellWidth: cw / 3}, 1: {cellWidth: cw / 3}, 2: {cellWidth: cw / 3}}});
  y = lastY() + 4;
  y = banner('CONCRETE TEST RESULTS', y);
  autoTable(doc, {startY: y, margin: {left: ml, right: mr}, ...tbl, head: [['Status', 'User Type', 'Name', 'Air', 'Slump(mm)', 'Amb/Conc (C)', 'Wgt', 'AirEnt', 'Super', 'Water', 'Cast', 'Test', 'Time']], body: [[{content: `Test results not submitted for ticket: ${ticket.ticket_code}`, colSpan: 13, styles: {halign: 'left' as const, fontStyle: 'italic' as const, textColor: P.muted}}]] as RowInput[], headStyles: {fillColor: P.bg, textColor: P.lbl, fontStyle: 'bold', fontSize: 4.5}, styles: {...tbl.styles, fontSize: 5, cellPadding: 1.2}});
  footer('Dolese Bros. Co. \u2014 dolese.truckast.ai');
  return doc;
}

export async function buildLocalPdf(scan: ScanRecord, ticketCode: string): Promise<string> {
  const tkTicketData = scan.tkData as TKTicketData | undefined;

  let ticket = scan.fullTicket;
  let orderCode = scan.orderCode;

  if (!ticket && scan.apiData && scan.tkData?.kind === 'ticket') {
    ticket = buildFullTicketFromApi(scan.apiData as APITicketDetails, tkTicketData);
    orderCode = orderCode || (scan.apiData as APITicketDetails).order_code;
  }

  if (ticket) {
    const qrDataUrl = generateQrDataUrl(scan.data);
    const qrSubtitle = tkTicketData?.tenantSubdomain
      ? `https://${tkTicketData.tenantSubdomain}.truckast.ai/t/${ticket.ticket_code}`
      : null;
    const doc = buildJsPdf(ticket, orderCode, qrDataUrl, qrSubtitle);
    const arrayBuffer = doc.output('arraybuffer');
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const filePath = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/ticket-${ticketCode}.pdf`;
    await ReactNativeBlobUtil.fs.writeFile(filePath, base64, 'base64');
    return filePath;
  }

  const {generatePDF} = require('react-native-html-to-pdf');
  const tkData = scan.tkData as TKTicketData | undefined;
  const tenantName = tkData?.tenantName || '\u2014';
  const tc = tkData?.ticketCode || '\u2014';
  const oc = tkData?.orderCode || '\u2014';
  const trk = tkData?.truckCode || '\u2014';
  const now = new Date().toLocaleString('en-US');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Helvetica,Arial,sans-serif;color:#0f172a;background:#f8fafc}.page{max-width:600px;margin:0 auto;background:#fff}.hdr{background:linear-gradient(135deg,#78B829,#589119);padding:32px 28px 24px;color:#fff}.hdr-brand{font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;opacity:.8;margin-bottom:4px}.hdr-tenant{font-size:22px;font-weight:800;margin-bottom:16px}.hdr-tl{font-size:10px;text-transform:uppercase;letter-spacing:2px;opacity:.7}.hdr-tc{font-size:32px;font-weight:900}.accent{height:4px;background:#589119}.cnt{padding:24px 28px}.st{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#94a3b8;margin-bottom:12px;margin-top:24px;padding-bottom:6px;border-bottom:1px solid #e2e8f0}.st:first-child{margin-top:0}table{width:100%;border-collapse:collapse}tr{border-bottom:1px solid #f1f5f9}tr:last-child{border-bottom:none}.rl{padding:10px 0;font-size:12px;color:#64748b;width:40%}.rv{padding:10px 0;font-size:13px;font-weight:600;text-align:right;width:60%}.ftr{margin-top:32px;padding:20px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center}.ftr span{font-size:10px;color:#94a3b8}.ftr div{font-size:11px;font-weight:700;color:#78B829;margin-top:4px;letter-spacing:1px}</style></head><body><div class="page"><div class="hdr"><div class="hdr-brand">TRUCKAST QR</div><div class="hdr-tenant">${tenantName}</div><div class="hdr-tl">Ticket Number</div><div class="hdr-tc">${tc}</div></div><div class="accent"></div><div class="cnt"><div class="st">Ticket Information</div><table><tr><td class="rl">Ticket #</td><td class="rv">${tc}</td></tr><tr><td class="rl">Order #</td><td class="rv">${oc}</td></tr><tr><td class="rl">Truck #</td><td class="rv">${trk}</td></tr></table><div class="st">Scan Information</div><table><tr><td class="rl">Scanned At</td><td class="rv">${new Date(scan.timestamp).toLocaleString('en-US')}</td></tr><tr><td class="rl">Tenant</td><td class="rv">${tenantName}</td></tr></table></div><div class="ftr"><span>Generated on ${now}</span><div>TRUCKAST QR SCANNER</div></div></div></body></html>`;
  const pdf = await generatePDF({html, fileName: `Ticket-${ticketCode}`, directory: 'Documents', width: 612, height: 792});
  if (!pdf.filePath) throw new Error('PDF generation failed');
  return pdf.filePath;
}
