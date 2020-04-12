import { promisify } from "util";
import requestModule from "request";
import { MatrixClient } from "matrix-bot-sdk";

export interface Message {
  body: string;
  sender: string;
  room: string;
  event: object;
}

export interface ModuleHandler {
  // The function that's called when a message is received.
  handler: (client: MatrixClient, msg: Message, extra: object) => void;

  // An help message for the given module.
  help: string;

  // An initialization function that's passed the content of the config.json
  // file.
  init?: (config: object) => void;
}

export function assert(test: boolean, msg: string): asserts test {
  if (!test) {
    throw new Error("assertion error: " + msg);
  }
}

export const request = promisify(requestModule);

export async function requestJson(url) {
  let options = {
    uri: url,
    headers: {
      accept: "application/json"
    }
  };
  let response = await request(options);
  return JSON.parse(response.body);
}

let aliasCache = {};
export async function getRoomAlias(client: MatrixClient, roomId) {
  // TODO make this a service accessible to all the modules. This finds
  // possible aliases for a given roomId.
  let roomAlias = aliasCache[roomId];
  if (!roomAlias) {
    try {
      let resp = await client.getRoomStateEvent(
        roomId,
        "m.room.canonical_alias",
        ""
      );
      if (resp && resp.alias) {
        let alias = resp.alias;
        let resolvedRoomId = await client.resolveRoom(alias);
        if (resolvedRoomId === roomId) {
          aliasCache[roomId] = alias;
          roomAlias = alias;
        }
      }
    } catch (err) {
      // Ignore.
    }
  }
  // May be undefined.
  return roomAlias;
}

let reactionId = 0;
export async function sendReaction(client: MatrixClient, msg, emoji = "👀") {
  let encodedRoomId = encodeURIComponent(msg.room);

  let body = {
    "m.relates_to": {
      rel_type: "m.annotation",
      event_id: msg.event.event_id,
      key: emoji
    }
  };

  let now = (Date.now() / 1000) | 0;
  let transactionId = now + "_botzilla_emoji" + reactionId++;
  let resp = await client.doRequest(
    "PUT",
    `/_matrix/client/r0/rooms/${encodedRoomId}/send/m.reaction/${transactionId}`,
    null, // qs
    body
  );
}

export async function sendThumbsUp(client: MatrixClient, msg) {
  return sendReaction(client, msg, "👍️");
}
export async function sendSeen(client: MatrixClient, msg) {
  return sendReaction(client, msg, "👀");
}

async function isMatrixAdmin(
  client: MatrixClient,
  roomId: string,
  userId: string
): Promise<boolean> {
  let powerLevels = await client.getRoomStateEvent(
    roomId,
    "m.room.power_levels",
    ""
  );
  return (
    typeof powerLevels.users !== "undefined" &&
    typeof powerLevels.users[userId] === "number" &&
    powerLevels.users[userId] >= 50
  );
}

export function isSuperAdmin(userId, extra) {
  return extra.owner === userId;
}

export async function isAdmin(
  client: MatrixClient,
  roomId: string,
  userId: string,
  extra
): Promise<boolean> {
  return (
    isSuperAdmin(userId, extra) || (await isMatrixAdmin(client, roomId, userId))
  );
}

interface CooldownEntry {
  timer: NodeJS.Timeout | null;
  numMessages: number;
}

export class Cooldown {
  timeout: number;
  numMessages: number;
  map: { [roomId: string]: CooldownEntry };

  constructor(timeout, numMessages) {
    this.timeout = timeout;
    this.numMessages = numMessages;
    this.map = {};
  }

  _ensureEntry(key) {
    if (typeof this.map[key] === "undefined") {
      this.map[key] = {
        numMessages: 0,
        timer: null
      };
    }
    return this.map[key];
  }

  didAnswer(key) {
    let entry = this._ensureEntry(key);
    if (this.timeout !== null) {
      if (entry.timer !== null) {
        clearTimeout(entry.timer);
      }
      entry.timer = setTimeout(() => {
        entry.timer = null;
      }, this.timeout);
    }
    if (this.numMessages !== null) {
      entry.numMessages = this.numMessages;
    }
  }

  onNewMessage(key) {
    if (this.numMessages !== null) {
      let entry = this._ensureEntry(key);
      if (entry.numMessages > 0) {
        entry.numMessages -= 1;
      }
    }
  }

  check(key) {
    let entry = this._ensureEntry(key);
    return entry.timer === null && entry.numMessages === 0;
  }
}
