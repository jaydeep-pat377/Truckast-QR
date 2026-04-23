import ReactNativeBlobUtil from 'react-native-blob-util';
import type {ScanRecord, TKTicketData} from '../types';

const PDF_TIMEOUT_MS = 15_000;

interface TicketPdfResponse {
  ok: boolean;
  base64?: string;
  ticketCode?: string;
  error?: string;
}

async function fetchPdfFromServer(
  payload: string,
  backendUrl: string,
): Promise<TicketPdfResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PDF_TIMEOUT_MS);

  try {
    const response = await fetch(`${backendUrl}/api/qr/ticket-pdf`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({payload}),
      signal: controller.signal,
    });

    const json = await response.json();
    return json as TicketPdfResponse;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateTicketPdf(
  scan: ScanRecord,
  backendUrl?: string,
): Promise<string> {
  const tkData = scan.tkData as TKTicketData | undefined;
  const ticketCode =
    scan.fullTicket?.ticket_code || tkData?.ticketCode || 'ticket';

  if (backendUrl && scan.data) {
    try {
      const result = await fetchPdfFromServer(scan.data, backendUrl);

      if (result.ok && result.base64) {
        const code = result.ticketCode || ticketCode;
        const filePath = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/ticket-${code}.pdf`;
        await ReactNativeBlobUtil.fs.writeFile(filePath, result.base64, 'base64');
        return filePath;
      }
    } catch (err) {
      console.log('[PDF] Server generation failed, falling back to local:', err);
    }
  }

  const {buildLocalPdf} = require('./ticketPdfLocal');
  return buildLocalPdf(scan, ticketCode);
}
