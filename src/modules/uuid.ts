// Provides random uuids.
import { v4 as uuid } from "uuid";

module.exports = {
  handler: async function uuidHandler(client, msg) {
    if (msg.body.indexOf("!uuid") === -1) {
      return;
    }
    let text = uuid();
    client.sendText(msg.room, text);
  },

  help: "Generates a random uuid following uuidv4.",
};
