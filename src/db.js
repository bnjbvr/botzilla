let sqlite = require("sqlite");
let path = require("path");

let db;

async function init(storageDir) {
  let dbPath = path.join(storageDir, "db.sqlite");
  db = await sqlite.open(dbPath, { Promise, verbose: true });
  db.on("trace", event => console.log(event));
  await db.migrate();
}

async function upsertModuleSetting(roomId, moduleName, enabled) {
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
      "UPDATE ModuleSetting SET enabled = ? where id = ?",
      enabled,
      former.id
    );
  }
}

async function getModuleSettings() {
  let results = await db.all(
    "SELECT moduleName, matrixRoomId, enabled FROM ModuleSetting;"
  );
  return results;
}

module.exports = {
  init,
  upsertModuleSetting,
  getModuleSettings
};
