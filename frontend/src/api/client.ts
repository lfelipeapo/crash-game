import { getToken, updateToken } from "@/auth/keycloak";

const API_BASE = "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function ensureToken(): Promise<string | undefined> {
  try {
    const refreshed = await updateToken();
    if (refreshed) return getToken();
  } catch {
    // token expired
  }
  return getToken();
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await ensureToken();
  const url = `${API_BASE}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    throw new ApiError(
      typeof body === "object" && body && "message" in body
        ? String((body as { message: string }).message)
        : `HTTP ${response.status}`,
      response.status,
      body,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
