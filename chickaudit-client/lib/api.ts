const DEFAULT_API_URL =
  process.env.NODE_ENV === "production"
    ? "https://chickaudit-server.onrender.com"
    : "http://localhost:4000";

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL
).replace(/\/+$|\/$/, "");

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("chickenaudit_token");
}

export function getUrl(path: string) {
  return `${BACKEND_URL}${path}`;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = getToken();

  let res: Response;
  try {
    res = await fetch(getUrl(path), {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err: any) {
    console.error("API request failed", err);
    throw new Error(
      "Unable to connect to the backend. Please check the API URL and CORS settings.",
    );
  }

  const data = await res.json().catch(() => ({}) as Record<string, unknown>);

  if (res.status === 401) {
    const errorMessage =
      data?.message ||
      (path === "/auth/login" ? "Invalid email or password" : "Unauthorized");

    if (token && path !== "/auth/login") {
      localStorage.removeItem("chickenaudit_token");
      localStorage.removeItem("chickenaudit_user");
      window.location.href = "/login";
      throw new Error("Session expired");
    }

    throw new Error(errorMessage as string);
  }

  if (!res.ok) throw new Error((data as any).message ?? "Request failed");
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
