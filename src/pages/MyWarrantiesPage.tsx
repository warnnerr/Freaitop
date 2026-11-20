import { useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { NetworkGuard } from '../components/NetworkGuard';
import { StatusIndicator } from '../components/StatusIndicator';
import { WalletGate } from '../components/WalletGate';
import { ENV_CONFIG } from '../config/env';
import { useRoleWarranties } from '../hooks/useWarrantyVault';
import {
  addressesMatch,
  deriveDisplayStatus,
  formatTokenAmount,
  formatUtcDate,
  getParticipantRoles,
  shortenAddress,
} from '../utils/warranty';

type RoleFilter = 'all' | 'buyer' | 'seller' | 'verifier';

export function MyWarrantiesPage() {
  const { address, isConnected } = useAccount();
  const { warranties, isLoading, isError, refetch } = useRoleWarranties(address);

  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const nowSeconds = Math.floor(Date.now() / 1000);

  const filteredWarranties = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return warranties.filter((w) => {
      if (roleFilter === 'buyer' && !addressesMatch(w.buyer, address)) return false;
      if (roleFilter === 'seller' && !addressesMatch(w.seller, address)) return false;
      if (roleFilter === 'verifier' && !addressesMatch(w.verifier, address)) return false;

      if (!q) return true;
      return (
        w.id.toString().includes(q) ||
        w.productRef.toLowerCase().includes(q) ||
        w.buyer.toLowerCase().includes(q) ||
        w.seller.toLowerCase().includes(q) ||
        w.verifier.toLowerCase().includes(q)
      );
    });
  }, [warranties, roleFilter, searchQuery, address]);

  if (!isConnected || !address) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 md:py-16">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#1C2B3B]">
            My warranties
          </h1>
          <p className="mt-2 text-base text-[#4E6176]">
            View warranties where your connected wallet is buyer, seller, or verifier.
          </p>
        </div>
        <WalletGate
          heading="Connect your wallet to view your warranties"
          description="Freaitop only displays warranty records linked to the wallet currently connected in your browser."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 md:py-12">
      <NetworkGuard />

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1C2B3B]">
            My warranties
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[#3E5066]">
            Showing records read on Arc for{' '}
            <span className="font-mono text-[#1C2B3B]">{shortenAddress(address)}</span>
          </p>
        </div>
        <Link
          to="/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#1C2B3B] rounded-lg hover:bg-[#14202D] transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <span>Create a warranty</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div
          role="tablist"
          aria-label="Filter warranties by role"
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#E8EEF5] rounded-lg self-start"
        >
          {(
            [
              { id: 'all', label: 'All roles' },
              { id: 'buyer', label: 'As buyer' },
              { id: 'seller', label: 'As seller' },
              { id: 'verifier', label: 'As verifier' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={roleFilter === tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                roleFilter === tab.id
                  ? 'bg-white text-[#1C2B3B] shadow-xs'
                  : 'text-[#4E6176] hover:text-[#1C2B3B]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search
            className="w-4 h-4 text-[#4E6176] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by ID, product, or address"
            aria-label="Filter warranties"
            className="w-full pl-9 pr-3.5 py-2 text-sm text-[#1C2B3B] bg-white border border-[#D7E0EB] rounded-lg focus:border-[#1C2B3B] focus:outline-none"
          />
        </div>
      </div>

      {!ENV_CONFIG.contractAddress ? (
        <div className="bg-white border border-[#D7E0EB] rounded-xl p-10 text-center">
          <h2 className="text-lg font-semibold text-[#1C2B3B]">
            Vault contract not configured
          </h2>
          <p className="mt-2 text-sm text-[#4E6176] max-w-md mx-auto">
            Set <code className="font-mono text-xs">VITE_CONTRACT_ADDRESS</code> to read warranties stored on Arc for your connected wallet.
          </p>
        </div>
      ) : isLoading ? (
        <div className="bg-white border border-[#D7E0EB] rounded-xl divide-y divide-[#E6ECF3]">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="p-5 flex items-center justify-between gap-4 animate-pulse">
              <div className="space-y-2">
                <div className="h-4 w-48 bg-[#E8EEF5] rounded" />
                <div className="h-3 w-72 bg-[#F1F5F9] rounded" />
              </div>
              <div className="h-6 w-20 bg-[#E8EEF5] rounded" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="bg-white border border-[#D7E0EB] rounded-xl p-8 text-center">
          <p className="text-sm font-semibold text-[#1C2B3B]">
            Unable to load warranties from Arc right now.
          </p>
          <button
            type="button"
            onClick={refetch}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#1C2B3B] rounded-lg hover:bg-[#14202D]"
          >
            Retry
          </button>
        </div>
      ) : filteredWarranties.length === 0 ? (
        <div className="bg-white border border-[#D7E0EB] rounded-xl p-10 text-center">
          <h2 className="text-lg font-semibold text-[#1C2B3B]">
            {warranties.length === 0
              ? 'No warranties found for this wallet'
              : 'No warranties match your filter'}
          </h2>
          <p className="mt-2 text-sm text-[#4E6176] max-w-md mx-auto">
            {warranties.length === 0
              ? 'When you lock a deposit as a seller, receive coverage as a buyer, or are assigned as a verifier, your warranties will appear here.'
              : 'Try clearing the search box or switching role tabs.'}
          </p>
          {warranties.length === 0 && (
            <div className="mt-6">
              <Link
                to="/create"
                className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-white bg-[#1C2B3B] rounded-lg hover:bg-[#14202D]"
              >
                Create your first warranty
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#D7E0EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#D7E0EB] bg-[#F8FAFC] text-xs font-semibold text-[#4E6176]">
                  <th className="py-3.5 px-5">ID</th>
                  <th className="py-3.5 px-5">Product reference</th>
                  <th className="py-3.5 px-5">Your role</th>
                  <th className="py-3.5 px-5 text-right">Deposit</th>
                  <th className="py-3.5 px-5">Expires</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6ECF3] text-sm">
                {filteredWarranties.map((w) => {
                  const status = deriveDisplayStatus(w, nowSeconds);
                  const roles = getParticipantRoles(w, address);
                  return (
                    <tr key={w.id.toString()} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-4 px-5 font-mono text-xs text-[#4E6176] tabular-nums">
                        #{w.id.toString()}
                      </td>
                      <td className="py-4 px-5 font-medium text-[#1C2B3B] max-w-xs truncate">
                        {w.productRef || 'Untitled item'}
                      </td>
                      <td className="py-4 px-5 text-xs text-[#4E6176]">
                        {roles.join(' / ') || 'Participant'}
                      </td>
                      <td className="py-4 px-5 text-right font-mono font-medium text-[#1C2B3B] tabular-nums whitespace-nowrap">
                        {formatTokenAmount(w.deposit, w.tokenDecimals)} {w.tokenSymbol}
                      </td>
                      <td className="py-4 px-5 text-xs text-[#4E6176] tabular-nums whitespace-nowrap">
                        {formatUtcDate(w.expiresAt)}
                      </td>
                      <td className="py-4 px-5">
                        <StatusIndicator status={status} />
                      </td>
                      <td className="py-4 px-5 text-right">
                        <Link
                          to={`/warranties/${w.id.toString()}`}
                          className="text-xs font-semibold text-[#2A5C8F] hover:text-[#1C2B3B] underline underline-offset-4 whitespace-nowrap"
                        >
                          Inspect
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
