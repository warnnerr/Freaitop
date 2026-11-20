import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { NetworkGuard } from '../components/NetworkGuard';
import { StatusIndicator } from '../components/StatusIndicator';
import { TxStatusBanner } from '../components/TxStatusBanner';
import { WalletGate } from '../components/WalletGate';
import { ENV_CONFIG } from '../config/env';
import { buildResolveClaimArgs, resolveVaultFunction } from '../contracts/abiFetcher';
import { useRoleWarranties, useVaultTransaction } from '../hooks/useWarrantyVault';
import {
  addressesMatch,
  canResolveClaim,
  deriveDisplayStatus,
  formatTokenAmount,
  formatUtcDate,
  shortenAddress,
} from '../utils/warranty';

type DeskTab = 'claims' | 'active' | 'resolved';

export function VerifierDeskPage() {
  const { address, isConnected } = useAccount();
  const { warranties, isLoading, isError, refetch } = useRoleWarranties(address);
  const [tab, setTab] = useState<DeskTab>('claims');

  const tx = useVaultTransaction(() => {
    refetch();
  });

  const nowSeconds = Math.floor(Date.now() / 1000);

  const assignedToVerifier = useMemo(
    () => warranties.filter((w) => addressesMatch(w.verifier, address)),
    [warranties, address],
  );

  const filteredList = useMemo(() => {
    return assignedToVerifier.filter((w) => {
      if (tab === 'claims') return w.status === 'Claimed';
      if (tab === 'active') return w.status === 'Active';
      return (
        w.status === 'Approved' ||
        w.status === 'Rejected' ||
        w.status === 'Reclaimed' ||
        w.status === 'Expired'
      );
    });
  }, [assignedToVerifier, tab]);

  if (!isConnected || !address) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 md:py-16">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#1C2B3B]">
            Verifier desk
          </h1>
          <p className="mt-2 text-base text-[#4E6176]">
            Review buyer claims and resolve payouts assigned to your wallet.
          </p>
        </div>
        <WalletGate
          heading="Connect your verifier wallet"
          description="The Verifier Desk only displays claims assigned to the currently connected wallet on Arc."
        />
      </div>
    );
  }

  const isBusy = tx.phase === 'pending' || tx.phase === 'confirming';

  const handleResolve = async (warrantyId: bigint, approve: boolean) => {
    const actionKey = approve ? 'approveClaim' : 'rejectClaim';
    const resolved = resolveVaultFunction(tx.activeAbi, actionKey);
    const args = resolved
      ? buildResolveClaimArgs(resolved.fn, warrantyId, approve)
      : [warrantyId];
    await tx.executeVaultAction(
      actionKey,
      approve ? `Approve claim #${warrantyId.toString()}` : `Reject claim #${warrantyId.toString()}`,
      args,
    );
  };

  const openClaimCount = assignedToVerifier.filter((w) => w.status === 'Claimed').length;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 md:py-12">
      <NetworkGuard />

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1C2B3B]">
            Verifier desk
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[#3E5066]">
            Claims assigned exclusively to{' '}
            <span className="font-mono text-[#1C2B3B]">{shortenAddress(address)}</span>
          </p>
        </div>
        <p className="text-sm font-medium text-[#4E6176] tabular-nums">
          {openClaimCount} {openClaimCount === 1 ? 'claim' : 'claims'} awaiting decision
        </p>
      </div>

      <div className="mb-6">
        <div
          role="tablist"
          aria-label="Verifier queue tabs"
          className="inline-flex items-center gap-1 p-1 bg-[#E8EEF5] rounded-lg"
        >
          {(
            [
              { id: 'claims', label: 'Open claims' },
              { id: 'active', label: 'Active coverage' },
              { id: 'resolved', label: 'Resolved' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                tab === item.id
                  ? 'bg-white text-[#1C2B3B] shadow-xs'
                  : 'text-[#4E6176] hover:text-[#1C2B3B]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tx.phase !== 'idle' && (
        <div className="mb-6">
          <TxStatusBanner
            phase={tx.phase}
            actionLabel={tx.actionLabel}
            txHash={tx.txHash}
            errorMessage={tx.errorMessage}
            onDismiss={tx.reset}
          />
        </div>
      )}

      {!ENV_CONFIG.contractAddress ? (
        <div className="bg-white border border-[#D7E0EB] rounded-xl p-10 text-center">
          <h2 className="text-lg font-semibold text-[#1C2B3B]">
            Vault contract not configured
          </h2>
          <p className="mt-2 text-sm text-[#4E6176] max-w-md mx-auto">
            Set <code className="font-mono text-xs">VITE_CONTRACT_ADDRESS</code> to load claims assigned to your verifier address.
          </p>
        </div>
      ) : isLoading ? (
        <div className="bg-white border border-[#D7E0EB] rounded-xl p-8 space-y-4 animate-pulse">
          <div className="h-5 w-48 bg-[#E8EEF5] rounded" />
          <div className="h-24 w-full bg-[#F8FAFC] rounded" />
        </div>
      ) : isError ? (
        <div className="bg-white border border-[#D7E0EB] rounded-xl p-8 text-center">
          <p className="text-sm font-semibold text-[#1C2B3B]">
            Unable to load verifier assignments right now.
          </p>
          <button
            type="button"
            onClick={refetch}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#1C2B3B] rounded-lg hover:bg-[#14202D]"
          >
            Retry
          </button>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white border border-[#D7E0EB] rounded-xl p-10 text-center">
          <h2 className="text-lg font-semibold text-[#1C2B3B]">
            {tab === 'claims'
              ? 'No open claims assigned to this wallet'
              : tab === 'active'
                ? 'No active warranties assigned to this wallet'
                : 'No resolved warranties yet'}
          </h2>
          <p className="mt-2 text-sm text-[#4E6176] max-w-md mx-auto">
            Warranties only appear here when your connected wallet address is named as the verifier on-chain.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map((w) => {
            const displayStatus = deriveDisplayStatus(w, nowSeconds);
            const resolvable = canResolveClaim(w, address);
            return (
              <article
                key={w.id.toString()}
                className="bg-white border border-[#D7E0EB] rounded-xl p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-[#4E6176]">
                        #{w.id.toString()}
                      </span>
                      <StatusIndicator status={displayStatus} />
                    </div>
                    <h2 className="mt-2 text-lg font-semibold text-[#1C2B3B]">
                      {w.productRef}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#4E6176]">
                      <span>
                        Buyer{' '}
                        <span className="font-mono text-[#1C2B3B]">
                          {shortenAddress(w.buyer)}
                        </span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Seller{' '}
                        <span className="font-mono text-[#1C2B3B]">
                          {shortenAddress(w.seller)}
                        </span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Expires {formatUtcDate(w.expiresAt)}</span>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-xs text-[#4E6176]">Locked deposit</p>
                    <p className="mt-0.5 text-xl font-bold font-mono tabular-nums text-[#1C2B3B]">
                      {formatTokenAmount(w.deposit, w.tokenDecimals)} {w.tokenSymbol}
                    </p>
                  </div>
                </div>

                {w.evidenceRef && (
                  <div className="mt-4 pt-4 border-t border-[#E6ECF3]">
                    <p className="text-xs font-medium text-[#4E6176]">
                      Buyer evidence reference
                    </p>
                    <p className="mt-1 text-sm font-mono text-[#1C2B3B] bg-[#F8FAFC] border border-[#D7E0EB] rounded-lg px-3 py-2 break-all">
                      {w.evidenceRef}
                    </p>
                  </div>
                )}

                <div className="mt-5 pt-4 border-t border-[#E6ECF3] flex flex-wrap items-center justify-between gap-3">
                  <Link
                    to={`/warranties/${w.id.toString()}`}
                    className="text-xs font-semibold text-[#2A5C8F] hover:text-[#1C2B3B] underline underline-offset-4"
                  >
                    Open full warranty record
                  </Link>

                  {resolvable && (
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleResolve(w.id, true)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#1C2B3B] rounded-lg hover:bg-[#14202D] disabled:opacity-60 transition-colors"
                      >
                        Approve refund
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleResolve(w.id, false)}
                        className="px-4 py-2 text-xs font-semibold text-[#1C2B3B] bg-white border border-[#C9D5E3] rounded-lg hover:bg-[#F3F6FA] disabled:opacity-60 transition-colors"
                      >
                        Reject claim
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
