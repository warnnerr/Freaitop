interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className = 'w-8 h-8' }: BrandLogoProps) {
  return (
    <img
      src="/favicon.svg"
      alt="Freaitop"
      className={`${className} shrink-0 select-none`}
      referrerPolicy="no-referrer"
    />
  );
}
