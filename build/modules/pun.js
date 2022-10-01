"use strict";
// Reads a random pun from icanhazdadjoke.com
// TODO probably better to pick a set of puns instead of relying on the
// external website, to avoid offensive content.
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const URL = "https://icanhazdadjoke.com/";
module.exports = {
    handler: async function pun(client, msg) {
        if (msg.body.indexOf("!pun") === -1) {
            return;
        }
        let json = await (0, utils_1.requestJson)(URL);
        client.sendText(msg.room, json.joke);
    },
    help: "Reads a joke out loud from icanhazdadjoke.com. UNSAFE!",
};
