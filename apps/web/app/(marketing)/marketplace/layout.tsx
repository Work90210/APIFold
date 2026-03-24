import type { ReactNode } from 'react';

export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pt-20">
      {children}
    </div>
  );
}
