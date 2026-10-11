import { cn } from '@/lib/cn';

interface IconProps {
  /** اسم الأيقونة في Material Symbols Outlined */
  name: string;
  className?: string;
  /** أيقونة ممتلئة (FILL 1) */
  fill?: boolean;
  'aria-hidden'?: boolean;
}

export function Icon({ name, className, fill = false, ...rest }: IconProps) {
  return (
    <span
      className={cn('material-symbols-outlined', className)}
      style={fill ? { fontVariationSettings: "'FILL' 1" } : undefined}
      aria-hidden={rest['aria-hidden'] ?? true}
    >
      {name}
    </span>
  );
}
