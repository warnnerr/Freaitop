import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { KNOWN_TOKENS } from '../config/arc';
import { ENV_CONFIG } from '../config/env';
import { NetworkGuard } from '../components/NetworkGuard';
import { TxStatusBanner } from '../components/TxStatusBanner';
import { WalletGate } from '../components/WalletGate';
import { useTokenMetadata, useVaultTransaction } from '../hooks/useWarrantyVault';
import {
  formatTokenAmount,
  hasSufficientAllowance,
  parseTokenAmount,
  periodDaysToSeconds,
  validateCreateWarrantyInput,
} from '../utils/warranty';

const PERIOD_PRESETS = ['30', '90', '180', '365'] as const;

export function CreateWarrantyPage() {
  const { address, isConnected } = useAccount();

  const [buyer, setBuyer] = useState('');
  const [tokenMode, setTokenMode] = useState<'USDC' | 'EURC' | 'CUSTOM'>('USDC');
  const [customToken, setCustomToken] = useState('');
  const [deposit, setDeposit] = useState('');
  const [periodDays, setPeriodDays] = useState('90');
  const [verifier, setVerifier] = useState('');
  const [productRef, setProductRef] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [lastActionType, setLastActionType] = useState<'approve' | 'create' | null>(null);

  const activeTokenAddress =
    tokenMode === 'USDC'
      ? KNOWN_TOKENS[0].address
      : tokenMode === 'EURC'
        ? KNOWN_TOKENS[1].address
        : customToken.trim();

  const tokenMeta = useTokenMetadata(activeTokenAddress, address);

  const tx = useVaultTransaction(() => {
    tokenMeta.refetch();
  });

  useEffect(() => {
    if (tx.phase === 'confirmed' && lastActionType === 'approve') {
      tokenMeta.refetch();
    }
  }, [tx.phase, lastActionType, tokenMeta]);

  if (!isConnected || !address) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 md:py-16">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#1C2B3B]">
            Create a warranty
          </h1>
          <p className="mt-2 text-base text-[#4E6176]">
            Lock an ERC20 deposit in the vault for a buyer and independent verifier.
          </p>
        </div>
        <WalletGate
          heading="Connect your wallet to create a warranty"
          description="Creating a warranty requires approving your deposit token and locking collateral from your connected Arc wallet."
        />
      </div>
    );
  }

  const parsedDeposit = parseTokenAmount(deposit, tokenMeta.decimals);
  const needsApproval =
    parsedDeposit !== null && !hasSufficientAllowance(tokenMeta.allowance, parsedDeposit);

  const isBusy = tx.phase === 'pending' || tx.phase === 'confirming';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validation = validateCreateWarrantyInput(
      {
        buyer,
        token: activeTokenAddress,
        deposit,
        periodDays,
        verifier,
        productRef,
      },
      tokenMeta.decimals,
      address,
    );

    setFieldErrors(validation.errors);
    if (!validation.valid) return;

    const amountUnits = parseTokenAmount(deposit, tokenMeta.decimals);
    const periodSeconds = periodDaysToSeconds(periodDays);
    if (!amountUnits || !periodSeconds) return;

    if (!ENV_CONFIG.contractAddress) {
      setFieldErrors({
        form: 'Vault contract address is not configured in environment settings.',
      });
      return;
    }

    if (needsApproval) {
      setLastActionType('approve');
      await tx.executeErc20Approve(
        activeTokenAddress as `0x${string}`,
        amountUnits,
      );
      return;
    }

    setLastActionType('create');
    await tx.executeVaultAction('createWarranty', 'Create warranty', [
      buyer.trim() as `0x${string}`,
      activeTokenAddress as `0x${string}`,
      amountUnits,
      periodSeconds,
      verifier.trim() as `0x${string}`,
      productRef.trim(),
    ]);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 md:py-12">
      <NetworkGuard />

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#1C2B3B]">
          Create a warranty
        </h1>
        <p className="mt-2 text-base text-[#3E5066]">
          Lock a token deposit on Arc for the selected warranty period. If the token allowance is below the deposit amount, your first transaction approves the vault.
        </p>
      </div>

      {!ENV_CONFIG.contractAddress && (
        <div className="mb-6 bg-white border border-[#D7E0EB] rounded-xl p-4 text-sm text-[#1C2B3B]">
          Vault contract address is not yet set in <code className="font-mono text-xs">VITE_CONTRACT_ADDRESS</code>. Configure the deployed contract address before submitting on-chain transactions.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="lg:col-span-8 bg-white border border-[#D7E0EB] rounded-xl p-6 sm:p-8 space-y-6"
        >
          <div>
            <label
              htmlFor="warranty-buyer"
              className="block text-sm font-semibold text-[#1C2B3B] mb-1.5"
            >
              Buyer wallet address
            </label>
            <input
              id="warranty-buyer"
              type="text"
              value={buyer}
              onChange={(e) => setBuyer(e.target.value)}
              placeholder="0x..."
              className="w-full px-3.5 py-2.5 text-sm font-mono text-[#1C2B3B] bg-[#F8FAFC] border border-[#C9D5E3] rounded-lg focus:bg-white focus:border-[#1C2B3B] focus:outline-none"
            />
            {fieldErrors.buyer && (
              <p className="mt-1.5 text-xs font-medium text-[#1C2B3B] bg-[#FDF6F6] border border-[#DFB9B9] rounded px-2.5 py-1">
                {fieldErrors.buyer}
              </p>
            )}
          </div>

          <div>
            <span className="block text-sm font-semibold text-[#1C2B3B] mb-2">
              Deposit token
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(['USDC', 'EURC', 'CUSTOM'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTokenMode(mode)}
                  className={`py-2.5 px-3 text-sm font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                    tokenMode === mode
                      ? 'bg-[#1C2B3B] text-white border-[#1C2B3B]'
                      : 'bg-[#F8FAFC] text-[#1C2B3B] border-[#C9D5E3] hover:bg-[#EEF2F7]'
                  }`}
                >
                  {mode === 'CUSTOM' ? 'Custom ERC20' : mode}
                </button>
              ))}
            </div>

            {tokenMode === 'CUSTOM' && (
              <div className="mt-3">
                <label
                  htmlFor="warranty-custom-token"
                  className="block text-xs font-medium text-[#4E6176] mb-1"
                >
                  Token contract address
                </label>
                <input
                  id="warranty-custom-token"
                  type="text"
                  value={customToken}
                  onChange={(e) => setCustomToken(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3.5 py-2.5 text-sm font-mono text-[#1C2B3B] bg-[#F8FAFC] border border-[#C9D5E3] rounded-lg focus:bg-white focus:border-[#1C2B3B] focus:outline-none"
                />
              </div>
            )}

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#4E6176]">
              <span className="font-mono">
                {tokenMeta.isLoading
                  ? 'Reading token decimals...'
                  : tokenMeta.isValidToken
                    ? `${tokenMeta.symbol} · ${tokenMeta.decimals} decimals`
                    : 'Enter a valid ERC20 token on Arc'}
              </span>
              {tokenMeta.isValidToken && (
                <span className="font-mono tabular-nums text-[#1C2B3B]">
                  Balance: {formatTokenAmount(tokenMeta.balance, tokenMeta.decimals)} {tokenMeta.symbol}
                </span>
              )}
            </div>
            {fieldErrors.token && (
              <p className="mt-1.5 text-xs font-medium text-[#1C2B3B] bg-[#FDF6F6] border border-[#DFB9B9] rounded px-2.5 py-1">
                {fieldErrors.token}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="warranty-deposit"
                className="block text-sm font-semibold text-[#1C2B3B] mb-1.5"
              >
                Deposit amount ({tokenMeta.symbol})
              </label>
              <input
                id="warranty-deposit"
                type="text"
                inputMode="decimal"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                placeholder="250.00"
                className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums text-[#1C2B3B] bg-[#F8FAFC] border border-[#C9D5E3] rounded-lg focus:bg-white focus:border-[#1C2B3B] focus:outline-none"
              />
              {fieldErrors.deposit && (
                <p className="mt-1.5 text-xs font-medium text-[#1C2B3B] bg-[#FDF6F6] border border-[#DFB9B9] rounded px-2.5 py-1">
                  {fieldErrors.deposit}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="warranty-period"
                className="block text-sm font-semibold text-[#1C2B3B] mb-1.5"
              >
                Warranty period (days)
              </label>
              <input
                id="warranty-period"
                type="number"
                min={1}
                max={3650}
                value={periodDays}
                onChange={(e) => setPeriodDays(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums text-[#1C2B3B] bg-[#F8FAFC] border border-[#C9D5E3] rounded-lg focus:bg-white focus:border-[#1C2B3B] focus:outline-none"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PERIOD_PRESETS.map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setPeriodDays(days)}
                    className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                      periodDays === days
                        ? 'bg-[#1C2B3B] text-white border-[#1C2B3B]'
                        : 'bg-[#F8FAFC] text-[#4E6176] border-[#D7E0EB] hover:text-[#1C2B3B]'
                    }`}
                  >
                    {days}d
                  </button>
                ))}
              </div>
              {fieldErrors.periodDays && (
                <p className="mt-1.5 text-xs font-medium text-[#1C2B3B] bg-[#FDF6F6] border border-[#DFB9B9] rounded px-2.5 py-1">
                  {fieldErrors.periodDays}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="warranty-verifier"
              className="block text-sm font-semibold text-[#1C2B3B] mb-1.5"
            >
              Verifier wallet address
            </label>
            <input
              id="warranty-verifier"
              type="text"
              value={verifier}
              onChange={(e) => setVerifier(e.target.value)}
              placeholder="0x..."
              className="w-full px-3.5 py-2.5 text-sm font-mono text-[#1C2B3B] bg-[#F8FAFC] border border-[#C9D5E3] rounded-lg focus:bg-white focus:border-[#1C2B3B] focus:outline-none"
            />
            {fieldErrors.verifier && (
              <p className="mt-1.5 text-xs font-medium text-[#1C2B3B] bg-[#FDF6F6] border border-[#DFB9B9] rounded px-2.5 py-1">
                {fieldErrors.verifier}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="warranty-product-ref"
              className="block text-sm font-semibold text-[#1C2B3B] mb-1.5"
            >
              Product reference
            </label>
            <input
              id="warranty-product-ref"
              type="text"
              value={productRef}
              onChange={(e) => setProductRef(e.target.value)}
              placeholder="Serial number, invoice ID, or order reference"
              className="w-full px-3.5 py-2.5 text-sm text-[#1C2B3B] bg-[#F8FAFC] border border-[#C9D5E3] rounded-lg focus:bg-white focus:border-[#1C2B3B] focus:outline-none"
            />
            {fieldErrors.productRef && (
              <p className="mt-1.5 text-xs font-medium text-[#1C2B3B] bg-[#FDF6F6] border border-[#DFB9B9] rounded px-2.5 py-1">
                {fieldErrors.productRef}
              </p>
            )}
          </div>

          {fieldErrors.form && (
            <p className="text-sm font-medium text-[#1C2B3B] bg-[#FDF6F6] border border-[#DFB9B9] rounded-lg px-3.5 py-2.5">
              {fieldErrors.form}
            </p>
          )}

          <TxStatusBanner
            phase={tx.phase}
            actionLabel={tx.actionLabel}
            txHash={tx.txHash}
            errorMessage={tx.errorMessage}
            onDismiss={tx.reset}
          />

          <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
            <button
              type="submit"
              disabled={isBusy}
              className="px-6 py-3 text-sm font-semibold text-white bg-[#1C2B3B] rounded-lg hover:bg-[#14202D] disabled:opacity-60 transition-colors whitespace-nowrap"
            >
              {isBusy
                ? tx.phase === 'pending'
                  ? 'Waiting for signature...'
                  : 'Confirming on Arc...'
                : needsApproval
                  ? `Approve ${tokenMeta.symbol}`
                  : 'Lock deposit and create warranty'}
            </button>

            {tx.phase === 'confirmed' && lastActionType === 'create' && (
              <Link
                to="/warranties"
                className="text-sm font-semibold text-[#2A5C8F] hover:underline underline-offset-4"
              >
                Open My Warranties
              </Link>
            )}
          </div>
        </form>

        <aside className="lg:col-span-4 bg-white border border-[#D7E0EB] rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-[#1C2B3B]">
            Deposit checklist
          </h2>
          <dl className="space-y-3.5 text-sm">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E6ECF3]">
              <dt className="text-[#4E6176]">Token decimals</dt>
              <dd className="font-mono font-medium text-[#1C2B3B] tabular-nums">
                {tokenMeta.isValidToken ? tokenMeta.decimals : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E6ECF3]">
              <dt className="text-[#4E6176]">Current allowance</dt>
              <dd className="font-mono font-medium text-[#1C2B3B] tabular-nums">
                {tokenMeta.isValidToken
                  ? `${formatTokenAmount(tokenMeta.allowance, tokenMeta.decimals)} ${tokenMeta.symbol}`
                  : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E6ECF3]">
              <dt className="text-[#4E6176]">Approval required</dt>
              <dd className="font-medium text-[#1C2B3B]">
                {parsedDeposit === null
                  ? 'Enter amount'
                  : needsApproval
                    ? 'Yes (Step 1)'
                    : 'Allowance ready'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-[#4E6176]">Seller wallet</dt>
              <dd className="font-mono text-xs text-[#1C2B3B]">
                {address.slice(0, 6)}...{address.slice(-4)}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
