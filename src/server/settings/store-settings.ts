import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

export const STORE_SETTINGS_ID = "store";

/** The singleton settings row; created with safe defaults (no invented contact details). */
export const getStoreSettings = cache(async () => {
  return db.storeSettings.upsert({ where: { id: STORE_SETTINGS_ID }, update: {}, create: { id: STORE_SETTINGS_ID } });
});

export type StoreSettingsData = Awaited<ReturnType<typeof getStoreSettings>>;
