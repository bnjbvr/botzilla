let { requestJson } = require("../utils");

const URL = "https://treestatus.mozilla-releng.net/trees2";
const MATCH_REGEXP = /!tree ?([a-zA-Z-]+)?/g;

function formatOne(treeInfo) {
  let reason =
    treeInfo.status !== "open" && treeInfo.reason && treeInfo.reason.length > 0
      ? ` (${treeInfo.reason})`
      : "";
  return `${treeInfo.tree}: ${treeInfo.status}${reason}`;
}

module.exports = async function onmessage(client, roomId, msg) {
  MATCH_REGEXP.lastIndex = 0;

  let match = MATCH_REGEXP.exec(msg);
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
      client.sendText(roomId, `unknown tree '${whichTree}'`);
    } else {
      client.sendText(roomId, formatOne(treeInfo));
    }
  } else {
    // Respond with a few interesting trees.
    let msg = ["autoland", "mozilla-inbound", "try"]
      .map(name => treeMap[name])
      .map(formatOne)
      .join("\n");
    client.sendText(roomId, msg);
  }
};

// Uncomment to test.
//onmessage({ sendText: console.log.bind(console) }, 42, "!tree autoland");
