let settings = require("../settings");

// All the admin commands must start with !admin.

const ENABLE_REGEXP = /!admin (enable|disable) ([a-zA-Z-]+)/g;
const ENABLE_ALL_REGEXP = /!admin (enable|disable)-all ([a-zA-Z-]+)/g;

// set MODULE_NAME KEY VALUE
const SET_REGEXP = /!admin set(-all)? ([a-zA-Z-]+) ([a-zA-Z-_]+) (.*)/g;
const GET_REGEXP = /!admin get(-all)? ([a-zA-Z-]+) ([a-zA-Z-_]+)/g;

async function isAdmin(from, extra) {
  // At the moment, do something simple.
  return extra.owner === from;
}

function moduleExists(moduleName, extra) {
  return extra.handlerNames.indexOf(moduleName) !== -1;
}

async function enableForRoom(client, regexp, msg, room, extra) {
  regexp.lastIndex = 0;

  let match = regexp.exec(msg.body);
  if (match === null) {
    return false;
  }

  let enabled = match[1] === "enable";
  let moduleName = match[2];

  if (!moduleExists(moduleName, extra)) {
    client.sendText(msg.room, "Unknown module.");
    return true;
  }

  await settings.enableModule(room, moduleName, enabled);

  let enabledText = match[1] + "d"; // heh
  let roomText = room === "*" ? "all the rooms" : "this room";
  client.sendText(
    msg.room,
    `The module ${moduleName} has been ${enabledText} in ${roomText}.`
  );

  return true;
}

async function tryEnable(client, msg, extra) {
  return enableForRoom(client, ENABLE_REGEXP, msg, msg.room, extra);
}

async function tryEnableAll(client, msg, extra) {
  return enableForRoom(client, ENABLE_ALL_REGEXP, msg, "*", extra);
}

async function tryList(client, msg, extra) {
  if (msg.body.trim() !== "!admin list") {
    return false;
  }
  let response = extra.handlerNames.join(", ");
  client.sendText(msg.room, response);
  return true;
}

async function tryEnabledStatus(client, msg, extra) {
  if (msg.body.trim() !== "!admin status") {
    return false;
  }

  let response = "";

  let status = await settings.getSettings();

  for (const roomId in status) {
    let roomText = roomId === "*" ? "all" : roomId;

    let enabledModules = Object.keys(status[roomId])
      .map(key => {
        if (
          typeof status[roomId] !== "undefined" &&
          typeof status[roomId][key] === "object" &&
          typeof status[roomId][key].enabled !== "undefined"
        ) {
          return status[roomId][key].enabled ? key : "!" + key;
        }
        return undefined;
      })
      .filter(x => x !== undefined);

    if (!enabledModules.length) {
      continue;
    }
    enabledModules = enabledModules.join(", ");

    response += `${roomText}: ${enabledModules}\n`;
  }

  if (!response.length) {
    return true;
  }

  client.sendText(msg.room, response);
  return true;
}

async function trySet(client, msg, extra) {
  SET_REGEXP.lastIndex = 0;

  let match = SET_REGEXP.exec(msg.body);
  if (match === null) {
    return false;
  }

  let roomId, whichRoom;
  if (typeof match[1] !== "undefined") {
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
  let value = match[4];
  await settings.setOption(roomId, moduleName, key, value);

  client.sendText(msg.room, `set value for ${whichRoom}`);
  return true;
}

async function tryGet(client, msg, extra) {
  GET_REGEXP.lastIndex = 0;

  let match = GET_REGEXP.exec(msg.body);
  if (match === null) {
    return false;
  }

  let roomId, whichRoom;
  if (typeof match[1] !== "undefined") {
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

async function handler(client, msg, extra) {
  if (!msg.body.startsWith("!admin")) {
    return;
  }
  if (!(await isAdmin(msg.sender, extra))) {
    return;
  }
  if (await tryEnable(client, msg, extra)) {
    return;
  }
  if (await tryEnableAll(client, msg, extra)) {
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

module.exports = {
  handler,
  help: `Helps administrator configure the current Botzilla instance.
    Possible commands are: enable (module)|disable (module)|enable-all (module)|disable-all (module)|list|status|set|get`
};
