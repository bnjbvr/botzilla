let { requestJson } = require("../utils");

const URL = "https://treestatus.mozilla-releng.net/trees2";
const MATCH_REGEXP = /!treestatus ?([a-zA-Z-]+)?/g;

function formatOne(treeInfo) {
  let reason =
    treeInfo.status !== "open" && treeInfo.reason && treeInfo.reason.length > 0
      ? ` (${treeInfo.reason})`
      : "";
  return `${treeInfo.tree}: ${treeInfo.status}${reason}`;
}

async function handler(client, msg) {
  MATCH_REGEXP.lastIndex = 0;

  let match = MATCH_REGEXP.exec(msg.body);
  if (match === null) {
    return;
  }

  let whichTree = match[1]; // first group.

  let results = (await requestJson(URL)).result;
  let treeMap = {};
  for (let result of results) {
    treeMap[result.tree] = result;
  }

  if (whichTree) {
    if (!treeMap[whichTree]) {
      // Try mozilla- with the tree name, to allow inbound instead of
      // mozilla-inbound.
      whichTree = `mozilla-${whichTree}`;
    }

    let treeInfo = treeMap[whichTree];
    if (!treeInfo) {
      client.sendText(msg.room, `unknown tree '${whichTree}'`);
    } else {
      client.sendText(msg.room, formatOne(treeInfo));
    }
  } else {
    // Respond with a few interesting trees.
    let answer = ["autoland", "mozilla-inbound", "try"]
      .map(name => treeMap[name])
      .map(formatOne)
      .join("\n");
    client.sendText(msg.room, answer);
  }
}

module.exports = {
  handler,

  help:
    "Reads the status of all the trees with !treestatus, or of a single one with !treestatus NAME, if it's a well-known tree."
};
