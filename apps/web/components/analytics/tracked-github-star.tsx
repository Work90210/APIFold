'use client';

import type { ReactNode } from 'react';
import { trackGitHubStarClicked } from '@/lib/analytics/events.client';

interface TrackedGitHubStarProps {
  readonly href: string;
  readonly className?: string;
  readonly location: string;
  readonly children: ReactNode;
}

export function TrackedGitHubStar({ href, className, location, children }: TrackedGitHubStarProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => trackGitHubStarClicked({ location })}
    >
      {children}
    </a>
  );
}
