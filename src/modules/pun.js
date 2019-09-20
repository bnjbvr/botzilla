let { promisify } = require("util");
let request = require("request");

const req = promisify(request);
const URL = "https://icanhazdadjoke.com/";

// TODO probably better to pick a set of puns instead of relying on the
// external website, to avoid offensive content.

module.exports = async function pun(client, roomId, msg) {
  if (msg.indexOf("!pun") === -1) {
    return;
  }

  let resp = await req({
    headers: {
      accept: "application/json"
    },
    uri: URL
  });
  let json = JSON.parse(resp.body);
  client.sendText(roomId, json.joke);
};
