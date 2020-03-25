const github = require("octonode");

let GITHUB_CLIENT = null;

async function init(config) {
  GITHUB_CLIENT = github.client(config.githubToken);
}

const PATH = "users/{USER}/{USER}.{ERA}.txt";

const CONFESSION_REGEXP = /^confession:(.*)/g;

let reactionId = 0;

// TODO make this available to all the modules.
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

let aliasCache = {};

async function handler(client, msg, extra) {
  if (!GITHUB_CLIENT) {
    return;
  }

  CONFESSION_REGEXP.lastIndex = 0;
  let match = CONFESSION_REGEXP.exec(msg.body);
  if (match === null) {
    return;
  }

  let confession = match[1].trim();
  if (!confession.length) {
    return;
  }

  // TODO make this a service accessible to all the modules. This finds
  // possible aliases for a given roomId.
  let roomAlias = aliasCache[msg.room];
  if (!roomAlias) {
    try {
      let resp = await client.getRoomStateEvent(
        msg.room,
        "m.room.canonical_alias",
        ""
      );
      if (resp && resp.alias) {
        let alias = resp.alias;
        let resolvedRoomId = await client.resolveRoom(alias);
        if (resolvedRoomId === msg.room) {
          aliasCache[msg.room] = alias;
          roomAlias = alias;
        }
      }
    } catch (err) {
      // Ignore.
    }
  }
  if (!roomAlias) {
    roomAlias = msg.room;
  }

  // TODO make this a value a setting?
  let repo = GITHUB_CLIENT.repo("bnjbvr/histoire");

  let now = (Date.now() / 1000) | 0; // for ye ol' asm.js days.

  // Find the million second period (~1.5 weeks) containing this timestamp.
  let era = now - (now % 1000000);

  // Remove prefix '@'.
  let from = msg.sender.substr(1, msg.sender.length);

  let path = PATH.replace(/\{USER\}/g, from).replace("{ERA}", era);
  let newLine = `${now} ${roomAlias} ${confession}`;
  let commitMessage = `update from ${from}`;

  try {
    let resp = await repo.contentsAsync(path);
    let sha = resp[0].sha;

    let content = Buffer.from(resp[0].content, "base64").toString();
    content += `\n${newLine}`;

    await repo.updateContentsAsync(path, commitMessage, content, sha);
    await sendReaction(client, msg);
  } catch (err) {
    if (err.statusCode && err.statusCode === 404) {
      // Create the file.
      await repo.createContentsAsync(path, commitMessage, newLine);
      await sendReaction(client, msg);
    } else {
      throw err;
    }
  }
}

module.exports = {
  handler,
  init,
  help:
    "Notes confessions on the mrgiggles/histoire repository. They'll eventually appear on https://mrgiggles.github.io/histoire."
};
