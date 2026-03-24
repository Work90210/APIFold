import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { NextResponse, type NextRequest } from 'next/server';

import { withErrorHandler, NotFoundError } from '../../../../../lib/api-helpers';

export function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const { id } = await params;

    // Validate id to prevent path traversal
    if (!/^[a-z0-9-]+$/.test(id)) {
      throw new NotFoundError('Invalid registry ID');
    }

    try {
      const specPath = resolve(process.cwd(), '../../packages/registry/specs', id, 'spec.json');
      const raw = readFileSync(specPath, 'utf-8');
      return NextResponse.json(JSON.parse(raw));
    } catch {
      throw new NotFoundError('Spec not found');
    }
  });
}
