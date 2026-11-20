import test from 'node:test';
import assert from 'node:assert/strict';
import type { Abi } from 'viem';
import { buildResolveClaimArgs, resolveVaultFunction } from './abiFetcher';
import {
  normalizePlatformStatsResult,
  normalizeWarrantyResult,
  WARRANTY_VAULT_FALLBACK_ABI,
} from './warrantyVaultAbi';

test('resolver matches canonical ABI functions', () => {
  const createFn = resolveVaultFunction(WARRANTY_VAULT_FALLBACK_ABI, 'createWarranty');
  assert.ok(createFn);
  assert.equal(createFn.functionName, 'createWarranty');

  const buyerFn = resolveVaultFunction(WARRANTY_VAULT_FALLBACK_ABI, 'getWarrantiesByBuyer');
  assert.ok(buyerFn);
  assert.equal(buyerFn.functionName, 'getWarrantiesByBuyer');
});

test('resolver adapts to variant deployed ABI signatures', () => {
  const variantAbi = [
    {
      type: 'function',
      name: 'submitClaim',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'id', type: 'uint256' },
        { name: 'evidence', type: 'string' },
      ],
      outputs: [],
    },
    {
      type: 'function',
      name: 'resolveClaim',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'id', type: 'uint256' },
        { name: 'approved', type: 'bool' },
      ],
      outputs: [],
    },
    {
      type: 'function',
      name: 'getBuyerWarranties',
      stateMutability: 'view',
      inputs: [{ name: 'buyer', type: 'address' }],
      outputs: [{ name: '', type: 'uint256[]' }],
    },
  ] as const satisfies Abi;

  const claimFn = resolveVaultFunction(variantAbi, 'fileClaim');
  assert.equal(claimFn?.functionName, 'submitClaim');

  const approveFn = resolveVaultFunction(variantAbi, 'approveClaim');
  assert.equal(approveFn?.functionName, 'resolveClaim');
  assert.deepEqual(buildResolveClaimArgs(approveFn!.fn, 42n, true), [42n, true]);
  assert.deepEqual(buildResolveClaimArgs(approveFn!.fn, 42n, false), [42n, false]);

  const buyerFn = resolveVaultFunction(variantAbi, 'getWarrantiesByBuyer');
  assert.equal(buyerFn?.functionName, 'getBuyerWarranties');
});

test('tuple and object normalizers produce consistent WarrantyRecord and PlatformStats', () => {
  const tuple = [
    7n,
    '0x1111111111111111111111111111111111111111',
    '0x2222222222222222222222222222222222222222',
    '0x3333333333333333333333333333333333333333',
    '0x3600000000000000000000000000000000000000',
    500000000n,
    1700000000n,
    1707776000n,
    'ORDER-9921',
    'ipfs://evidence-cid',
    1,
  ];
  const normalized = normalizeWarrantyResult(tuple);
  assert.ok(normalized);
  assert.equal(normalized.id, 7n);
  assert.equal(normalized.deposit, 500000000n);
  assert.equal(normalized.status, 'Claimed');
  assert.equal(normalized.productRef, 'ORDER-9921');

  const stats = normalizePlatformStatsResult([12n, 5n, 2n, 3n, 2n]);
  assert.equal(stats.totalWarranties, 12);
  assert.equal(stats.activeWarranties, 5);
  assert.equal(stats.openClaims, 2);
  assert.equal(stats.approvedClaims, 3);
  assert.equal(stats.reclaimedCount, 2);
});
