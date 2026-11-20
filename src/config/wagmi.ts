import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { arcChain } from './arc';
import { ENV_CONFIG } from './env';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Wallets',
      wallets: ENV_CONFIG.walletConnectProjectId
        ? [injectedWallet, metaMaskWallet, coinbaseWallet, walletConnectWallet]
        : [injectedWallet],
    },
  ],
  {
    appName: 'Freaitop',
    projectId: ENV_CONFIG.walletConnectProjectId ?? '00000000000000000000000000000000',
  },
);

export const wagmiConfig = createConfig({
  connectors,
  chains: [arcChain],
  transports: {
    [arcChain.id]: http(ENV_CONFIG.rpcUrl),
  },
  ssr: false,
});
