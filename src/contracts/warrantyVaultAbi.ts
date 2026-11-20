import type { Abi } from 'viem';
import {
  mapRawWarrantyStatus,
  type PlatformStats,
  type WarrantyRecord,
} from '../utils/warranty';

export const WARRANTY_VAULT_FALLBACK_ABI = [
  {
    type: 'function',
    name: 'createWarranty',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'buyer', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'deposit', type: 'uint256' },
      { name: 'period', type: 'uint256' },
      { name: 'verifier', type: 'address' },
      { name: 'productRef', type: 'string' },
    ],
    outputs: [{ name: 'warrantyId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'fileClaim',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'warrantyId', type: 'uint256' },
      { name: 'evidenceRef', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'approveClaim',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'warrantyId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'rejectClaim',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'warrantyId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'reclaimDeposit',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'warrantyId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getWarranty',
    stateMutability: 'view',
    inputs: [{ name: 'warrantyId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'seller', type: 'address' },
          { name: 'buyer', type: 'address' },
          { name: 'verifier', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'deposit', type: 'uint256' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'expiresAt', type: 'uint256' },
          { name: 'productRef', type: 'string' },
          { name: 'evidenceRef', type: 'string' },
          { name: 'status', type: 'uint8' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getWarrantiesByBuyer',
    stateMutability: 'view',
    inputs: [{ name: 'buyer', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getWarrantiesBySeller',
    stateMutability: 'view',
    inputs: [{ name: 'seller', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getWarrantiesByVerifier',
    stateMutability: 'view',
    inputs: [{ name: 'verifier', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getPlatformStats',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'totalWarranties', type: 'uint256' },
      { name: 'activeWarranties', type: 'uint256' },
      { name: 'openClaims', type: 'uint256' },
      { name: 'approvedClaims', type: 'uint256' },
      { name: 'reclaimedCount', type: 'uint256' },
    ],
  },
] as const satisfies Abi;

export function normalizeWarrantyResult(
  raw: unknown,
  fallbackId?: bigint,
): WarrantyRecord | null {
  if (!raw) return null;

  if (Array.isArray(raw)) {
    if (raw.length >= 11) {
      return {
        id: BigInt(raw[0] ?? fallbackId ?? 0n),
        seller: String(raw[1]) as `0x${string}`,
        buyer: String(raw[2]) as `0x${string}`,
        verifier: String(raw[3]) as `0x${string}`,
        token: String(raw[4]) as `0x${string}`,
        deposit: BigInt(raw[5] ?? 0n),
        createdAt: Number(raw[6] ?? 0),
        expiresAt: Number(raw[7] ?? 0),
        productRef: String(raw[8] ?? ''),
        evidenceRef: String(raw[9] ?? ''),
        status: mapRawWarrantyStatus(raw[10] as number | bigint),
      };
    }
    if (raw.length >= 9) {
      return {
        id: BigInt(fallbackId ?? 0n),
        seller: String(raw[0]) as `0x${string}`,
        buyer: String(raw[1]) as `0x${string}`,
        verifier: String(raw[2]) as `0x${string}`,
        token: String(raw[3]) as `0x${string}`,
        deposit: BigInt(raw[4] ?? 0n),
        createdAt: Number(raw[5] ?? 0),
        expiresAt: Number(raw[6] ?? 0),
        productRef: String(raw[7] ?? ''),
        evidenceRef: String(raw[8] ?? ''),
        status: mapRawWarrantyStatus((raw[9] ?? 0) as number | bigint),
      };
    }
    return null;
  }

  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const seller = (obj.seller ?? obj.merchant) as `0x${string}` | undefined;
    const buyer = obj.buyer as `0x${string}` | undefined;
    const verifier = (obj.verifier ?? obj.arbiter) as `0x${string}` | undefined;
    const token = (obj.token ?? obj.asset) as `0x${string}` | undefined;
    if (!seller || !buyer || !verifier || !token) {
      return null;
    }

    const createdAt = Number(obj.createdAt ?? obj.startTime ?? 0);
    const period = Number(obj.period ?? obj.duration ?? 0);
    const expiresAt = Number(obj.expiresAt ?? obj.endTime ?? (createdAt + period));

    return {
      id: BigInt((obj.id ?? obj.warrantyId ?? fallbackId ?? 0n) as bigint | number | string),
      seller,
      buyer,
      verifier,
      token,
      deposit: BigInt((obj.deposit ?? obj.amount ?? 0n) as bigint | number | string),
      createdAt,
      expiresAt,
      productRef: String(obj.productRef ?? obj.productReference ?? obj.itemRef ?? ''),
      evidenceRef: String(obj.evidenceRef ?? obj.evidenceReference ?? obj.claimEvidence ?? ''),
      status: mapRawWarrantyStatus((obj.status ?? obj.state ?? 0) as number | bigint | string),
    };
  }

  return null;
}

export function normalizePlatformStatsResult(raw: unknown): PlatformStats {
  if (!raw) {
    return {
      totalWarranties: 0,
      activeWarranties: 0,
      openClaims: 0,
      approvedClaims: 0,
      reclaimedCount: 0,
    };
  }

  if (typeof raw === 'bigint' || typeof raw === 'number') {
    return {
      totalWarranties: Number(raw),
      activeWarranties: 0,
      openClaims: 0,
      approvedClaims: 0,
      reclaimedCount: 0,
    };
  }

  if (Array.isArray(raw)) {
    return {
      totalWarranties: Number(raw[0] ?? 0),
      activeWarranties: Number(raw[1] ?? 0),
      openClaims: Number(raw[2] ?? 0),
      approvedClaims: Number(raw[3] ?? 0),
      reclaimedCount: Number(raw[4] ?? 0),
    };
  }

  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    return {
      totalWarranties: Number(obj.totalWarranties ?? obj.total ?? obj.count ?? 0),
      activeWarranties: Number(obj.activeWarranties ?? obj.active ?? 0),
      openClaims: Number(obj.openClaims ?? obj.claimed ?? obj.pendingClaims ?? 0),
      approvedClaims: Number(obj.approvedClaims ?? obj.approved ?? obj.refunded ?? 0),
      reclaimedCount: Number(obj.reclaimedCount ?? obj.reclaimed ?? 0),
    };
  }

  return {
    totalWarranties: 0,
    activeWarranties: 0,
    openClaims: 0,
    approvedClaims: 0,
    reclaimedCount: 0,
  };
}
