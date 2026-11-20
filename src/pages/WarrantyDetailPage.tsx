import { useState, type FormEvent } from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { NetworkGuard } from '../components/NetworkGuard';
import { StatusIndicator } from '../components/StatusIndicator';
import { TxStatusBanner } from '../components/TxStatusBanner';
import { WalletGate } from '../components/WalletGate';
import { ENV_CONFIG } from '../config/env';
import { buildResolveClaimArgs, resolveVaultFunction } from '../contracts/abiFetcher';
import { useVaultTransaction, useWarrantyDetail } from '../hooks/useWarrantyVault';
import {
  canFileClaim,
  canReclaimDeposit,
  canResolveClaim,
  deriveDisplayStatus,
  formatRemainingPeriod,
  formatTokenAmount,
  formatUtcDate,
  getExplorerAddressUrl,
  getParticipantRoles,
  validateClaimInput,
} from '../utils/warranty';

export function WarrantyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { address, isConnected } = useAccount();
  const { warranty, parsedId, isLoading, isError, refetch, isConfigured } =
    useWarrantyDetail(id);

  const [evidenceRef, setEvidenceRef] = useState('');
  const [claimError, setClaimError] = useState<string | null>(null);

  const tx = useVaultTransaction(() => {
    refetch();
  });

  if (!isConnected || !address) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 md:py-16">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#1C2B3B]">
            Warranty details
          </h1>
          <p className="mt-2 text-base text-[#4E6176]">
            Connect your wallet to inspect this warranty and execute participant actions.
          </p>
        </div>
        <WalletGate
          heading="Connect your wallet to open this warranty"
          description="Only connected wallets can view record actions for buyers, sellers, and verifiers on Arc."
        />
      </div>
    );
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const isBusy = tx.phase === 'pending' || tx.phase === 'confirming';

  const handleFileClaim = async (e: FormEvent) => {
    e.preventDefault();
    if (!warranty) return;
    const validation = validateClaimInput(evidenceRef);
    if (!validation.valid) {
      setClaimError(validation.errors.evidenceRef);
      return;
    }
    setClaimError(null);
    await tx.executeVaultAction('fileClaim', 'File warranty claim', [
      warranty.id,
      evidenceRef.trim(),
    ]);
  };

  const handleResolveClaim = async (approve: boolean) => {
    if (!warranty) return;
    const actionKey = approve ? 'approveClaim' : 'rejectClaim';
    const resolved = resolveVaultFunction(tx.activeAbi, actionKey);
    const args = resolved
      ? buildResolveClaimArgs(resolved.fn, warranty.id, approve)
      : [warranty.id];
    await tx.executeVaultAction(
      actionKey,
      approve ? 'Approve refund claim' : 'Reject claim',
      args,
    );
  };

  const handleReclaimDeposit = async () => {
    if (!warranty) return;
    await tx.executeVaultAction('reclaimDeposit', 'Reclaim seller deposit', [
      warranty.id,
    ]);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 md:py-12">
      <NetworkGuard />

      <div className="mb-6">
        <Link
          to="/warranties"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4E6176] hover:text-[#1C2B3B] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to My Warranties</span>
        </Link>
      </div>

      {!isConfigured ? (
        <div className="bg-white border border-[#D7E0EB] rounded-xl p-8 text-center">
          <h1 className="text-xl font-bold text-[#1C2B3B]">
            Vault contract not configured
          </h1>
          <p className="mt-2 text-sm text-[#4E6176]">
            Configure <code className="font-mono text-xs">VITE_CONTRACT_ADDRESS</code> to load warranty records from Arc.
          </p>
        </div>
      ) : parsedId === null ? (
        <div className="bg-white border border-[#D7E0EB] rounded-xl p-8 text-center">
          <h1 className="text-xl font-bold text-[#1C2B3B]">Invalid warranty ID</h1>
          <p className="mt-2 text-sm text-[#4E6176]">
            Warranty IDs must be non-negative whole numbers.
          </p>
        </div>
      ) : isLoading ? (
        <div className="bg-white border border-[#D7E0EB] rounded-xl p-8 space-y-4 animate-pulse">
          <div className="h-6 w-48 bg-[#E8EEF5] rounded" />
          <div className="h-4 w-72 bg-[#F1F5F9] rounded" />
          <div className="h-32 w-full bg-[#F8FAFC] rounded" />
        </div>
      ) : isError || !warranty ? (
        <div className="bg-white border border-[#D7E0EB] rounded-xl p-8 text-center">
          <h1 className="text-xl font-bold text-[#1C2B3B]">
            Warranty #{parsedId.toString()} not found
          </h1>
          <p className="mt-2 text-sm text-[#4E6176]">
            No warranty record exists on Arc for this identifier.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="bg-white border border-[#D7E0EB] rounded-xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-[#E6ECF3]">
              <div>
                <p className="text-xs font-mono text-[#4E6176]">
                  Warranty #{warranty.id.toString()}
                </p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[#1C2B3B]">
                  Warranty details
                </h1>
                <p className="mt-1.5 text-base font-medium text-[#3E5066]">
                  {warranty.productRef}
                </p>
              </div>
              <div className="flex flex-col sm:items-end gap-2">
                <StatusIndicator status={deriveDisplayStatus(warranty, nowSeconds)} />
                <span className="text-xs text-[#4E6176]">
                  {formatRemainingPeriod(warranty.expiresAt, nowSeconds)}
                </span>
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 pt-6 text-sm">
              <div>
                <dt className="text-xs font-medium text-[#4E6176]">Locked deposit</dt>
                <dd className="mt-1 text-xl font-bold font-mono tabular-nums text-[#1C2B3B]">
                  {formatTokenAmount(warranty.deposit, warranty.tokenDecimals)}{' '}
                  {warranty.tokenSymbol}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[#4E6176]">Your role</dt>
                <dd className="mt-1 text-sm font-semibold text-[#1C2B3B]">
                  {getParticipantRoles(warranty, address).join(', ') || 'Observer'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[#4E6176]">Created on</dt>
                <dd className="mt-1 text-sm text-[#1C2B3B] tabular-nums">
                  {formatUtcDate(warranty.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[#4E6176]">Coverage ends</dt>
                <dd className="mt-1 text-sm text-[#1C2B3B] tabular-nums">
                  {formatUtcDate(warranty.expiresAt)}
                </dd>
              </div>

              {(
                [
                  { label: 'Seller', addr: warranty.seller },
                  { label: 'Buyer', addr: warranty.buyer },
                  { label: 'Verifier', addr: warranty.verifier },
                  { label: 'Token contract', addr: warranty.token },
                ] as const
              ).map((row) => (
                <div key={row.label} className="sm:col-span-1">
                  <dt className="text-xs font-medium text-[#4E6176]">{row.label}</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-xs text-[#1C2B3B] break-all">
                      {row.addr}
                    </span>
                    <a
                      href={getExplorerAddressUrl(ENV_CONFIG.explorerUrl, row.addr)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View ${row.label} on Arcscan`}
                      className="text-[#4E6176] hover:text-[#1C2B3B] shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  </dd>
                </div>
              ))}
            </dl>

            {warranty.evidenceRef && (
              <div className="mt-6 pt-6 border-t border-[#E6ECF3]">
                <p className="text-xs font-medium text-[#4E6176]">
                  Submitted claim evidence reference
                </p>
                <p className="mt-1.5 text-sm font-mono text-[#1C2B3B] bg-[#F8FAFC] border border-[#D7E0EB] rounded-lg p-3 break-all">
                  {warranty.evidenceRef}
                </p>
              </div>
            )}
          </section>

          <TxStatusBanner
            phase={tx.phase}
            actionLabel={tx.actionLabel}
            txHash={tx.txHash}
            errorMessage={tx.errorMessage}
            onDismiss={tx.reset}
          />

          {canFileClaim(warranty, address, nowSeconds) && (
            <section className="bg-white border border-[#D7E0EB] rounded-xl p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-[#1C2B3B]">
                File a warranty claim
              </h2>
              <p className="mt-1.5 text-sm text-[#3E5066]">
                Submit an evidence reference for the verifier to review. Once filed, the seller cannot reclaim the deposit until the verifier resolves your claim.
              </p>
              <form onSubmit={handleFileClaim} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="claim-evidence-ref"
                    className="block text-sm font-semibold text-[#1C2B3B] mb-1.5"
                  >
                    Evidence reference
                  </label>
                  <input
                    id="claim-evidence-ref"
                    type="text"
                    value={evidenceRef}
                    onChange={(e) => setEvidenceRef(e.target.value)}
                    placeholder="ipfs://..., HTTPS inspection report, or SHA-256 hash"
                    className="w-full px-3.5 py-2.5 text-sm font-mono text-[#1C2B3B] bg-[#F8FAFC] border border-[#C9D5E3] rounded-lg focus:bg-white focus:border-[#1C2B3B] focus:outline-none"
                  />
                  {claimError && (
                    <p className="mt-1.5 text-xs font-medium text-[#1C2B3B] bg-[#FDF6F6] border border-[#DFB9B9] rounded px-2.5 py-1">
                      {claimError}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-[#1C2B3B] rounded-lg hover:bg-[#14202D] disabled:opacity-60 transition-colors"
                >
                  {isBusy ? 'Submitting transaction...' : 'File claim'}
                </button>
              </form>
            </section>
          )}

          {canResolveClaim(warranty, address) && (
            <section className="bg-white border border-[#D7E0EB] rounded-xl p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-[#1C2B3B]">
                Resolve open claim
              </h2>
              <p className="mt-1.5 text-sm text-[#3E5066]">
                As the designated verifier, approving transfers the locked deposit to the buyer. Rejecting marks the claim invalid so the seller can reclaim after expiry.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleResolveClaim(true)}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-[#1C2B3B] rounded-lg hover:bg-[#14202D] disabled:opacity-60 transition-colors"
                >
                  Approve refund
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleResolveClaim(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-[#1C2B3B] bg-white border border-[#C9D5E3] rounded-lg hover:bg-[#F3F6FA] disabled:opacity-60 transition-colors"
                >
                  Reject claim
                </button>
              </div>
            </section>
          )}

          {canReclaimDeposit(warranty, address, nowSeconds) && (
            <section className="bg-white border border-[#D7E0EB] rounded-xl p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-[#1C2B3B]">
                Reclaim unlocked deposit
              </h2>
              <p className="mt-1.5 text-sm text-[#3E5066]">
                The warranty period has ended with no open claim. You may withdraw your deposit back to your seller wallet.
              </p>
              <div className="mt-5">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleReclaimDeposit()}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-[#1C2B3B] rounded-lg hover:bg-[#14202D] disabled:opacity-60 transition-colors"
                >
                  {isBusy ? 'Submitting transaction...' : 'Reclaim deposit'}
                </button>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
