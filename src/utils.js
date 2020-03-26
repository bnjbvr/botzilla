let { promisify } = require("util");
let request = require("request");

const promiseRequest = promisify(request);

async function requestJson(url) {
  let options = {
    uri: url,
    headers: {
      accept: "application/json"
    }
  };
  let response = await promiseRequest(options);
  return JSON.parse(response.body);
}

let aliasCache = {};
async function getRoomAlias(client, roomId) {
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
async function sendReaction(client, msg, emoji = "👀") {
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

async function sendThumbsUp(client, msg) {
  return sendReaction(client, msg, "👍️");
}
async function sendSeen(client, msg) {
  return sendReaction(client, msg, "👀");
}

class Cooldown {
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
  }

  check(key) {
    let entry = this._ensureEntry(key);
    let result = entry.timer === null && entry.numMessages === 0;
    if (this.numMessages !== null) {
      entry.numMessages = (entry.numMessages + 1) % this.numMessages;
    }
    return result;
  }
}

module.exports = {
  request: promiseRequest,
  requestJson,
  getRoomAlias,
  sendReaction,
  sendThumbsUp,
  sendSeen,
  Cooldown
};
