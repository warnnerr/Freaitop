import type { WarrantyStatus } from '../utils/warranty';

interface StatusIndicatorProps {
  status: WarrantyStatus;
}

const STATUS_STYLES: Record<WarrantyStatus, string> = {
  Active: 'bg-[#EEF6F1] text-[#14532D] border-[#BBDAC6]',
  Claimed: 'bg-[#FEF7EC] text-[#78350F] border-[#EED29E]',
  Approved: 'bg-[#EEF6F1] text-[#14532D] border-[#BBDAC6]',
  Rejected: 'bg-[#F8EEF0] text-[#7F1D1D] border-[#E3BFC6]',
  Reclaimed: 'bg-[#EEF2F7] text-[#1C2B3B] border-[#C9D5E3]',
  Expired: 'bg-[#F1F4F8] text-[#334155] border-[#D1DBE6]',
};

export function StatusIndicator({ status }: StatusIndicatorProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold tracking-tight border rounded-md whitespace-nowrap shrink-0 ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}
