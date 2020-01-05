// Provides random uuids.
let uuid = require("uuid/v4");

module.exports = {
  handler: async function pun(client, roomId, msg) {
    if (msg.indexOf("!uuid") === -1) {
      return;
    }
    let text = uuid();
    client.sendText(roomId, text);
  },

  help: "Generates a random uuid following uuidv4."
};
