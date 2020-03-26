let db = require("./db");

let SETTINGS = null;

function ensureCacheEntry(matrixRoomId, moduleName) {
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

async function getSettings() {
  if (SETTINGS === null) {
    await forceReloadSettings();
  }
  return SETTINGS;
}

async function enableModule(matrixRoomId, moduleName, enabled) {
  let entry = ensureCacheEntry(matrixRoomId, moduleName);
  entry.enabled = enabled;
  await db.upsertModuleSettingEnabled(matrixRoomId, moduleName, enabled);
}

async function getOption(matrixRoomId, moduleName, key) {
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

async function setOption(matrixRoomId, moduleName, key, value) {
  await getSettings();
  let entry = ensureCacheEntry(matrixRoomId, moduleName);
  entry.options = entry.options || {};
  entry.options[key] = value;
  await db.upsertModuleSettingOptions(matrixRoomId, moduleName, entry.options);
}

async function isModuleEnabled(matrixRoomId, moduleName) {
  await getSettings();

  // Favor per room preferences over general preferences.
  let entry = ensureCacheEntry(matrixRoomId, moduleName);
  if (typeof entry.enabled === "boolean") {
    return entry.enabled;
  }

  entry = ensureCacheEntry("*", moduleName);
  return !!entry.enabled;
}

module.exports = {
  getSettings,
  enableModule,
  isModuleEnabled,
  getOption,
  setOption
};
