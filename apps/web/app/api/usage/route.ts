import { NextResponse, type NextRequest } from "next/server";
import { createSuccessResponse } from "@apifold/types";
import { getDb } from "../../../lib/db/index";
import { ServerRepository } from "../../../lib/db/repositories/server.repository";
import {
  getUserId,
  withErrorHandler,
  withRateLimit,
} from "../../../lib/api-helpers";
import { getMonthlyUsage } from "../../../lib/billing/usage-tracker";

export function GET(_request: NextRequest): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const db = getDb();
    const serverRepo = new ServerRepository(db);
    const servers = await serverRepo.findAll(userId);

    let requestsThisMonth = 0;
    try {
      requestsThisMonth = await getMonthlyUsage(userId);
    } catch (err) {
      console.error("[usage] Redis unavailable for monthly usage:", err);
    }

    return NextResponse.json(
      createSuccessResponse({
        serverCount: servers.length,
        activeServers: servers.filter((s) => s.isActive).length,
        requestsThisMonth,
      }),
    );
  });
}
