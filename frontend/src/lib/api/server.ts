// Server-side API calls (server components). Talks to FastAPI directly and forwards the visitor's session cookie.

import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { ApiError, type Query, readResponse, toQueryString } from "./core";
import type { User } from "./types";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";
const SESSION_COOKIE = "session";

export async function serverGet<T>(path: string, query?: Query): Promise<T> {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  const response = await fetch(`${BACKEND_URL}/api${path}${toQueryString(query)}`, {
    headers: session ? { cookie: `${SESSION_COOKIE}=${session}` } : undefined,
    cache: "no-store", // every page shows live availability and the viewer's own data
  });
  return readResponse<T>(response);
}

/** The logged-in user, or null. Cached for the duration of one server render. */
export const getViewer = cache(async (): Promise<User | null> => {
  if (!(await cookies()).has(SESSION_COOKIE)) return null;
  try {
    return await serverGet<User>("/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
});

/** Like serverGet, but a 404 becomes null so pages can call notFound(). */
export async function serverGetOrNull<T>(path: string, query?: Query): Promise<T | null> {
  try {
    return await serverGet<T>(path, query);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
