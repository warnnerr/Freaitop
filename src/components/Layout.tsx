import { useState, type ReactNode } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Menu, X } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';
import { ENV_CONFIG } from '../config/env';
import { getExplorerAddressUrl, shortenAddress } from '../utils/warranty';

interface LayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/create', label: 'Create Warranty', end: false },
  { to: '/warranties', label: 'My Warranties', end: false },
  { to: '/verifier', label: 'Verifier Desk', end: false },
] as const;

export function Layout({ children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F6FA] text-[#1C2B3B]">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#D7E0EB]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-6 sm:gap-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#1C2B3B] whitespace-nowrap shrink-0"
          >
            <BrandLogo className="w-7 h-7" />
            <span>Freaitop</span>
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                    isActive
                      ? 'text-[#1C2B3B] border-[#1C2B3B]'
                      : 'text-[#4E6176] border-transparent hover:text-[#1C2B3B] hover:border-[#C5D1DF]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block">
              <ConnectButton
                showBalance={false}
                chainStatus="icon"
                accountStatus="address"
              />
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[#D7E0EB] bg-white text-[#1C2B3B] hover:bg-[#F3F6FA]"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-[#D7E0EB] bg-white px-4 py-4 space-y-3">
            <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#EEF2F7] text-[#1C2B3B]'
                        : 'text-[#4E6176] hover:bg-[#F3F6FA] hover:text-[#1C2B3B]'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="pt-2 border-t border-[#E6ECF3] sm:hidden">
              <ConnectButton
                showBalance={false}
                chainStatus="icon"
                accountStatus="address"
              />
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-[#1C2B3B] text-white border-t border-[#14202D]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo className="w-7 h-7" />
            <div>
              <p className="text-sm font-semibold text-white">Built by Warner</p>
              <p className="text-xs text-[#DCE5F0] mt-1">
                Freaitop is an independent project, available on Arc.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-[#DCE5F0]">
            <Link to="/create" className="hover:text-white transition-colors whitespace-nowrap">
              Create Warranty
            </Link>
            <Link to="/warranties" className="hover:text-white transition-colors whitespace-nowrap">
              My Warranties
            </Link>
            <Link to="/verifier" className="hover:text-white transition-colors whitespace-nowrap">
              Verifier Desk
            </Link>
            {ENV_CONFIG.contractAddress && (
              <a
                href={getExplorerAddressUrl(
                  ENV_CONFIG.explorerUrl,
                  ENV_CONFIG.contractAddress,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono hover:text-white transition-colors whitespace-nowrap"
              >
                Vault {shortenAddress(ENV_CONFIG.contractAddress)}
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
