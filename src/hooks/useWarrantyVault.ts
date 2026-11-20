import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erc20Abi, isAddress, type Abi } from 'viem';
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { ARC_CHAIN_ID } from '../config/arc';
import { ENV_CONFIG } from '../config/env';
import {
  fetchDeployedContractAbi,
  resolveVaultFunction,
  type VaultActionKey,
} from '../contracts/abiFetcher';
import {
  normalizePlatformStatsResult,
  normalizeWarrantyResult,
  WARRANTY_VAULT_FALLBACK_ABI,
} from '../contracts/warrantyVaultAbi';
import type { PlatformStats, WarrantyRecord } from '../utils/warranty';

export type TxLifecyclePhase = 'idle' | 'pending' | 'confirming' | 'confirmed' | 'error';

export interface TokenMetadata {
  decimals: number;
  symbol: string;
  balance: bigint;
  allowance: bigint;
  isLoading: boolean;
  isValidToken: boolean;
  refetch: () => void;
}

export interface WarrantyWithToken extends WarrantyRecord {
  tokenSymbol: string;
  tokenDecimals: number;
}

export function useDeployedContractAbi() {
  const contractAddress = ENV_CONFIG.contractAddress;

  return useQuery({
    queryKey: ['deployed-abi', contractAddress ?? 'none', ENV_CONFIG.explorerUrl],
    queryFn: () => {
      if (!contractAddress) {
        return Promise.resolve({
          abi: WARRANTY_VAULT_FALLBACK_ABI as Abi,
          source: 'baseline' as const,
        });
      }
      return fetchDeployedContractAbi(contractAddress, ENV_CONFIG.explorerUrl);
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useTokenMetadata(
  tokenAddress: string | undefined,
  ownerAddress: `0x${string}` | undefined,
): TokenMetadata {
  const validToken = Boolean(tokenAddress && isAddress(tokenAddress));
  const spender = ENV_CONFIG.contractAddress;
  const typedToken = validToken ? (tokenAddress as `0x${string}`) : undefined;

  const contracts = useMemo(() => {
    if (!typedToken) return [];
    const base = [
      {
        address: typedToken,
        abi: erc20Abi,
        functionName: 'decimals' as const,
        chainId: ARC_CHAIN_ID,
      },
      {
        address: typedToken,
        abi: erc20Abi,
        functionName: 'symbol' as const,
        chainId: ARC_CHAIN_ID,
      },
    ];
    if (ownerAddress) {
      return [
        ...base,
        {
          address: typedToken,
          abi: erc20Abi,
          functionName: 'balanceOf' as const,
          args: [ownerAddress] as const,
          chainId: ARC_CHAIN_ID,
        },
        ...(spender
          ? [
              {
                address: typedToken,
                abi: erc20Abi,
                functionName: 'allowance' as const,
                args: [ownerAddress, spender] as const,
                chainId: ARC_CHAIN_ID,
              },
            ]
          : []),
      ];
    }
    return base;
  }, [typedToken, ownerAddress, spender]);

  const query = useReadContracts({
    contracts,
    query: {
      enabled: validToken && contracts.length > 0,
    },
  });

  const decimalsResult = query.data?.[0];
  const symbolResult = query.data?.[1];
  const balanceResult = ownerAddress ? query.data?.[2] : undefined;
  const allowanceResult = ownerAddress && spender ? query.data?.[3] : undefined;

  const isValidToken =
    validToken &&
    decimalsResult?.status === 'success' &&
    symbolResult?.status === 'success';

  return {
    decimals:
      decimalsResult?.status === 'success' ? Number(decimalsResult.result) : 6,
    symbol:
      symbolResult?.status === 'success' ? String(symbolResult.result) : 'TOKEN',
    balance:
      balanceResult?.status === 'success' ? BigInt(balanceResult.result as bigint) : 0n,
    allowance:
      allowanceResult?.status === 'success' ? BigInt(allowanceResult.result as bigint) : 0n,
    isLoading: query.isLoading,
    isValidToken,
    refetch: () => {
      void query.refetch();
    },
  };
}

export function usePlatformStats(): {
  stats: PlatformStats;
  isLoading: boolean;
  isConfigured: boolean;
  refetch: () => void;
} {
  const contractAddress = ENV_CONFIG.contractAddress;
  const { data: abiState } = useDeployedContractAbi();
  const activeAbi: Abi = (abiState?.abi ?? WARRANTY_VAULT_FALLBACK_ABI) as Abi;
  const statsFn = resolveVaultFunction(activeAbi, 'getPlatformStats');

  const query = useReadContract({
    address: contractAddress,
    abi: activeAbi,
    functionName: statsFn?.functionName ?? 'getPlatformStats',
    chainId: ARC_CHAIN_ID,
    query: {
      enabled: Boolean(contractAddress && statsFn),
    },
  });

  const stats = useMemo(
    () => normalizePlatformStatsResult(query.data),
    [query.data],
  );

  return {
    stats,
    isLoading: Boolean(contractAddress) && query.isLoading,
    isConfigured: Boolean(contractAddress),
    refetch: () => {
      void query.refetch();
    },
  };
}

export function useRoleWarranties(connectedAddress: `0x${string}` | undefined) {
  const contractAddress = ENV_CONFIG.contractAddress;
  const publicClient = usePublicClient({ chainId: ARC_CHAIN_ID });
  const { data: abiState } = useDeployedContractAbi();
  const activeAbi: Abi = (abiState?.abi ?? WARRANTY_VAULT_FALLBACK_ABI) as Abi;

  const query = useQuery({
    queryKey: [
      'role-warranties',
      contractAddress ?? 'unconfigured',
      connectedAddress ?? 'disconnected',
      abiState?.source ?? 'baseline',
    ],
    enabled: Boolean(contractAddress && connectedAddress && publicClient),
    queryFn: async (): Promise<WarrantyWithToken[]> => {
      if (!contractAddress || !connectedAddress || !publicClient) {
        return [];
      }

      const buyerFn = resolveVaultFunction(activeAbi, 'getWarrantiesByBuyer');
      const sellerFn = resolveVaultFunction(activeAbi, 'getWarrantiesBySeller');
      const verifierFn = resolveVaultFunction(activeAbi, 'getWarrantiesByVerifier');
      const getWarrantyFn = resolveVaultFunction(activeAbi, 'getWarranty');

      if (!getWarrantyFn) return [];

      const roleCalls: Promise<readonly bigint[]>[] = [
        buyerFn
          ? (publicClient.readContract({
              address: contractAddress,
              abi: activeAbi,
              functionName: buyerFn.functionName,
              args: [connectedAddress],
            }) as Promise<readonly bigint[]>)
          : Promise.resolve([]),
        sellerFn
          ? (publicClient.readContract({
              address: contractAddress,
              abi: activeAbi,
              functionName: sellerFn.functionName,
              args: [connectedAddress],
            }) as Promise<readonly bigint[]>)
          : Promise.resolve([]),
        verifierFn
          ? (publicClient.readContract({
              address: contractAddress,
              abi: activeAbi,
              functionName: verifierFn.functionName,
              args: [connectedAddress],
            }) as Promise<readonly bigint[]>)
          : Promise.resolve([]),
      ];

      const [buyerIds, sellerIds, verifierIds] = await Promise.all(roleCalls);

      const uniqueIds = Array.from(
        new Set([...buyerIds, ...sellerIds, ...verifierIds].map((id) => id.toString())),
      ).map((str) => BigInt(str));

      if (uniqueIds.length === 0) return [];

      const rawWarranties = await Promise.all(
        uniqueIds.map((id) =>
          publicClient.readContract({
            address: contractAddress,
            abi: activeAbi,
            functionName: getWarrantyFn.functionName,
            args: [id],
          }),
        ),
      );

      const records = rawWarranties
        .map((raw, idx) => normalizeWarrantyResult(raw, uniqueIds[idx]))
        .filter((item): item is WarrantyRecord => item !== null);

      const uniqueTokens = Array.from(
        new Set(records.map((r) => r.token.toLowerCase())),
      ) as `0x${string}`[];

      const tokenInfoMap = new Map<string, { symbol: string; decimals: number }>();

      await Promise.all(
        uniqueTokens.map(async (token) => {
          try {
            const [decimals, symbol] = await Promise.all([
              publicClient.readContract({
                address: token,
                abi: erc20Abi,
                functionName: 'decimals',
              }),
              publicClient.readContract({
                address: token,
                abi: erc20Abi,
                functionName: 'symbol',
              }),
            ]);
            tokenInfoMap.set(token.toLowerCase(), {
              decimals: Number(decimals),
              symbol: String(symbol),
            });
          } catch {
            tokenInfoMap.set(token.toLowerCase(), {
              decimals: 6,
              symbol: 'TOKEN',
            });
          }
        }),
      );

      return records
        .map((record) => {
          const info = tokenInfoMap.get(record.token.toLowerCase()) ?? {
            decimals: 6,
            symbol: 'TOKEN',
          };
          return {
            ...record,
            tokenSymbol: info.symbol,
            tokenDecimals: info.decimals,
          };
        })
        .sort((a, b) => Number(b.id - a.id));
    },
  });

  return {
    warranties: query.data ?? [],
    isLoading: Boolean(contractAddress && connectedAddress) && query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
    isConfigured: Boolean(contractAddress),
  };
}

export function useWarrantyDetail(warrantyIdRaw: string | undefined) {
  const contractAddress = ENV_CONFIG.contractAddress;
  const publicClient = usePublicClient({ chainId: ARC_CHAIN_ID });
  const { address: connectedAddress } = useAccount();
  const { data: abiState } = useDeployedContractAbi();
  const activeAbi: Abi = (abiState?.abi ?? WARRANTY_VAULT_FALLBACK_ABI) as Abi;

  const parsedId = useMemo(() => {
    if (!warrantyIdRaw || !/^\d+$/.test(warrantyIdRaw)) return null;
    try {
      return BigInt(warrantyIdRaw);
    } catch {
      return null;
    }
  }, [warrantyIdRaw]);

  const query = useQuery({
    queryKey: [
      'warranty-detail',
      contractAddress ?? 'unconfigured',
      parsedId?.toString() ?? 'invalid',
      connectedAddress ?? 'disconnected',
      abiState?.source ?? 'baseline',
    ],
    enabled: Boolean(contractAddress && connectedAddress && publicClient && parsedId !== null),
    queryFn: async (): Promise<WarrantyWithToken | null> => {
      if (!contractAddress || !publicClient || parsedId === null) return null;
      const getWarrantyFn = resolveVaultFunction(activeAbi, 'getWarranty');
      if (!getWarrantyFn) return null;

      const raw = await publicClient.readContract({
        address: contractAddress,
        abi: activeAbi,
        functionName: getWarrantyFn.functionName,
        args: [parsedId],
      });

      const record = normalizeWarrantyResult(raw, parsedId);
      if (
        !record ||
        record.seller === '0x0000000000000000000000000000000000000000'
      ) {
        return null;
      }

      let decimals = 6;
      let symbol = 'TOKEN';
      try {
        const [d, s] = await Promise.all([
          publicClient.readContract({
            address: record.token,
            abi: erc20Abi,
            functionName: 'decimals',
          }),
          publicClient.readContract({
            address: record.token,
            abi: erc20Abi,
            functionName: 'symbol',
          }),
        ]);
        decimals = Number(d);
        symbol = String(s);
      } catch {
        // Keep defaults if token metadata read fails
      }

      return {
        ...record,
        tokenDecimals: decimals,
        tokenSymbol: symbol,
      };
    },
  });

  return {
    warranty: query.data ?? null,
    parsedId,
    isLoading: Boolean(contractAddress && connectedAddress && parsedId !== null) && query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
    isConfigured: Boolean(contractAddress),
  };
}

export function extractWalletError(err: unknown): string {
  if (!err) return 'Transaction failed.';
  if (typeof err === 'object') {
    const e = err as { shortMessage?: string; message?: string };
    if (e.shortMessage) return e.shortMessage;
    if (e.message) return e.message.split('\n')[0];
  }
  return 'Transaction failed.';
}

export function useVaultTransaction(onConfirmed?: () => void) {
  const { writeContractAsync } = useWriteContract();
  const { data: abiState } = useDeployedContractAbi();
  const activeAbi: Abi = (abiState?.abi ?? WARRANTY_VAULT_FALLBACK_ABI) as Abi;

  const [phase, setPhase] = useState<TxLifecyclePhase>('idle');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionLabel, setActionLabel] = useState<string>('');

  const receiptQuery = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: ARC_CHAIN_ID,
    query: {
      enabled: Boolean(txHash),
    },
  });

  useEffect(() => {
    if (receiptQuery.isSuccess && phase === 'confirming') {
      setPhase('confirmed');
      onConfirmed?.();
    } else if (receiptQuery.isError && phase === 'confirming') {
      setPhase('error');
      setErrorMessage(extractWalletError(receiptQuery.error));
    }
  }, [receiptQuery.isSuccess, receiptQuery.isError, receiptQuery.error, phase, onConfirmed]);

  const reset = useCallback(() => {
    setPhase('idle');
    setTxHash(undefined);
    setErrorMessage(null);
    setActionLabel('');
  }, []);

  const executeErc20Approve = useCallback(
    async (tokenAddress: `0x${string}`, amount: bigint) => {
      const spender = ENV_CONFIG.contractAddress;
      if (!spender) {
        setPhase('error');
        setErrorMessage('Vault contract address is not configured.');
        return;
      }
      setActionLabel('Token approval');
      setErrorMessage(null);
      setTxHash(undefined);
      setPhase('pending');

      try {
        const hash = await writeContractAsync({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'approve',
          args: [spender, amount],
          chainId: ARC_CHAIN_ID,
        });
        setTxHash(hash);
        setPhase('confirming');
      } catch (err) {
        setPhase('error');
        setErrorMessage(extractWalletError(err));
      }
    },
    [writeContractAsync],
  );

  const executeVaultAction = useCallback(
    async (
      action: VaultActionKey,
      label: string,
      args: readonly unknown[],
    ) => {
      const contractAddress = ENV_CONFIG.contractAddress;
      if (!contractAddress) {
        setPhase('error');
        setErrorMessage('Vault contract address is not configured.');
        return;
      }

      const resolved = resolveVaultFunction(activeAbi, action);
      if (!resolved) {
        setPhase('error');
        setErrorMessage(`Contract method for ${label} was not found in the deployed ABI.`);
        return;
      }

      setActionLabel(label);
      setErrorMessage(null);
      setTxHash(undefined);
      setPhase('pending');

      try {
        const hash = await writeContractAsync({
          address: contractAddress,
          abi: activeAbi,
          functionName: resolved.functionName,
          args: [...args],
          chainId: ARC_CHAIN_ID,
        });
        setTxHash(hash);
        setPhase('confirming');
      } catch (err) {
        setPhase('error');
        setErrorMessage(extractWalletError(err));
      }
    },
    [activeAbi, writeContractAsync],
  );

  return {
    phase,
    txHash,
    errorMessage,
    actionLabel,
    activeAbi,
    reset,
    executeErc20Approve,
    executeVaultAction,
  };
}
