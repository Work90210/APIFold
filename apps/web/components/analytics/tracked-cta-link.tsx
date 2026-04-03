'use client';

import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { trackCtaClick } from '@/lib/analytics/events.client';

interface TrackedCtaLinkProps extends Omit<ComponentProps<typeof Link>, 'onClick'> {
  readonly cta: string;
  readonly location: string;
  readonly children: ReactNode;
}

export function TrackedCtaLink({ cta, location, children, ...rest }: TrackedCtaLinkProps) {
  return (
    <Link
      {...rest}
      onClick={() => trackCtaClick({ cta, location })}
    >
      {children}
    </Link>
  );
}
