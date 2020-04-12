"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const sqlite = __importStar(require("sqlite"));
const path = __importStar(require("path"));
let db;
async function init(storageDir) {
    let dbPath = path.join(storageDir, "db.sqlite");
    db = await sqlite.open(dbPath, { promise: Promise, verbose: true });
    db.on("trace", event => console.log(event));
    await db.migrate();
}
exports.init = init;
async function upsertModuleSettingEnabled(roomId, moduleName, enabled) {
    let former = await db.get("SELECT id FROM ModuleSetting WHERE matrixRoomId = ? AND moduleName = ?", roomId, moduleName);
    if (typeof former === "undefined") {
        await db.run("INSERT INTO ModuleSetting (matrixRoomId, moduleName, enabled) VALUES (?, ?, ?)", roomId, moduleName, enabled);
    }
    else {
        await db.run("UPDATE ModuleSetting SET enabled = ? where id = ?", enabled, former.id);
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
        await db.run("UPDATE ModuleSetting SET options = ? where id = ?", stringified, former.id);
    }
}
exports.upsertModuleSettingOptions = upsertModuleSettingOptions;
async function getModuleSettings() {
    let results = await db.all("SELECT moduleName, matrixRoomId, enabled, options FROM ModuleSetting;");
    return results;
}
exports.getModuleSettings = getModuleSettings;
