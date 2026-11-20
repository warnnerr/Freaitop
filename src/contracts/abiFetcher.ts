import type { Abi, AbiFunction } from 'viem';
import { WARRANTY_VAULT_FALLBACK_ABI } from './warrantyVaultAbi';

export type VaultActionKey =
  | 'createWarranty'
  | 'fileClaim'
  | 'approveClaim'
  | 'rejectClaim'
  | 'reclaimDeposit'
  | 'getWarranty'
  | 'getWarrantiesByBuyer'
  | 'getWarrantiesBySeller'
  | 'getWarrantiesByVerifier'
  | 'getPlatformStats';

const ACTION_CANDIDATES: Record<VaultActionKey, string[]> = {
  createWarranty: ['createWarranty', 'openWarranty', 'create'],
  fileClaim: ['fileClaim', 'submitClaim', 'claim'],
  approveClaim: ['approveClaim', 'acceptClaim', 'resolveClaim'],
  rejectClaim: ['rejectClaim', 'denyClaim', 'resolveClaim'],
  reclaimDeposit: ['reclaimDeposit', 'reclaim', 'withdrawDeposit'],
  getWarranty: ['getWarranty', 'warranties', 'warranty'],
  getWarrantiesByBuyer: ['getWarrantiesByBuyer', 'getBuyerWarranties', 'warrantiesByBuyer'],
  getWarrantiesBySeller: ['getWarrantiesBySeller', 'getSellerWarranties', 'warrantiesBySeller'],
  getWarrantiesByVerifier: ['getWarrantiesByVerifier', 'getVerifierWarranties', 'warrantiesByVerifier'],
  getPlatformStats: ['getPlatformStats', 'platformStats', 'getStats', 'stats', 'warrantyCount'],
};

export interface ResolvedFunction {
  abi: Abi;
  functionName: string;
  fn: AbiFunction;
}

function getAbiFunctions(abi: Abi): AbiFunction[] {
  return abi.filter((item): item is AbiFunction => item.type === 'function');
}

export function resolveVaultFunction(
  abi: Abi,
  action: VaultActionKey,
): ResolvedFunction | null {
  const functions = getAbiFunctions(abi);
  const candidates = ACTION_CANDIDATES[action];

  for (const name of candidates) {
    const match = functions.find(
      (fn) => fn.name.toLowerCase() === name.toLowerCase(),
    );
    if (match) {
      return {
        abi,
        functionName: match.name,
        fn: match,
      };
    }
  }
  return null;
}

export function buildResolveClaimArgs(
  fn: AbiFunction,
  warrantyId: bigint,
  approve: boolean,
): readonly unknown[] {
  if (fn.inputs.length === 2 && fn.inputs[1].type === 'bool') {
    return [warrantyId, approve];
  }
  return [warrantyId];
}

export interface FetchedAbiState {
  abi: Abi;
  source: 'explorer' | 'baseline';
}

export async function fetchDeployedContractAbi(
  contractAddress: `0x${string}`,
  explorerBaseUrl: string,
): Promise<FetchedAbiState> {
  const cleanBase = explorerBaseUrl.replace(/\/+$/, '');

  try {
    const v2Resp = await fetch(`${cleanBase}/api/v2/smart-contracts/${contractAddress}`);
    if (v2Resp.ok) {
      const payload = (await v2Resp.json()) as { abi?: unknown };
      if (Array.isArray(payload.abi) && payload.abi.length > 0) {
        return {
          abi: payload.abi as Abi,
          source: 'explorer',
        };
      }
    }
  } catch {
    // Fall through to legacy explorer query
  }

  try {
    const legacyResp = await fetch(
      `${cleanBase}/api?module=contract&action=getabi&address=${contractAddress}`,
    );
    if (legacyResp.ok) {
      const payload = (await legacyResp.json()) as { status?: string; result?: string };
      if (payload.status === '1' && payload.result) {
        const parsed = JSON.parse(payload.result) as unknown;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return {
            abi: parsed as Abi,
            source: 'explorer',
          };
        }
      }
    }
  } catch {
    // Fall back to baseline ABI when explorer verification is unavailable
  }

  return {
    abi: WARRANTY_VAULT_FALLBACK_ABI,
    source: 'baseline',
  };
}
