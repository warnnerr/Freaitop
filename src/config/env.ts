import { isAddress } from 'viem';

const rawContract = (import.meta.env.VITE_CONTRACT_ADDRESS ?? '').trim();
const rawWalletConnectId = (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? '').trim();
const rawAdminWallet = (import.meta.env.VITE_ADMIN_WALLET ?? '').trim();
const rawRpcUrl = (import.meta.env.VITE_ARC_RPC_URL ?? '').trim();
const rawExplorerUrl = (import.meta.env.VITE_ARC_EXPLORER_URL ?? '').trim();

function isConfiguredPlaceholder(val: string): boolean {
  return !val || (val.startsWith('[') && val.endsWith(']'));
}

export const ENV_CONFIG = {
  contractAddress:
    !isConfiguredPlaceholder(rawContract) && isAddress(rawContract)
      ? (rawContract as `0x${string}`)
      : undefined,
  walletConnectProjectId: !isConfiguredPlaceholder(rawWalletConnectId)
    ? rawWalletConnectId
    : undefined,
  adminWallet:
    !isConfiguredPlaceholder(rawAdminWallet) && isAddress(rawAdminWallet)
      ? (rawAdminWallet as `0x${string}`)
      : undefined,
  rpcUrl: !isConfiguredPlaceholder(rawRpcUrl)
    ? rawRpcUrl
    : 'https://rpc.testnet.arc.network',
  explorerUrl: (!isConfiguredPlaceholder(rawExplorerUrl)
    ? rawExplorerUrl
    : 'https://testnet.arcscan.app'
  ).replace(/\/+$/, ''),
} as const;
