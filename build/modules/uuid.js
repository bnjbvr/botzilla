"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// Provides random uuids.
const uuid = __importStar(require("uuid/v4"));
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
