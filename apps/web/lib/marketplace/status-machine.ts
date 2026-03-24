import { ApiError } from '../api-helpers';

export type ListingStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'suspended';

export const LISTING_STATUSES: readonly ListingStatus[] = [
  'draft',
  'pending_review',
  'published',
  'rejected',
  'suspended',
];

const ALLOWED_TRANSITIONS: Readonly<Record<ListingStatus, readonly ListingStatus[]>> = {
  draft: ['pending_review'],
  pending_review: ['published', 'rejected'],
  published: ['draft', 'suspended'],
  rejected: ['draft'],
  suspended: ['published'],
};

export function assertTransition(from: ListingStatus, to: ListingStatus): void {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed?.includes(to)) {
    throw new ApiError(
      'INVALID_STATUS_TRANSITION',
      `Cannot transition listing from "${from}" to "${to}"`,
      409,
    );
  }
}

export function canTransition(from: ListingStatus, to: ListingStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
