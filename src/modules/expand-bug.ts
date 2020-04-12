// Expands "bug XXXXXX" into a short URL to the bug, the status, assignee and
// title of the bug.
//
// Note: don't catch expansions when seeing full Bugzilla URLs, because the
// Matrix client may or may not display the URL, according to channel's
// settings, users' settings, etc. and it's not possible to do something wise
// for all the possible different configurations.

import * as utils from "../utils";

const BUG_NUMBER_REGEXP = /[Bb]ug (\d+)/g;

const COOLDOWN_TIME = 120000; // milliseconds
const COOLDOWN_NUM_MESSAGES = 15;

let cooldowns = {};

async function handleBug(client, roomId, bugNumber) {
  if (typeof cooldowns[bugNumber] === "undefined") {
    cooldowns[bugNumber] = new utils.Cooldown(null, 5);
  }
  let cooldown = cooldowns[bugNumber];
  if (!cooldown.check(roomId)) {
    return;
  }

  let url = `https://bugzilla.mozilla.org/rest/bug/${bugNumber}?include_fields=summary,assigned_to,status,resolution`;

  let response = await utils.request(url);
  if (!response) {
    return;
  }

  let shortUrl = `https://bugzil.la/${bugNumber}`;
  if (response.statusCode === 401) {
    // Probably a private bug! Just send the basic information.
    cooldown.didAnswer(roomId);
    client.sendText(roomId, shortUrl);
    return;
  }

  if (response.statusCode !== 200) {
    return;
  }

  let json = JSON.parse(response.body);
  if (!json.bugs || !json.bugs.length) {
    return;
  }

  let bug = json.bugs[0];
  let msg = `${shortUrl} — ${bug.status} (${bug.assigned_to_detail.nick}) — ${bug.summary}`;
  cooldown.didAnswer(roomId);
  client.sendText(roomId, msg);
}

async function expandBugNumber(client, msg) {
  for (let key of Object.getOwnPropertyNames(cooldowns)) {
    cooldowns[key].onNewMessage(msg.room);
  }

  let matches: RegExpExecArray | null = null;
  while ((matches = BUG_NUMBER_REGEXP.exec(msg.body)) !== null) {
    await handleBug(client, msg.room, matches[1]);
  }
}

module.exports = {
  handler: expandBugNumber,
  help:
    "Expands bug numbers into (URL, status, assignee, title) when it sees 'bug 123456'."
};
