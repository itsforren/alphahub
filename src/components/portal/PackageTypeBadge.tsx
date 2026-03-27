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
  { value: 'full_management', label: 'Full Mgmt', className: 'bg-blue-500/10 text-blue-600 border border-blue-500/20' },
  { value: 'aged', label: 'Aged', className: 'bg-slate-500/10 text-slate-500 border border-slate-500/20' },
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
        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium tracking-wide uppercase",
        currentOption.className,
        editable && 'cursor-pointer hover:opacity-80 transition-opacity',
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
              (packageType === option.value || (!packageType && option.value === 'full_management')) && 'bg-accent'
            )}
          >
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium tracking-wide uppercase mr-2',
                option.className
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
