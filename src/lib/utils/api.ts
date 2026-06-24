import { NextResponse } from "next/server";
import type { ApiResponse, PaginatedResponse } from "@/types";

export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(
  error: string,
  status = 500
): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status });
}

export function apiCreated<T>(data: T): NextResponse<ApiResponse<T>> {
  return apiSuccess(data, 201);
}

export function apiPaginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): NextResponse<PaginatedResponse<T>> {
  return NextResponse.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  console.error("[API Error]:", error);

  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") return apiError("Unauthorized", 401);
    if (error.message === "FORBIDDEN") return apiError("Forbidden", 403);
    if (error.message === "NOT_FOUND") return apiError("Not found", 404);
    return apiError(error.message);
  }
  return apiError("Internal server error");
}

export function getPaginationParams(url: string) {
  const { searchParams } = new URL(url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const search = searchParams.get("search") || undefined;
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc";
  const skip = (page - 1) * limit;
  return { page, limit, search, sortBy, sortOrder, skip };
}
