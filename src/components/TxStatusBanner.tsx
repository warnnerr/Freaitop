import { ExternalLink } from 'lucide-react';
import { ENV_CONFIG } from '../config/env';
import type { TxLifecyclePhase } from '../hooks/useWarrantyVault';
import { getExplorerTxUrl } from '../utils/warranty';

interface TxStatusBannerProps {
  phase: TxLifecyclePhase;
  actionLabel: string;
  txHash?: `0x${string}`;
  errorMessage?: string | null;
  onDismiss?: () => void;
}

export function TxStatusBanner({
  phase,
  actionLabel,
  txHash,
  errorMessage,
  onDismiss,
}: TxStatusBannerProps) {
  if (phase === 'idle') return null;

  const explorerLink = txHash ? getExplorerTxUrl(ENV_CONFIG.explorerUrl, txHash) : null;

  const containerStyle =
    phase === 'confirmed'
      ? 'bg-[#EEF6F1] border-[#BBDAC6]'
      : phase === 'error'
        ? 'bg-[#FDF6F6] border-[#DFB9B9]'
        : 'bg-[#EEF3F9] border-[#C5D5E8]';

  const statusText =
    phase === 'pending'
      ? 'Confirm in wallet'
      : phase === 'confirming'
        ? 'Confirming on Arc'
        : phase === 'confirmed'
          ? 'Confirmed'
          : 'Transaction failed';

  const detailText =
    phase === 'pending'
      ? `${actionLabel} is waiting for your wallet signature.`
      : phase === 'confirming'
        ? `${actionLabel} was submitted to Arc and is waiting for block confirmation.`
        : phase === 'confirmed'
          ? `${actionLabel} settled on Arc.`
          : errorMessage || `${actionLabel} could not be completed.`;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`border rounded-xl p-4 ${containerStyle}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[#1C2B3B]">
            {statusText}
          </p>
          <p className="text-sm text-[#1C2B3B] mt-1">{detailText}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {explorerLink && (
            <a
              href={explorerLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1C2B3B] underline underline-offset-4 hover:text-[#2A5C8F] whitespace-nowrap"
            >
              <span>View on Arcscan</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          )}
          {(phase === 'confirmed' || phase === 'error') && onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="px-3 py-1.5 text-xs font-semibold text-[#1C2B3B] bg-white border border-[#D7E0EB] rounded-md hover:bg-[#F3F6FA] transition-colors whitespace-nowrap"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
