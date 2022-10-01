"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Provides random uuids.
const uuid_1 = require("uuid");
module.exports = {
    handler: async function uuidHandler(client, msg) {
        if (msg.body.indexOf("!uuid") === -1) {
            return;
        }
        let text = (0, uuid_1.v4)();
        client.sendText(msg.room, text);
    },
    help: "Generates a random uuid following uuidv4.",
};
