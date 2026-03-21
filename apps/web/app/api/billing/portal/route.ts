import { NextResponse } from "next/server";
import { getUserId, withErrorHandler, withRateLimit, ApiError } from "@/lib/api-helpers";
import { createSuccessResponse } from "@apifold/types";
import { createPortalSession } from "@/lib/billing/portal";
import { clerkClient } from "@clerk/nextjs/server";

export function POST(_request: Request) {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const stripeCustomerId = user.publicMetadata?.stripeCustomerId as
      | string
      | undefined;

    if (!stripeCustomerId) {
      throw new ApiError("NOT_FOUND", "No billing account found", 404);
    }

    const result = await createPortalSession(stripeCustomerId);

    return NextResponse.json(createSuccessResponse(result));
  });
}
