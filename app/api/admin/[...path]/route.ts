import type { NextRequest } from "next/server";

import { handleAdminRequest } from "@/lib/admin/api";

// همه‌ی روش‌ها به یک مسیریاب می‌روند (lib/admin/router.ts)
export const dynamic = "force-dynamic";

export const GET = (request: NextRequest) => handleAdminRequest(request);
export const POST = (request: NextRequest) => handleAdminRequest(request);
export const PUT = (request: NextRequest) => handleAdminRequest(request);
export const PATCH = (request: NextRequest) => handleAdminRequest(request);
export const DELETE = (request: NextRequest) => handleAdminRequest(request);