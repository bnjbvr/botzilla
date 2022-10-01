"use strict";
// Expands "bug XXXXXX" into a short URL to the bug, the status, assignee and
// title of the bug.
//
// Note: don't catch expansions when seeing full Bugzilla URLs, because the
// Matrix client may or may not display the URL, according to channel's
// settings, users' settings, etc. and it's not possible to do something wise
// for all the possible different configurations.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils = __importStar(require("../utils"));
const BUG_NUMBER_REGEXP = /[Bb]ug (\d+)/g;
const COOLDOWN_TIME = 120000; // milliseconds
const COOLDOWN_NUM_MESSAGES = 15;
let cooldowns = {};
async function handleBug(client, roomId, bugNumber) {
    if (typeof cooldowns[bugNumber] === "undefined") {
        cooldowns[bugNumber] = new utils.Cooldown(null, 5);
    }
    let cooldown = cooldowns[bugNumber];
    if (!cooldown.check(roomId)) {
        return;
    }
    let url = `https://bugzilla.mozilla.org/rest/bug/${bugNumber}?include_fields=summary,assigned_to,status,resolution`;
    let response = await utils.request(url);
    if (!response) {
        return;
    }
    let shortUrl = `https://bugzil.la/${bugNumber}`;
    if (response.statusCode === 401) {
        // Probably a private bug! Just send the basic information.
        cooldown.didAnswer(roomId);
        client.sendText(roomId, shortUrl);
        return;
    }
    if (response.statusCode !== 200) {
        return;
    }
    let json = JSON.parse(response.body);
    if (!json.bugs || !json.bugs.length) {
        return;
    }
    let bug = json.bugs[0];
    let msg = `${shortUrl} — ${bug.status} (${bug.assigned_to_detail.nick}) — ${bug.summary}`;
    cooldown.didAnswer(roomId);
    client.sendText(roomId, msg);
}
async function expandBugNumber(client, msg) {
    for (let key of Object.getOwnPropertyNames(cooldowns)) {
        cooldowns[key].onNewMessage(msg.room);
    }
    let matches = null;
    while ((matches = BUG_NUMBER_REGEXP.exec(msg.body)) !== null) {
        await handleBug(client, msg.room, matches[1]);
    }
}
module.exports = {
    handler: expandBugNumber,
    help: "Expands bug numbers into (URL, status, assignee, title) when it sees 'bug 123456'.",
};
