"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Provides random uuids.
const v4_1 = __importDefault(require("uuid/v4"));
module.exports = {
    handler: async function uuidHandler(client, msg) {
        if (msg.body.indexOf("!uuid") === -1) {
            return;
        }
        let text = v4_1.default();
        client.sendText(msg.room, text);
    },
    help: "Generates a random uuid following uuidv4."
};
