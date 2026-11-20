import { formatUnits, isAddress, parseUnits } from 'viem';

export type WarrantyStatus =
  | 'Active'
  | 'Claimed'
  | 'Approved'
  | 'Rejected'
  | 'Reclaimed'
  | 'Expired';

export interface WarrantyRecord {
  id: bigint;
  seller: `0x${string}`;
  buyer: `0x${string}`;
  verifier: `0x${string}`;
  token: `0x${string}`;
  deposit: bigint;
  createdAt: number;
  expiresAt: number;
  productRef: string;
  evidenceRef: string;
  status: WarrantyStatus;
}

export interface PlatformStats {
  totalWarranties: number;
  activeWarranties: number;
  openClaims: number;
  approvedClaims: number;
  reclaimedCount: number;
}

export interface CreateWarrantyFormInput {
  buyer: string;
  token: string;
  deposit: string;
  periodDays: string;
  verifier: string;
  productRef: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

const STATUS_MAP: Record<number, WarrantyStatus> = {
  0: 'Active',
  1: 'Claimed',
  2: 'Approved',
  3: 'Rejected',
  4: 'Reclaimed',
  5: 'Expired',
};

export function mapRawWarrantyStatus(rawStatus: number | bigint | string): WarrantyStatus {
  if (typeof rawStatus === 'string') {
    const normalized = rawStatus.trim().toLowerCase();
    if (normalized === 'active' || normalized === '0') return 'Active';
    if (normalized === 'claimed' || normalized === '1') return 'Claimed';
    if (normalized === 'approved' || normalized === '2') return 'Approved';
    if (normalized === 'rejected' || normalized === '3') return 'Rejected';
    if (normalized === 'reclaimed' || normalized === '4') return 'Reclaimed';
    if (normalized === 'expired' || normalized === '5') return 'Expired';
  }
  const code = typeof rawStatus === 'bigint' ? Number(rawStatus) : Number(rawStatus);
  return STATUS_MAP[code] ?? 'Active';
}

export function deriveDisplayStatus(
  warranty: Pick<WarrantyRecord, 'status' | 'expiresAt'>,
  nowSeconds: number,
): WarrantyStatus {
  if (warranty.status === 'Active' && nowSeconds > warranty.expiresAt) {
    return 'Expired';
  }
  return warranty.status;
}

export function addressesMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

export function canFileClaim(
  warranty: Pick<WarrantyRecord, 'buyer' | 'status' | 'expiresAt'>,
  connectedAddress: string | undefined,
  nowSeconds: number,
): boolean {
  if (!connectedAddress || !addressesMatch(warranty.buyer, connectedAddress)) {
    return false;
  }
  return warranty.status === 'Active' && nowSeconds <= warranty.expiresAt;
}

export function canResolveClaim(
  warranty: Pick<WarrantyRecord, 'verifier' | 'status'>,
  connectedAddress: string | undefined,
): boolean {
  if (!connectedAddress || !addressesMatch(warranty.verifier, connectedAddress)) {
    return false;
  }
  return warranty.status === 'Claimed';
}

export function canReclaimDeposit(
  warranty: Pick<WarrantyRecord, 'seller' | 'status' | 'expiresAt'>,
  connectedAddress: string | undefined,
  nowSeconds: number,
): boolean {
  if (!connectedAddress || !addressesMatch(warranty.seller, connectedAddress)) {
    return false;
  }
  const isFinalizableState = warranty.status === 'Active' || warranty.status === 'Rejected';
  return isFinalizableState && nowSeconds > warranty.expiresAt;
}

export function getParticipantRoles(
  warranty: Pick<WarrantyRecord, 'buyer' | 'seller' | 'verifier'>,
  connectedAddress: string | undefined,
): Array<'Buyer' | 'Seller' | 'Verifier'> {
  if (!connectedAddress) return [];
  const roles: Array<'Buyer' | 'Seller' | 'Verifier'> = [];
  if (addressesMatch(warranty.buyer, connectedAddress)) roles.push('Buyer');
  if (addressesMatch(warranty.seller, connectedAddress)) roles.push('Seller');
  if (addressesMatch(warranty.verifier, connectedAddress)) roles.push('Verifier');
  return roles;
}

export function parseTokenAmount(amountInput: string, decimals: number): bigint | null {
  const trimmed = amountInput.trim();
  if (!trimmed || !/^\d+(\.\d+)?$/.test(trimmed)) {
    return null;
  }
  try {
    const parsed = parseUnits(trimmed, decimals);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

export function formatTokenAmount(
  amount: bigint,
  decimals: number,
  maxFractionDigits = 4,
): string {
  const formatted = formatUnits(amount, decimals);
  const [intPart, fracPart = ''] = formatted.split('.');
  const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (!fracPart) return groupedInt;
  const trimmedFrac = fracPart.slice(0, maxFractionDigits).replace(/0+$/, '');
  return trimmedFrac ? `${groupedInt}.${trimmedFrac}` : groupedInt;
}

export function hasSufficientAllowance(
  allowance: bigint | undefined,
  requiredAmount: bigint | null,
): boolean {
  if (allowance === undefined || requiredAmount === null || requiredAmount <= 0n) {
    return false;
  }
  return allowance >= requiredAmount;
}

export function periodDaysToSeconds(daysInput: string): bigint | null {
  const num = Number(daysInput.trim());
  if (!Number.isFinite(num) || num <= 0 || num > 3650) {
    return null;
  }
  return BigInt(Math.round(num * 86400));
}

export function validateCreateWarrantyInput(
  input: CreateWarrantyFormInput,
  decimals: number,
  sellerAddress?: string,
): ValidationResult {
  const errors: Record<string, string> = {};

  if (!isAddress(input.buyer.trim())) {
    errors.buyer = 'Enter a valid buyer wallet address.';
  } else if (sellerAddress && addressesMatch(input.buyer.trim(), sellerAddress)) {
    errors.buyer = 'Buyer address must differ from the connected seller wallet.';
  }

  if (!isAddress(input.token.trim())) {
    errors.token = 'Select or enter a valid ERC20 token address.';
  }

  const parsedAmount = parseTokenAmount(input.deposit, decimals);
  if (parsedAmount === null) {
    errors.deposit = 'Enter a deposit amount greater than zero.';
  }

  const periodSeconds = periodDaysToSeconds(input.periodDays);
  if (periodSeconds === null) {
    errors.periodDays = 'Enter a warranty period between 1 and 3,650 days.';
  }

  if (!isAddress(input.verifier.trim())) {
    errors.verifier = 'Enter a valid verifier wallet address.';
  } else if (
    isAddress(input.buyer.trim()) &&
    addressesMatch(input.verifier.trim(), input.buyer.trim())
  ) {
    errors.verifier = 'Verifier should be independent from the buyer.';
  } else if (sellerAddress && addressesMatch(input.verifier.trim(), sellerAddress)) {
    errors.verifier = 'Verifier should be independent from the seller.';
  }

  const productRef = input.productRef.trim();
  if (productRef.length < 2) {
    errors.productRef = 'Enter a product reference, serial number, or order ID.';
  } else if (productRef.length > 160) {
    errors.productRef = 'Product reference must be 160 characters or fewer.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateClaimInput(evidenceRef: string): ValidationResult {
  const errors: Record<string, string> = {};
  const trimmed = evidenceRef.trim();
  if (trimmed.length < 4) {
    errors.evidenceRef = 'Enter an evidence reference such as an IPFS CID, receipt link, or hash.';
  } else if (trimmed.length > 300) {
    errors.evidenceRef = 'Evidence reference must be 300 characters or fewer.';
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function shortenAddress(address?: string | null, chars = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatUtcDate(unixSeconds: number): string {
  if (!unixSeconds || unixSeconds <= 0) return '—';
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatRemainingPeriod(expiresAt: number, nowSeconds: number): string {
  const diff = expiresAt - nowSeconds;
  if (diff <= 0) return 'Period ended';
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  }
  const minutes = Math.max(1, Math.floor((diff % 3600) / 60));
  return `${hours}h ${minutes}m remaining`;
}

export function getExplorerTxUrl(explorerBase: string, txHash: string): string {
  return `${explorerBase.replace(/\/+$/, '')}/tx/${txHash}`;
}

export function getExplorerAddressUrl(explorerBase: string, address: string): string {
  return `${explorerBase.replace(/\/+$/, '')}/address/${address}`;
}
