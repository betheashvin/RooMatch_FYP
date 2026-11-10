import type {
  FitReport,
  Layout,
  Product,
  RecommendRequest,
  RecommendedSet,
  ValidateRequest,
  LayoutSummary,
  LayoutWrite,
  SavedLayout,
  User,
} from "../types/api";

// Loopback API requests must use the frontend's hostname in development so
// SameSite=Lax cookies work even when VITE_API_BASE uses the other local alias.
const apiUrl = new URL(import.meta.env.VITE_API_BASE || `http://${window.location.hostname}:8001/api`, window.location.origin);
const loopbackHosts = ["localhost", "127.0.0.1", "[::1]"];
if (import.meta.env.DEV && loopbackHosts.includes(window.location.hostname) && loopbackHosts.includes(apiUrl.hostname)) {
  apiUrl.hostname = window.location.hostname;
}
const API_BASE = apiUrl.toString().replace(/\/$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly retryAfter?: number;
  readonly otpSent?: boolean;
  constructor(status: number, message: string, detail?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = typeof detail?.code === "string" ? detail.code : undefined;
    this.retryAfter = typeof detail?.retry_after_seconds === "number" ? detail.retry_after_seconds : undefined;
    this.otpSent = typeof detail?.otp_sent === "boolean" ? detail.otp_sent : undefined;
  }
}

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const detail = data?.detail;
    const metadata = detail && typeof detail === "object" && !Array.isArray(detail) ? detail : undefined;
    const message = typeof detail === "string" ? detail
      : typeof metadata?.message === "string" ? metadata.message
      : Array.isArray(detail) ? detail.map((entry: { msg: string }) => entry.msg).join(" ")
      : `Request failed (${res.status}). Please try again.`;
    if (res.status === 401 && path !== "/auth/login") {
      window.dispatchEvent(new Event("roomatch:session-expired"));
    }
    throw new ApiError(res.status, message, metadata);
  }
  return res.status === 204 ? undefined as T : await res.json() as T;
}

async function getJson<T>(path: string): Promise<T> {
  return request<T>(path);
}

async function postJson<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  return request<TRes>(path, "POST", body);
}

export const api = {
  health: () => getJson<{ status: string }>("/health"),
  catalog: () => getJson<Product[]>("/catalog"),
  product: (id: string) => getJson<Product>(`/catalog/${id}`),
  validate: (req: ValidateRequest) =>
    postJson<ValidateRequest, FitReport>("/validate", req),
  register: (email: string, password: string) => request<{ detail: string }>("/auth/register", "POST", { email, password }),
  login: (email: string, password: string) => request<User>("/auth/login", "POST", { email, password }),
  verifyEmail: (email: string, otp: string) => request<User>("/auth/verify-email", "POST", { email, otp }),
  resendOtp: (email: string) => request<{ detail: string }>("/auth/resend-otp", "POST", { email }),
  forgotPassword: (email: string) => request<{ detail: string }>("/auth/forgot-password", "POST", { email }),
  resetPassword: async (email: string, otp: string, newPassword: string) => {
    const result = await request<{ detail: string }>("/auth/reset-password", "POST", { email, otp, new_password: newPassword });
    window.dispatchEvent(new Event("roomatch:session-expired"));
    return result;
  },
  me: () => request<User>("/auth/me"),
  logout: () => request<void>("/auth/logout", "POST"),
  layouts: (offset = 0) => request<LayoutSummary[]>(`/layouts?offset=${offset}&limit=100`),
  layout: (id: string) => request<SavedLayout>(`/layouts/${encodeURIComponent(id)}`),
  createLayout: (body: LayoutWrite) => request<SavedLayout>("/layouts", "POST", body),
  updateLayout: (id: string, body: LayoutWrite) => request<SavedLayout>(`/layouts/${encodeURIComponent(id)}`, "PUT", body),
  renameLayout: (id: string, name: string) => request<SavedLayout>(`/layouts/${encodeURIComponent(id)}`, "PATCH", { name }),
  deleteLayout: (id: string) => request<void>(`/layouts/${encodeURIComponent(id)}`, "DELETE"),
};
