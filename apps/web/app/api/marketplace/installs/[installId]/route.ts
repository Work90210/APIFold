import { NextResponse, type NextRequest } from 'next/server';
import { createSuccessResponse } from '@apifold/types';
import { getUserId, withErrorHandler, withRateLimit } from '../../../../../lib/api-helpers';
import { uninstallByInstallId } from '../../../../../lib/services/marketplace-service';

export function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ installId: string }> },
): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { installId } = await params;

    await uninstallByInstallId(installId, userId);

    return NextResponse.json(createSuccessResponse(null), { status: 200 });
  });
}
