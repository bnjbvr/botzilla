import * as db from "./db";
import { assert } from "./utils";

interface SettingEntry {
  enabled: boolean;
  options: object;
}

type Settings = {
  [roomId: string]: {
    [moduleName: string]: SettingEntry;
  };
};

let SETTINGS: Settings | null = null;

function ensureCacheEntry(matrixRoomId, moduleName) {
  assert(SETTINGS !== null, "settings should have been defined first");
  SETTINGS[matrixRoomId] = SETTINGS[matrixRoomId] || {};
  SETTINGS[matrixRoomId][moduleName] = SETTINGS[matrixRoomId][moduleName] || {};
  return SETTINGS[matrixRoomId][moduleName];
}

async function forceReloadSettings() {
  SETTINGS = {
    "*": {}
  };
  let results = await db.getModuleSettings();
  for (const r of results) {
    let entry = ensureCacheEntry(r.matrixRoomId, r.moduleName);
    entry.enabled = r.enabled === 1;
    entry.options = r.options === null ? null : JSON.parse(r.options);
  }
}

export async function getSettings(): Promise<Settings> {
  if (SETTINGS === null) {
    await forceReloadSettings();
  }
  assert(SETTINGS !== null, "settings should have been loaded");
  return SETTINGS;
}

export async function enableModule(matrixRoomId, moduleName, enabled) {
  await getSettings();
  let entry = ensureCacheEntry(matrixRoomId, moduleName);
  entry.enabled = enabled;
  await db.upsertModuleSettingEnabled(matrixRoomId, moduleName, enabled);
}

export async function getOption(matrixRoomId, moduleName, key) {
  await getSettings();

  // Prefer the room option if there's one, otherwise return the general value.

  let allValue;
  let allEntry = ensureCacheEntry("*", moduleName);
  if (
    typeof allEntry.options === "object" &&
    allEntry.options !== null &&
    !!allEntry.options[key]
  ) {
    allValue = allEntry.options[key];
  }

  let entry = ensureCacheEntry(matrixRoomId, moduleName);
  if (
    typeof entry.options === "object" &&
    entry.options !== null &&
    !!entry.options[key]
  ) {
    return entry.options[key];
  }
  // May be undefined.
  return allValue;
}

export async function setOption(matrixRoomId, moduleName, key, value) {
  await getSettings();
  let entry = ensureCacheEntry(matrixRoomId, moduleName);
  entry.options = entry.options || {};
  entry.options[key] = value;
  await db.upsertModuleSettingOptions(matrixRoomId, moduleName, entry.options);
}

export async function isModuleEnabled(matrixRoomId, moduleName) {
  await getSettings();

  // Favor per room preferences over general preferences.
  let entry = ensureCacheEntry(matrixRoomId, moduleName);
  if (typeof entry.enabled === "boolean") {
    return entry.enabled;
  }

  entry = ensureCacheEntry("*", moduleName);
  return !!entry.enabled;
}
