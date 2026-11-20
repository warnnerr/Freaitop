import { ConnectButton } from '@rainbow-me/rainbowkit';
import { BrandLogo } from './BrandLogo';

interface WalletGateProps {
  heading: string;
  description: string;
}

export function WalletGate({ heading, description }: WalletGateProps) {
  return (
    <section className="mx-auto max-w-xl bg-white border border-[#D7E0EB] rounded-xl p-8 md:p-10 text-center">
      <div className="flex justify-center mb-5">
        <BrandLogo className="w-12 h-12" />
      </div>
      <h2 className="text-2xl font-semibold text-[#1C2B3B] tracking-tight mb-3">
        {heading}
      </h2>
      <p className="text-[15px] leading-relaxed text-[#4E6176] mb-7 max-w-md mx-auto">
        {description}
      </p>
      <div className="flex justify-center">
        <ConnectButton label="Connect Wallet" />
      </div>
    </section>
  );
}
