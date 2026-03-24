'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { trackMarketplaceDeploy } from '@/lib/analytics/events';

interface DeployButtonProps {
  readonly slug: string;
  readonly disabled?: boolean;
  readonly size?: 'sm' | 'default' | 'lg';
}

export function DeployButton({ slug, disabled = false, size = 'default' }: DeployButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDeploy = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/marketplace/${slug}/deploy`, {
        method: 'POST',
      });

      // Clerk returns a redirect for unauthenticated users
      if (res.redirected || res.status === 401 || res.status === 403) {
        router.push(`/sign-in?redirect_url=/marketplace/${slug}`);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        const msg = data.error?.message ?? 'Deploy failed';
        setError(msg);
        trackMarketplaceDeploy({ slug, name: slug, category: '', success: false, error: msg });
        return;
      }

      trackMarketplaceDeploy({ slug, name: slug, category: '', success: true });
      router.push(data.data.redirectUrl);
    } catch {
      // Likely a redirect to sign-in that fetch can't follow
      router.push(`/sign-in?redirect_url=/marketplace/${slug}`);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs',
    default: 'h-10 px-5 text-sm',
    lg: 'h-11 px-6 text-sm',
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleDeploy}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded-md bg-foreground font-medium text-background transition-all duration-200 hover:bg-foreground/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${sizeClasses[size]}`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : null}
        {loading ? 'Deploying...' : 'Deploy to APIFold'}
      </button>
      {error && (
        <p className="mt-1.5 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
