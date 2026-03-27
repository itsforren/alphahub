import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PackageTypeBadgeProps {
  packageType: string | null;
  className?: string;
  editable?: boolean;
  onPackageTypeChange?: (newType: string) => void;
}

const packageOptions = [
  { value: 'full_management', label: 'Full Mgmt', bgColor: 'bg-blue-500/10', textColor: 'text-blue-400', borderColor: 'border-blue-500/20' },
  { value: 'aged', label: 'Aged', bgColor: 'bg-white/[0.04]', textColor: 'text-white/45', borderColor: 'border-white/[0.08]' },
];

export function PackageTypeBadge({ packageType, className, editable = false, onPackageTypeChange }: PackageTypeBadgeProps) {
  const isFullManagement = packageType === 'full_management' || !packageType;
  const currentOption = isFullManagement ? packageOptions[0] : packageOptions[1];

  const stop = (e: any) => {
    e.stopPropagation?.();
  };

  const badgeContent = (
    <span
      onPointerDown={editable ? stop : undefined}
      onClick={editable ? stop : undefined}
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider uppercase border",
        currentOption.bgColor,
        currentOption.textColor,
        currentOption.borderColor,
        editable && 'cursor-pointer hover:brightness-125 transition-all',
        className
      )}
    >
      {currentOption.label}
    </span>
  );

  if (!editable || !onPackageTypeChange) {
    return badgeContent;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {badgeContent}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {packageOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={(e) => {
              stop(e);
              onPackageTypeChange(option.value);
            }}
            className={cn(
              'cursor-pointer',
              (packageType === option.value || (!packageType && option.value === 'full_management')) && 'bg-white/[0.06]'
            )}
          >
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider uppercase border mr-2',
                option.bgColor,
                option.textColor,
                option.borderColor,
              )}
            >
              {option.label}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
