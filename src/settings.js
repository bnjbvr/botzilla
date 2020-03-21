let db = require("./db");

let SETTINGS = null;

async function forceReloadSettings() {
  SETTINGS = {
    "*": {}
  };
  let results = await db.getModuleSettings();
  for (const r of results) {
    SETTINGS[r.matrixRoomId] = SETTINGS[r.matrixRoomId] || {};
    SETTINGS[r.matrixRoomId][r.moduleName] = r.enabled == 1;
  }
}

async function getSettings() {
  if (SETTINGS === null) {
    await forceReloadSettings();
  }
  return SETTINGS;
}

async function enableModule(matrixRoomId, moduleName, enabled) {
  SETTINGS[matrixRoomId] = SETTINGS[matrixRoomId] || {};
  SETTINGS[matrixRoomId][moduleName] = enabled;
  await db.upsertModuleSetting(matrixRoomId, moduleName, enabled);
}

async function isModuleEnabled(matrixRoomId, moduleName) {
  await getSettings();

  // Favor per room preferences over general preferences.
  if (
    typeof SETTINGS[matrixRoomId] !== "undefined" &&
    typeof SETTINGS[matrixRoomId][moduleName] === "boolean"
  ) {
    let roomSetting = !!(
      SETTINGS[matrixRoomId] && SETTINGS[matrixRoomId][moduleName]
    );
    return roomSetting;
  }

  return !!SETTINGS["*"][moduleName];
}

module.exports = {
  getSettings,
  enableModule,
  isModuleEnabled
};
