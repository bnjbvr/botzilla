let { requestJson } = require("../utils");

const URL = "https://icanhazdadjoke.com/";

// TODO probably better to pick a set of puns instead of relying on the
// external website, to avoid offensive content.

module.exports = async function pun(client, roomId, msg) {
  if (msg.indexOf("!pun") === -1) {
    return;
  }
  let json = await requestJson(URL);
  client.sendText(roomId, json.joke);
};
