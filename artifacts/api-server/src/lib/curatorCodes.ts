import { db, curatorCodesTable } from "@workspace/db";

export const DEFAULT_CURATOR_DISPLAY_NAME = "Sketchy Shona";
export const MAX_ACTIVE_CURATOR_CODES = 50;

export function normalizeCuratorCode(value: string | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase().replace(/\s+/g, "");
}

/**
 * Seed an operator-chosen curator invitation only when explicitly configured.
 * Never bake a redeemable code into source or a deployment image.
 */
export async function ensureDefaultCuratorCode(): Promise<void> {
  const code = normalizeCuratorCode(process.env.DEFAULT_CURATOR_CODE);
  if (!code) return;

  await db
    .insert(curatorCodesTable)
    .values({
      code,
      displayName: DEFAULT_CURATOR_DISPLAY_NAME,
      isActive: true,
    })
    .onConflictDoNothing({ target: curatorCodesTable.code });
}