import type { FitReport, ValidateRequest, Product } from "../types/api";

// Base URL of the FastAPI backend. Hard-coded for local dev; swap for an env
// var (import.meta.env.VITE_API_BASE) when you deploy.
const API_BASE = "http://localhost:8000/api";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

async function postJson<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return (await res.json()) as TRes;
}

export const api = {
  health: () => getJson<{ status: string }>("/health"),
  catalog: () => getJson<Product[]>("/catalog"),
  validate: (req: ValidateRequest) =>
    postJson<ValidateRequest, FitReport>("/validate", req),
};
