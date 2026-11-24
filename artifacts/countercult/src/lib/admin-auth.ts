import { setBaseUrl } from "@workspace/api-client-react";

const STORAGE_KEY = "countercult.adminPassword";

setBaseUrl(null);

export function getAdminPassword(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(STORAGE_KEY);
}

export function setAdminPassword(value: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, value);
}

export function clearAdminPassword(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function adminHeaders(): Record<string, string> {
  const pwd = getAdminPassword();
  return pwd ? { "x-admin-password": pwd } : {};
}
