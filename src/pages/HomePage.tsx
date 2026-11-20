import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePlatformStats } from '../hooks/useWarrantyVault';

const ROADMAP_PHASES = [
  {
    phase: 'Phase 1',
    title: 'Core warranties live',
    body: 'Sellers lock ERC20 deposits for a fixed period, buyers file claims with an evidence reference, verifiers approve or reject, and sellers reclaim unclaimed deposits after expiry.',
  },
  {
    phase: 'Phase 2',
    title: 'Partial refunds',
    body: 'Verifiers gain support for split settlements when a repair credit or partial reimbursement resolves a claim without forfeiting the full deposit.',
  },
  {
    phase: 'Phase 3',
    title: 'Verifier reputation',
    body: 'On-chain resolution logs, response-time history, and optional verifier bonding give buyers and sellers verifiable signal when choosing an arbiter.',
  },
  {
    phase: 'Phase 4',
    title: 'Transferable warranties',
    body: 'Buyers who resell a covered product can transfer remaining warranty rights to the next owner without breaking vault custody.',
  },
] as const;

const FAQ_ITEMS = [
  {
    id: 'who-decides',
    question: 'Who decides a claim',
    answer:
      'Only the verifier wallet address named when the warranty is created can approve or reject a claim. Neither the buyer nor the seller can settle a disputed claim unilaterally.',
  },
  {
    id: 'verifier-inactive',
    question: 'What if the verifier does nothing',
    answer:
      'While a claim remains open, the locked deposit stays inside the vault and the seller cannot reclaim it. Both parties should agree on a responsive verifier address before locking funds.',
  },
  {
    id: 'early-reclaim',
    question: 'Can the seller take the deposit early',
    answer:
      'No. The contract blocks seller withdrawals until the warranty period has ended and only allows a reclaim when there is no open or approved claim.',
  },
  {
    id: 'what-evidence',
    question: 'What counts as evidence',
    answer:
      'Buyers submit a persistent reference string such as an IPFS content hash, an inspection receipt URL, courier tracking documentation, or a SHA-256 checksum agreed with the seller.',
  },
] as const;

export function HomePage() {
  const { stats, isLoading, isConfigured } = usePlatformStats();
  const [openFaq, setOpenFaq] = useState<string | null>(FAQ_ITEMS[0].id);

  return (
    <div>
      <section className="border-b border-[#D7E0EB] bg-[#F3F6FA]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 md:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 flex flex-col justify-center"
          >
            <p className="text-xs font-semibold tracking-wide text-[#2A5C8F] mb-3">
              Built on Arc
            </p>
            <h1 className="text-[clamp(2.25rem,4.2vw,3.5rem)] font-bold leading-[1.08] tracking-[-0.015em] text-[#1C2B3B] max-w-2xl [text-wrap:balance]">
              Warranty deposits locked in plain sight
            </h1>
            <p className="mt-5 text-base sm:text-[17px] leading-relaxed text-[#3E5066] max-w-xl">
              Freaitop is an independent warranty vault built on Arc. A seller locks a USDC or EURC deposit for an agreed period. If a defect arises, the buyer submits a claim with evidence for an independent verifier to decide. If no claim is made, the seller reclaims the deposit once coverage ends.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/create"
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#1C2B3B] rounded-lg hover:bg-[#14202D] transition-colors whitespace-nowrap"
              >
                <span>Create a warranty</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link
                to="/warranties"
                className="inline-flex items-center px-5 py-3 text-sm font-semibold text-[#1C2B3B] bg-white border border-[#C9D5E3] rounded-lg hover:bg-[#EEF2F7] transition-colors whitespace-nowrap"
              >
                View my warranties
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 bg-white border border-[#D7E0EB] rounded-xl p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <p className="text-xs font-semibold tracking-wide text-[#4E6176]">
                Vault lifecycle
              </p>
              <ol className="mt-5 space-y-5 divide-y divide-[#E6ECF3]">
                <li className="pt-0">
                  <p className="text-sm font-semibold text-[#1C2B3B]">
                    01. Seller locks deposit
                  </p>
                  <p className="text-sm text-[#4E6176] mt-1 leading-relaxed">
                    Tokens move into the contract for the chosen buyer, verifier, period, and product reference.
                  </p>
                </li>
                <li className="pt-5">
                  <p className="text-sm font-semibold text-[#1C2B3B]">
                    02. Buyer files with evidence
                  </p>
                  <p className="text-sm text-[#4E6176] mt-1 leading-relaxed">
                    If the item fails during coverage, only the buyer wallet can open a claim and attach an evidence link or hash.
                  </p>
                </li>
                <li className="pt-5">
                  <p className="text-sm font-semibold text-[#1C2B3B]">
                    03. Verifier settles or seller reclaims
                  </p>
                  <p className="text-sm text-[#4E6176] mt-1 leading-relaxed">
                    The designated verifier sends the deposit to the buyer on approval, or the seller reclaims after the period ends.
                  </p>
                </li>
              </ol>
            </div>
            <div className="mt-6 pt-5 border-t border-[#E6ECF3] flex items-center justify-between text-xs text-[#4E6176]">
              <span>Supported tokens</span>
              <span className="font-mono font-medium text-[#1C2B3B]">USDC · EURC · ERC20</span>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-white border-b border-[#D7E0EB]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-7">
            <h2 className="text-2xl font-bold tracking-tight text-[#1C2B3B]">
              Vault activity on Arc
            </h2>
            {!isConfigured && (
              <p className="text-xs text-[#4E6176]">
                Live on-chain counts appear once the deployed vault address is configured.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 border border-[#D7E0EB] rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-[#D7E0EB] bg-[#F8FAFC]">
            <div className="p-5 sm:p-6">
              <p className="text-xs font-medium text-[#4E6176]">Total warranties</p>
              <p className="mt-2 text-3xl font-bold text-[#1C2B3B] font-mono tabular-nums">
                {isLoading ? '—' : stats.totalWarranties}
              </p>
            </div>
            <div className="p-5 sm:p-6 border-l border-[#D7E0EB] lg:border-l-0">
              <p className="text-xs font-medium text-[#4E6176]">Active coverage</p>
              <p className="mt-2 text-3xl font-bold text-[#1C2B3B] font-mono tabular-nums">
                {isLoading ? '—' : stats.activeWarranties}
              </p>
            </div>
            <div className="p-5 sm:p-6">
              <p className="text-xs font-medium text-[#4E6176]">Open claims</p>
              <p className="mt-2 text-3xl font-bold text-[#1C2B3B] font-mono tabular-nums">
                {isLoading ? '—' : stats.openClaims}
              </p>
            </div>
            <div className="p-5 sm:p-6 border-l border-[#D7E0EB] lg:border-l-0">
              <p className="text-xs font-medium text-[#4E6176]">Approved refunds</p>
              <p className="mt-2 text-3xl font-bold text-[#1C2B3B] font-mono tabular-nums">
                {isLoading ? '—' : stats.approvedClaims}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="bg-[#F3F6FA] border-b border-[#D7E0EB]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C2B3B]">
              How the deposit protects the buyer
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#3E5066]">
              Traditional warranties rely on a seller remaining willing and solvent months after payment. Freaitop separates the guarantee from the seller by holding real collateral in a contract on Arc until the warranty period expires.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <article className="bg-white border border-[#D7E0EB] rounded-xl p-6 sm:p-7">
              <h3 className="text-lg font-semibold text-[#1C2B3B]">
                Collateral is locked before delivery disputes arise
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[#3E5066]">
                When a warranty is created, the seller transfers the deposit into the vault in USDC, EURC, or another ERC20 token. The contract enforces the expiry timestamp on-chain so the seller cannot pull funds out early while coverage is active.
              </p>
            </article>

            <article className="bg-white border border-[#D7E0EB] rounded-xl p-6 sm:p-7">
              <h3 className="text-lg font-semibold text-[#1C2B3B]">
                An agreed verifier decides every claim
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[#3E5066]">
                A warranty specifies a neutral verifier wallet up front. If the buyer files a claim during the warranty period with an evidence reference, only that verifier can approve the refund to the buyer or reject the claim so the seller can reclaim after expiry.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="roadmap" className="bg-white border-b border-[#D7E0EB]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C2B3B]">
              Protocol roadmap
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#3E5066]">
              Available on Arc with a clear progression from single-deposit coverage to secondary market transfers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ROADMAP_PHASES.map((item) => (
              <article
                key={item.phase}
                className="bg-[#F8FAFC] border border-[#D7E0EB] rounded-xl p-6 flex flex-col"
              >
                <p className="text-xs font-semibold tracking-wide text-[#2A5C8F]">
                  {item.phase}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[#1C2B3B]">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[#3E5066]">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-[#F3F6FA]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            <div className="lg:col-span-4">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C2B3B]">
                Common questions
              </h2>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#3E5066]">
                Straight answers on custody, verifier authority, and evidence requirements.
              </p>
            </div>

            <div className="lg:col-span-8 divide-y divide-[#D7E0EB] border border-[#D7E0EB] rounded-xl bg-white overflow-hidden">
              {FAQ_ITEMS.map((item) => {
                const isOpen = openFaq === item.id;
                return (
                  <div key={item.id}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaq(isOpen ? null : item.id)}
                      className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left hover:bg-[#F8FAFC] transition-colors"
                    >
                      <span className="text-base font-semibold text-[#1C2B3B]">
                        {item.question}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-[#4E6176] shrink-0 transition-transform duration-150 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5 text-sm sm:text-[15px] leading-relaxed text-[#3E5066]">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
