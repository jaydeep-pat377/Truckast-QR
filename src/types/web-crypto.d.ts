// Web Crypto API types — available in Hermes (RN 0.76+)
// These are built into the runtime but not in RN's default TypeScript config.

declare interface AesGcmParams {
  name: 'AES-GCM';
  iv: BufferSource;
  tagLength?: number;
}

declare interface CryptoKey {
  readonly type: string;
  readonly extractable: boolean;
  readonly algorithm: Record<string, unknown>;
  readonly usages: string[];
}

declare interface SubtleCrypto {
  importKey(
    format: 'raw',
    keyData: BufferSource,
    algorithm: {name: string},
    extractable: boolean,
    keyUsages: string[],
  ): Promise<CryptoKey>;
  decrypt(
    algorithm: AesGcmParams,
    key: CryptoKey,
    data: BufferSource,
  ): Promise<ArrayBuffer>;
}

declare interface Crypto {
  readonly subtle: SubtleCrypto;
  getRandomValues<T extends ArrayBufferView>(array: T): T;
}

declare const crypto: Crypto;

declare class TextDecoder {
  constructor(encoding?: string);
  decode(input?: BufferSource): string;
}

declare function atob(data: string): string;
declare function btoa(data: string): string;
