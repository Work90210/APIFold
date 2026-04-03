import { NextResponse } from "next/server";
import { getUserId, withErrorHandler, withRateLimit } from "@/lib/api-helpers";
import { createSuccessResponse } from "@apifold/types";
import { createCheckoutSession } from "@/lib/billing/checkout";
import { serverTrackCheckoutStarted } from "@/lib/analytics/events.server";
import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

const checkoutSchema = z.object({
  planId: z.enum(["starter", "pro"]),
});

export function POST(request: Request) {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { planId } = checkoutSchema.parse(body);

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const stripeCustomerId = user.publicMetadata?.stripeCustomerId as
      | string
      | undefined;

    const result = await createCheckoutSession(
      userId,
      planId,
      stripeCustomerId,
    );

    Promise.resolve(serverTrackCheckoutStarted({ userId, plan: planId })).catch(() => {});

    return NextResponse.json(createSuccessResponse(result));
  });
}
