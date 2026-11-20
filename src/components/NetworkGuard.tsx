import { useAccount, useSwitchChain } from 'wagmi';
import { ARC_CHAIN_ID } from '../config/arc';

export function NetworkGuard() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected || chainId === ARC_CHAIN_ID) {
    return null;
  }

  return (
    <div
      role="alert"
      className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-[#1C2B3B] rounded-xl px-5 py-4"
    >
      <div>
        <p className="text-sm font-semibold text-[#1C2B3B]">
          Wrong network selected
        </p>
        <p className="text-sm text-[#4E6176] mt-0.5">
          Freaitop operates on Arc (Chain ID 5042002). Switch networks in your wallet to continue.
        </p>
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => switchChain({ chainId: ARC_CHAIN_ID })}
        className="px-4 py-2 text-sm font-semibold text-white bg-[#1C2B3B] rounded-lg hover:bg-[#14202D] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
      >
        {isPending ? 'Switching...' : 'Switch to Arc'}
      </button>
    </div>
  );
}
