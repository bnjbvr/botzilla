"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const db = __importStar(require("./db"));
const utils_1 = require("./utils");
let SETTINGS = null;
function ensureCacheEntry(matrixRoomId, moduleName) {
    utils_1.assert(SETTINGS !== null, "settings should have been defined first");
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
    utils_1.assert(SETTINGS !== null, "settings should have been loaded");
    return SETTINGS;
}
exports.getSettings = getSettings;
async function enableModule(matrixRoomId, moduleName, enabled) {
    let entry = ensureCacheEntry(matrixRoomId, moduleName);
    entry.enabled = enabled;
    await db.upsertModuleSettingEnabled(matrixRoomId, moduleName, enabled);
}
exports.enableModule = enableModule;
async function getOption(matrixRoomId, moduleName, key) {
    await getSettings();
    // Prefer the room option if there's one, otherwise return the general value.
    let allValue;
    let allEntry = ensureCacheEntry("*", moduleName);
    if (typeof allEntry.options === "object" &&
        allEntry.options !== null &&
        !!allEntry.options[key]) {
        allValue = allEntry.options[key];
    }
    let entry = ensureCacheEntry(matrixRoomId, moduleName);
    if (typeof entry.options === "object" &&
        entry.options !== null &&
        !!entry.options[key]) {
        return entry.options[key];
    }
    // May be undefined.
    return allValue;
}
exports.getOption = getOption;
async function setOption(matrixRoomId, moduleName, key, value) {
    await getSettings();
    let entry = ensureCacheEntry(matrixRoomId, moduleName);
    entry.options = entry.options || {};
    entry.options[key] = value;
    await db.upsertModuleSettingOptions(matrixRoomId, moduleName, entry.options);
}
exports.setOption = setOption;
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
exports.isModuleEnabled = isModuleEnabled;
