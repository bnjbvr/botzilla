// Expands "bug XXXXXX" into a short URL to the bug, the status, assignee and
// title of the bug.

let { request } = require("../utils");

const BUG_NUMBER_REGEXP = /[Bb]ug (\d+)/g;

const COOLDOWN_TIME = 120000; // milliseconds

// Map roomId to bug-number to timer.
const cooldown = new Map();

async function expandBugNumber(client, roomId, msg) {
  var matches = null;
  while ((matches = BUG_NUMBER_REGEXP.exec(msg)) !== null) {
    let bugNumber = matches[1];

    let roomCooldown = cooldown.get(roomId);
    if (typeof roomCooldown !== "undefined") {
      if (typeof roomCooldown.get(bugNumber) !== "undefined") {
        // Skip to avoid spamming the room.
        continue;
      }
    } else {
      roomCooldown = new Map();
      cooldown.set(roomId, roomCooldown);
    }

    let url = `https://bugzilla.mozilla.org/rest/bug/${bugNumber}?include_fields=summary,assigned_to,status,resolution`;

    let response = await request(url);
    if (!response) {
      continue;
    }

    let shortUrl = `https://bugzil.la/${bugNumber}`;
    if (response.statusCode === 401) {
      // Probably a private bug! Just send the basic information.
      client.sendText(roomId, shortUrl);
      continue;
    }

    if (response.statusCode !== 200) {
      continue;
    }

    let json = JSON.parse(response.body);
    if (!json.bugs || !json.bugs.length) {
      continue;
    }

    let bug = json.bugs[0];
    let msg = `${shortUrl} — ${bug.status} (${bug.assigned_to_detail.nick}) — ${bug.summary}`;
    client.sendText(roomId, msg);

    let timerId = setTimeout(() => {
      roomCooldown.delete(bugNumber);
    }, COOLDOWN_TIME);

    roomCooldown.set(bugNumber, timerId);
  }
}

module.exports = {
  handler: expandBugNumber,

  help:
    "Expands bug numbers into (URL, status, assignee, title) when it sees 'bug 123456'."
};
