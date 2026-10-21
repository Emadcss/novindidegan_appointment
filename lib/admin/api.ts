/**
 * ثبت همه‌ی مسیرهای /api/admin/*.
 * (ایمپورت‌های جانبی، مسیرها را در router ثبت می‌کنند.)
 */
import "@/lib/admin/api-core";
import "@/lib/admin/api-data";

export { handleAdminRequest } from "@/lib/admin/router";