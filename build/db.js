"use strict";
// DB facilities. Don't use these directly, instead go through the Settings
// module which adds in-memory caching. Only the Settings module should
// directly interact with this.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModuleSettings = exports.upsertModuleSettingOptions = exports.upsertModuleSettingEnabled = exports.migrateRoomSettings = exports.init = void 0;
const sqlite = __importStar(require("sqlite"));
const sqlite3_1 = __importDefault(require("sqlite3"));
const path = __importStar(require("path"));
let db;
async function init(storageDir) {
    let dbPath = path.join(storageDir, "db.sqlite");
    db = await sqlite.open({ filename: dbPath, driver: sqlite3_1.default.Database });
    db.on("trace", (event) => console.log(event));
    await db.migrate();
}
exports.init = init;
async function migrateRoomSettings(prevRoomId, newRoomId) {
    await db.run("UPDATE ModuleSetting SET matrixRoomId = ? WHERE matrixRoomId = ?", newRoomId, prevRoomId);
}
exports.migrateRoomSettings = migrateRoomSettings;
async function upsertModuleSettingEnabled(roomId, moduleName, enabled) {
    let former = await db.get("SELECT id FROM ModuleSetting WHERE matrixRoomId = ? AND moduleName = ?", roomId, moduleName);
    if (typeof former === "undefined") {
        await db.run("INSERT INTO ModuleSetting (matrixRoomId, moduleName, enabled) VALUES (?, ?, ?)", roomId, moduleName, enabled);
    }
    else {
        await db.run("UPDATE ModuleSetting SET enabled = ? WHERE id = ?", enabled, former.id);
    }
}
exports.upsertModuleSettingEnabled = upsertModuleSettingEnabled;
async function upsertModuleSettingOptions(roomId, moduleName, options) {
    let stringified = JSON.stringify(options);
    let former = await db.get("SELECT id FROM ModuleSetting WHERE matrixRoomId = ? AND moduleName = ?", roomId, moduleName);
    if (typeof former === "undefined") {
        await db.run("INSERT INTO ModuleSetting (matrixRoomId, moduleName, enabled, options) VALUES (?, ?, ?, ?)", roomId, moduleName, false /*enabled*/, stringified);
    }
    else {
        await db.run("UPDATE ModuleSetting SET options = ? WHERE id = ?", stringified, former.id);
    }
}
exports.upsertModuleSettingOptions = upsertModuleSettingOptions;
async function getModuleSettings() {
    let results = await db.all("SELECT moduleName, matrixRoomId, enabled, options FROM ModuleSetting;");
    return results;
}
exports.getModuleSettings = getModuleSettings;
