import { Shield, CheckCircle, User } from 'lucide-react';

interface AuthorBadgeProps {
  readonly type: 'official' | 'community' | 'verified';
  readonly className?: string;
}

const BADGE_CONFIG = {
  official: {
    icon: Shield,
    label: 'Official',
    className: 'text-foreground/60',
  },
  verified: {
    icon: CheckCircle,
    label: 'Verified',
    className: 'text-emerald-400/80',
  },
  community: {
    icon: User,
    label: 'Community',
    className: 'text-muted-foreground/60',
  },
} as const;

export function AuthorBadge({ type, className = '' }: AuthorBadgeProps) {
  const config = BADGE_CONFIG[type];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${config.className} ${className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
