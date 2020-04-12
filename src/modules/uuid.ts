// Provides random uuids.
import * as uuid from "uuid/v4";

module.exports = {
  handler: async function pun(client, msg) {
    if (msg.body.indexOf("!uuid") === -1) {
      return;
    }
    let text = uuid();
    client.sendText(msg.room, text);
  },

  help: "Generates a random uuid following uuidv4."
};
