let { requestJson } = require('../utils');

const URL = "https://treestatus.mozilla-releng.net/trees2";
const MATCH_REGEXP = /!tree ?([a-zA-Z-]+)?/g;

module.exports = async function onmessage(client, roomId, msg) {
  MATCH_REGEXP.lastIndex = 0;

  let match = MATCH_REGEXP.exec(msg);
  if (match === null) {
    return;
  }

  let whichTree = match[1]; // first group.

  let results = (await requestJson(URL)).result;
  for (let result of results) {
    if (whichTree) {
      if (result.tree !== whichTree) {
        continue;
      }
    } else {
      switch (result.tree) {
        case "autoland":
        case "mozilla-inbound":
        case "mozilla-central":
        case "mozilla-beta":
        case "mozilla-release":
          break;

        default:
          continue;
      }
    }

    let reason =
      result.status !== "open" && result.reason && result.reason.length > 0
        ? ` (${result.reason})`
        : "";
    let msg = `${result.tree}: ${result.status}${reason}`;
    client.sendText(roomId, msg);
  }
};

// Uncomment to test.
//onmessage({ sendText: console.log.bind(console) }, 42, "!tree autoland");
