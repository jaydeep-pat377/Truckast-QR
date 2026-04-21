/**
 * TK QR Code Detection + Client-Side Decryption
 *
 * Detection: isTKQR(), isTKPipeQR()
 * Decryption: decryptTKQR() — used as fallback when server endpoint isn't available
 *
 * QR formats from the web app:
 *   1. Encrypted: [TK/E] + Base64(IV₁₂ | AuthTag₁₆ | Ciphertext)
 *   2. Pipe fallback: orderCode|orderId|ticketCode|ticketId|truckCode|truckId
 */
import QuickCrypto from 'react-native-quick-crypto';
import {toByteArray} from 'react-native-quick-base64';
import {ENV} from '../config/env';
import type {TKQRData, TKTicketData} from '../types';

const TK_PREFIX = '[TK/E]';

const KEY_HEX = ENV.QR_ENCRYPTION_KEY;

const KEY_BYTES = KEY_HEX
  ? new Uint8Array(KEY_HEX.match(/.{2}/g)!.map(h => parseInt(h, 16)))
  : new Uint8Array(32);

export function isTKQR(payload: string): boolean {
  return payload.startsWith(TK_PREFIX);
}

export function isTKPipeQR(payload: string): boolean {
  if (payload.startsWith('[') || payload.startsWith('http')) {
    return false;
  }
  const parts = payload.split('|');
  return parts.length === 6 && parts.every(p => p.length > 0);
}

export function parseTKPipeQR(payload: string): TKTicketData {
  const parts = payload.split('|');
  if (parts.length !== 6) {
    throw new Error('Invalid pipe-separated QR format');
  }
  return {
    kind: 'ticket',
    orderCode: parts[0],
    orderId: parts[1],
    ticketCode: parts[2],
    ticketId: parts[3],
    truckCode: parts[4],
    truckId: parts[5],
    tenantId: '',
    tenantUuid: '',
    tenantSubdomain: '',
    tenantStatus: 'active',
    tenantName: '',
    sig: '',
    iat: Date.now(),
  };
}

/**
 * Client-side AES-256-GCM decryption via react-native-quick-crypto.
 * Used as fallback when the server /api/qr/verify endpoint isn't deployed.
 */
export async function decryptTKQR(payload: string): Promise<TKQRData> {
  if (!payload.startsWith(TK_PREFIX)) {
    throw new Error('Not a TK QR code');
  }

  const b64 = payload.slice(TK_PREFIX.length).trim();
  if (!b64) {
    throw new Error('Empty QR payload');
  }

  console.log('[DECRYPT] base64 length:', b64.length);

  let rawBytes: Uint8Array;
  try {
    rawBytes = toByteArray(b64);
  } catch {
    throw new Error('Base64 decode failed');
  }

  console.log('[DECRYPT] raw bytes:', rawBytes.length);

  if (rawBytes.length < 29) {
    throw new Error(`Payload too short: ${rawBytes.length} bytes`);
  }

  const iv = rawBytes.slice(0, 12);
  const authTag = rawBytes.slice(12, 28);
  const ciphertext = rawBytes.slice(28);

  console.log('[DECRYPT] iv:', iv.length, 'tag:', authTag.length, 'ct:', ciphertext.length);

  try {
    // Use createDecipheriv (Node-style API)
    const decipher = (QuickCrypto as any).createDecipheriv(
      'aes-256-gcm',
      KEY_BYTES,
      iv,
    );
    decipher.setAuthTag(authTag);

    const part1 = decipher.update(ciphertext);
    const part2 = decipher.final();

    console.log('[DECRYPT] decrypt OK, part1:', part1.length, 'part2:', part2.length);

    // Combine and decode UTF-8
    const totalLen = part1.length + part2.length;
    const combined = new Uint8Array(totalLen);
    for (let i = 0; i < part1.length; i++) {
      combined[i] = part1[i];
    }
    for (let i = 0; i < part2.length; i++) {
      combined[part1.length + i] = part2[i];
    }

    let jsonStr = '';
    if (typeof TextDecoder !== 'undefined') {
      jsonStr = new TextDecoder('utf-8').decode(combined);
    } else {
      for (let i = 0; i < combined.length; i++) {
        jsonStr += String.fromCharCode(combined[i]);
      }
    }

    console.log('[DECRYPT] JSON preview:', jsonStr.substring(0, 80));
    return JSON.parse(jsonStr) as TKQRData;
  } catch (e) {
    console.log('[DECRYPT] Failed:', e);
    throw new Error(
      'Decryption failed: ' + (e instanceof Error ? e.message : String(e)),
    );
  }
}
