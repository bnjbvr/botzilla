// Suggest reviewers for given file in m-c.
//
// This communicates with hg.m.o to get the log.

const { requestJson } = require("../utils");

const JSON_URL = "https://hg.mozilla.org/mozilla-central/json-log/tip/";
const MESSAGE_REGEXP = /[wW]ho (?:can review|has reviewed) (?:a patch in |patches in )?\/?(\S+?)\s*\??$/;
const REVIEWER_REGEXP = /r=(\S+)/;
const MAX_REVIEWERS = 3;

async function getReviewers(path) {
  const url = `${JSON_URL}${path}`;
  const log = await requestJson(url);

  const reviewers = {};
  for (const item of log.entries) {
    const m = item.desc.match(REVIEWER_REGEXP);
    if (!m) {
      continue;
    }

    for (const r of m[1].split(",")) {
      if (r in reviewers) {
        reviewers[r]++;
      } else {
        reviewers[r] = 1;
      }
    }
  }

  return Object.entries(reviewers)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      return b.count - a.count;
    });
}

module.exports = {
  handler: async function(client, msg) {
    const m = msg.body.match(MESSAGE_REGEXP);
    if (!m) {
      return;
    }

    const path = m[1];

    try {
      const reviewers = await getReviewers(path);

      if (reviewers.length > MAX_REVIEWERS) {
        reviewers.length = MAX_REVIEWERS;
      }

      const list = reviewers
        .map(({ name, count }) => {
          return `${name} x ${count}`;
        })
        .join(", ");

      client.sendText(msg.room, `${list} : /${path}`);
    } catch (e) {
      client.sendText(msg.room, `Could not find reviewers for /${path}`);
    }
  },

  help: "Suggest reviewers for given file in m-c. Usage: Who can review <path>?"
};
