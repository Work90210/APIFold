import {
  CreditCard,
  MessageSquare,
  Code,
  LayoutDashboard,
  Database,
  ShoppingCart,
  Brain,
  Cloud,
  Users,
  Activity,
  Package,
} from 'lucide-react';
import type { CategorySlug } from '@/lib/marketplace/categories';

const CATEGORY_ICONS: Record<CategorySlug, React.ComponentType<{ className?: string }>> = {
  payments: CreditCard,
  communication: MessageSquare,
  'developer-tools': Code,
  productivity: LayoutDashboard,
  data: Database,
  commerce: ShoppingCart,
  'ai-ml': Brain,
  infrastructure: Cloud,
  crm: Users,
  monitoring: Activity,
  other: Package,
};

interface CategoryIconProps {
  readonly category: string;
  readonly className?: string;
}

export function CategoryIcon({ category, className = 'h-5 w-5' }: CategoryIconProps) {
  const Icon = CATEGORY_ICONS[category as CategorySlug] ?? Package;
  return <Icon className={className} />;
}
