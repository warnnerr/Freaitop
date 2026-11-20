import { defineChain } from 'viem';
import { ENV_CONFIG } from './env';

export const ARC_CHAIN_ID = 5042002;

export const arcChain = defineChain({
  id: ARC_CHAIN_ID,
  name: 'Arc',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [ENV_CONFIG.rpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arcscan',
      url: ENV_CONFIG.explorerUrl,
    },
  },
});

export interface KnownToken {
  symbol: string;
  name: string;
  address: `0x${string}`;
}

export const KNOWN_TOKENS: readonly KnownToken[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x3600000000000000000000000000000000000000',
  },
  {
    symbol: 'EURC',
    name: 'Euro Coin',
    address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
  },
] as const;
