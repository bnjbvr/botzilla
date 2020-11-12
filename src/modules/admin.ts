import * as settings from "../settings";
import * as utils from "../utils";
import { ModuleHandler } from "../utils";
import { MatrixClient } from "matrix-bot-sdk";

// All the admin commands must start with !admin.
const ENABLE_REGEXP = /!admin (enable|disable)(-all)? ([a-zA-Z-]+)/g;

// set MODULE_NAME KEY VALUE
const SET_REGEXP = /!admin set(-all)? ([a-zA-Z-]+) ([a-zA-Z-_]+) (.*)/g;
// get MODULE_NAME KEY
const GET_REGEXP = /!admin get(-all)? ([a-zA-Z-]+) ([a-zA-Z-_]+)/g;

function moduleExists(moduleName, extra) {
  return extra.handlerNames.indexOf(moduleName) !== -1;
}

async function tryEnable(client: MatrixClient, msg: utils.Message, extra) {
  ENABLE_REGEXP.lastIndex = 0;

  let match = ENABLE_REGEXP.exec(msg.body);
  if (match === null) {
    return false;
  }

  let room;
  if (typeof match[2] !== "undefined") {
    if (!utils.isSuperAdmin(msg.sender, extra)) {
      return true;
    }
    room = "*";
  } else {
    room = msg.room;
  }

  let enabled = match[1] === "enable";
  let moduleName = match[3];

  if (!moduleExists(moduleName, extra)) {
    client.sendText(msg.room, "Unknown module.");
    return true;
  }

  await settings.enableModule(room, moduleName, enabled);
  await utils.sendThumbsUp(client, msg);
  return true;
}

async function tryList(client: MatrixClient, msg: utils.Message, extra) {
  if (msg.body.trim() !== "!admin list") {
    return false;
  }
  let response = extra.handlerNames.join(", ");
  client.sendText(msg.room, response);
  return true;
}

function enabledModulesInRoom(status, roomId): string | null {
  let enabledModules = Object.keys(status[roomId])
    .map((key) => {
      if (
        typeof status[roomId] !== "undefined" &&
        typeof status[roomId][key] === "object" &&
        typeof status[roomId][key].enabled !== "undefined"
      ) {
        return status[roomId][key].enabled ? key : "!" + key;
      }
      return undefined;
    })
    .filter((x) => x !== undefined);

  if (!enabledModules.length) {
    return null;
  }
  let enabledModulesString = enabledModules.join(", ");
  return enabledModulesString;
}

async function tryEnabledStatus(
  client: MatrixClient,
  msg: utils.Message,
  extra
) {
  if (msg.body.trim() !== "!admin status") {
    return false;
  }

  let response = "";

  let status = await settings.getSettings();

  if (utils.isSuperAdmin(msg.sender, extra)) {
    // For the super admin, include information about all the rooms.
    for (const roomId in status) {
      let roomText;
      if (roomId === "*") {
        roomText = "all";
      } else {
        roomText = await utils.getRoomAlias(client, roomId);
        if (!roomText) {
          roomText = roomId;
        }
      }

      let enabledModulesString = enabledModulesInRoom(status, roomId);
      if (enabledModulesString === null) {
        continue;
      }
      response += `${roomText}: ${enabledModulesString}\n`;
    }
  } else {
    // Only include information about this room.
    if (msg.room in status) {
      let roomText = await utils.getRoomAlias(client, msg.room);
      if (!roomText) {
        roomText = msg.room;
      }

      let enabledModulesString = enabledModulesInRoom(status, msg.room);
      if (enabledModulesString !== null) {
        response += `${roomText}: ${enabledModulesString}\n`;
      }
    }
  }

  if (!response.length) {
    return true;
  }

  client.sendText(msg.room, response);
  return true;
}

async function trySet(client: MatrixClient, msg: utils.Message, extra) {
  SET_REGEXP.lastIndex = 0;

  let match = SET_REGEXP.exec(msg.body);
  if (match === null) {
    return false;
  }

  let roomId, whichRoom;
  if (typeof match[1] !== "undefined") {
    if (!utils.isSuperAdmin(msg.sender, extra)) {
      return true;
    }
    roomId = "*";
  } else {
    roomId = msg.room;
  }

  let moduleName = match[2];
  if (!moduleExists(moduleName, extra)) {
    client.sendText(msg.room, "Unknown module");
    return true;
  }

  let key = match[3];
  let value = match[4];
  await settings.setOption(roomId, moduleName, key, value);

  await utils.sendThumbsUp(client, msg);
  return true;
}

async function tryGet(client: MatrixClient, msg: utils.Message, extra) {
  GET_REGEXP.lastIndex = 0;

  let match = GET_REGEXP.exec(msg.body);
  if (match === null) {
    return false;
  }

  let roomId, whichRoom;
  if (typeof match[1] !== "undefined") {
    if (!utils.isSuperAdmin(msg.sender, extra)) {
      return true;
    }
    roomId = "*";
    whichRoom = "all the rooms";
  } else {
    roomId = msg.room;
    whichRoom = "this room";
  }

  let moduleName = match[2];
  if (!moduleExists(moduleName, extra)) {
    client.sendText(msg.room, "Unknown module");
    return true;
  }

  let key = match[3];
  let read = await settings.getOption(msg.room, moduleName, key);
  client.sendText(msg.room, `${key}'s' value in ${whichRoom} is ${read}`);
  return true;
}

async function handler(
  client: MatrixClient,
  msg: utils.Message,
  extra: object
) {
  if (!msg.body.startsWith("!admin")) {
    return;
  }
  if (!(await utils.isAdmin(client, msg.room, msg.sender, extra))) {
    return;
  }
  if (await tryEnable(client, msg, extra)) {
    return;
  }
  if (await tryEnabledStatus(client, msg, extra)) {
    return;
  }
  if (await tryList(client, msg, extra)) {
    return;
  }
  if (await trySet(client, msg, extra)) {
    return;
  }
  if (await tryGet(client, msg, extra)) {
    return;
  }
  client.sendText(
    msg.room,
    "unknown admin command; possible commands are: 'enable|disable|enable-all|disable-all|list|status|set|get.'"
  );
}

const AdminModule: ModuleHandler = {
  handler,
  help: `Helps administrator configure the current Botzilla instance.
    Possible commands are: enable (module)|disable (module)|enable-all (module)|disable-all (module)|list|status|set|get`,
};

module.exports = AdminModule;
