// DB facilities. Don't use these directly, instead go through the Settings
// module which adds in-memory caching. Only the Settings module should
// directly interact with this.

import * as sqlite from "sqlite";
import sqlite3 from "sqlite3";
import * as path from "path";

let db;

export async function init(storageDir) {
  let dbPath = path.join(storageDir, "db.sqlite");
  db = await sqlite.open({ filename: dbPath, driver: sqlite3.Database });
  db.on("trace", (event) => console.log(event));
  await db.migrate();
}

export async function migrateRoomSettings(
  prevRoomId: string,
  newRoomId: string
) {
  await db.run(
    "UPDATE ModuleSetting SET matrixRoomId = ? WHERE matrixRoomId = ?",
    newRoomId,
    prevRoomId
  );
}

export async function upsertModuleSettingEnabled(roomId, moduleName, enabled) {
  let former = await db.get(
    "SELECT id FROM ModuleSetting WHERE matrixRoomId = ? AND moduleName = ?",
    roomId,
    moduleName
  );
  if (typeof former === "undefined") {
    await db.run(
      "INSERT INTO ModuleSetting (matrixRoomId, moduleName, enabled) VALUES (?, ?, ?)",
      roomId,
      moduleName,
      enabled
    );
  } else {
    await db.run(
      "UPDATE ModuleSetting SET enabled = ? WHERE id = ?",
      enabled,
      former.id
    );
  }
}

export async function upsertModuleSettingOptions(roomId, moduleName, options) {
  let stringified = JSON.stringify(options);
  let former = await db.get(
    "SELECT id FROM ModuleSetting WHERE matrixRoomId = ? AND moduleName = ?",
    roomId,
    moduleName
  );
  if (typeof former === "undefined") {
    await db.run(
      "INSERT INTO ModuleSetting (matrixRoomId, moduleName, enabled, options) VALUES (?, ?, ?, ?)",
      roomId,
      moduleName,
      false /*enabled*/,
      stringified
    );
  } else {
    await db.run(
      "UPDATE ModuleSetting SET options = ? WHERE id = ?",
      stringified,
      former.id
    );
  }
}

export async function getModuleSettings() {
  let results = await db.all(
    "SELECT moduleName, matrixRoomId, enabled, options FROM ModuleSetting;"
  );
  return results;
}
