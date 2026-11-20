import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canFileClaim,
  canReclaimDeposit,
  canResolveClaim,
  deriveDisplayStatus,
  formatRemainingPeriod,
  formatTokenAmount,
  getParticipantRoles,
  hasSufficientAllowance,
  mapRawWarrantyStatus,
  parseTokenAmount,
  periodDaysToSeconds,
  shortenAddress,
  validateClaimInput,
  validateCreateWarrantyInput,
} from './warranty';

const SELLER = '0x1111111111111111111111111111111111111111';
const BUYER = '0x2222222222222222222222222222222222222222';
const VERIFIER = '0x3333333333333333333333333333333333333333';
const OTHER = '0x4444444444444444444444444444444444444444';
const USDC = '0x3600000000000000000000000000000000000000';

test('token amount parsing and formatting respects real token decimals', () => {
  assert.equal(parseTokenAmount('250.5', 6), 250500000n);
  assert.equal(parseTokenAmount('1.25', 18), 1250000000000000000n);
  assert.equal(parseTokenAmount('0', 6), null);
  assert.equal(parseTokenAmount('-5', 6), null);

  assert.equal(formatTokenAmount(250500000n, 6), '250.5');
  assert.equal(formatTokenAmount(1000000000n, 6), '1,000');
  assert.equal(formatTokenAmount(1250000000000000000n, 18), '1.25');
});

test('allowance sufficiency checks exact deposit requirement', () => {
  assert.equal(hasSufficientAllowance(1000000n, 1000000n), true);
  assert.equal(hasSufficientAllowance(999999n, 1000000n), false);
  assert.equal(hasSufficientAllowance(undefined, 1000000n), false);
  assert.equal(hasSufficientAllowance(1000000n, null), false);
});

test('claim filing is restricted to buyer during active period', () => {
  const activeWarranty = {
    buyer: BUYER as `0x${string}`,
    status: 'Active' as const,
    expiresAt: 2000,
  };

  assert.equal(canFileClaim(activeWarranty, BUYER.toLowerCase(), 1500), true);
  assert.equal(canFileClaim(activeWarranty, BUYER, 2001), false);
  assert.equal(canFileClaim(activeWarranty, SELLER, 1500), false);
  assert.equal(canFileClaim({ ...activeWarranty, status: 'Claimed' }, BUYER, 1500), false);
});

test('claim resolution is restricted to verifier when status is Claimed', () => {
  const claimed = { verifier: VERIFIER as `0x${string}`, status: 'Claimed' as const };
  assert.equal(canResolveClaim(claimed, VERIFIER), true);
  assert.equal(canResolveClaim(claimed, BUYER), false);
  assert.equal(canResolveClaim({ ...claimed, status: 'Active' }, VERIFIER), false);
});

test('deposit reclaim is restricted to seller after period with no open claim', () => {
  const active = { seller: SELLER as `0x${string}`, status: 'Active' as const, expiresAt: 2000 };
  assert.equal(canReclaimDeposit(active, SELLER, 2001), true);
  assert.equal(canReclaimDeposit(active, SELLER, 2000), false);
  assert.equal(canReclaimDeposit(active, BUYER, 2001), false);
  assert.equal(canReclaimDeposit({ ...active, status: 'Claimed' }, SELLER, 2001), false);
  assert.equal(canReclaimDeposit({ ...active, status: 'Rejected' }, SELLER, 2001), true);
  assert.equal(canReclaimDeposit({ ...active, status: 'Approved' }, SELLER, 2001), false);
});

test('display status transitions Active to Expired after deadline', () => {
  assert.equal(deriveDisplayStatus({ status: 'Active', expiresAt: 1000 }, 999), 'Active');
  assert.equal(deriveDisplayStatus({ status: 'Active', expiresAt: 1000 }, 1001), 'Expired');
  assert.equal(deriveDisplayStatus({ status: 'Claimed', expiresAt: 1000 }, 1001), 'Claimed');
  assert.equal(mapRawWarrantyStatus(1), 'Claimed');
  assert.equal(mapRawWarrantyStatus('Reclaimed'), 'Reclaimed');
});

test('participant roles identify connected wallet roles accurately', () => {
  const warranty = {
    buyer: BUYER as `0x${string}`,
    seller: SELLER as `0x${string}`,
    verifier: VERIFIER as `0x${string}`,
  };
  assert.deepEqual(getParticipantRoles(warranty, BUYER), ['Buyer']);
  assert.deepEqual(getParticipantRoles(warranty, VERIFIER), ['Verifier']);
  assert.deepEqual(getParticipantRoles(warranty, OTHER), []);
});

test('create warranty validation catches invalid addresses, amounts, and independent verifier checks', () => {
  const validResult = validateCreateWarrantyInput(
    {
      buyer: BUYER,
      token: USDC,
      deposit: '500',
      periodDays: '90',
      verifier: VERIFIER,
      productRef: 'SN-2026-ARC-001',
    },
    6,
    SELLER,
  );
  assert.equal(validResult.valid, true);

  const invalidResult = validateCreateWarrantyInput(
    {
      buyer: 'not-an-address',
      token: USDC,
      deposit: '0',
      periodDays: '0',
      verifier: SELLER,
      productRef: 'A',
    },
    6,
    SELLER,
  );
  assert.equal(invalidResult.valid, false);
  assert.ok(invalidResult.errors.buyer);
  assert.ok(invalidResult.errors.deposit);
  assert.ok(invalidResult.errors.periodDays);
  assert.ok(invalidResult.errors.verifier);
  assert.ok(invalidResult.errors.productRef);
});

test('claim validation and time helpers format cleanly', () => {
  assert.equal(validateClaimInput('ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi').valid, true);
  assert.equal(validateClaimInput('ab').valid, false);
  assert.equal(periodDaysToSeconds('30'), 2592000n);
  assert.equal(shortenAddress(USDC), '0x3600...0000');
  assert.equal(formatRemainingPeriod(100000, 100000), 'Period ended');
  assert.equal(formatRemainingPeriod(100000 + 86400 * 2 + 3600 * 3, 100000), '2d 3h remaining');
});
