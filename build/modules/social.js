"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
const masto_1 = require("masto");
const twit_1 = require("twit");
const utils = __importStar(require("../utils"));
const TOOT_REGEXP = /^!(toot|mastodon) (.*)/g;
const TWEET_REGEXP = /^!(tweet|twitter) (.*)/g;
let CONFIG_MASTODON = null;
let CONFIG_TWITTER = null;
async function init(config) {
    CONFIG_MASTODON = config.mastodon || null;
    CONFIG_TWITTER = config.twitter || null;
}
async function toot(client, msg, extra) {
    if (CONFIG_MASTODON === null) {
        return false;
    }
    TOOT_REGEXP.lastIndex = 0;
    let match = TOOT_REGEXP.exec(msg.body);
    if (match === null) {
        return false;
    }
    let content = match[2];
    let alias = await utils.getRoomAlias(client, msg.room);
    if (!alias) {
        return false;
    }
    if (typeof CONFIG_MASTODON[alias] === "undefined") {
        return true;
    }
    let { baseUrl, accessToken } = CONFIG_MASTODON[alias];
    if (!baseUrl || !accessToken) {
        return true;
    }
    if (!(await utils.isAdmin(client, msg.room, msg.sender, extra))) {
        return true;
    }
    const masto = await masto_1.Masto.login({
        uri: baseUrl,
        accessToken,
    });
    await masto.createStatus({
        status: content,
        visibility: "public",
    });
    await utils.sendSeen(client, msg);
    return true;
}
// WARNING: not tested yet.
async function twitter(client, msg, extra) {
    if (CONFIG_TWITTER === null) {
        return false;
    }
    TWEET_REGEXP.lastIndex = 0;
    let match = TWEET_REGEXP.exec(msg.body);
    if (match === null) {
        return false;
    }
    let content = match[2];
    let alias = await utils.getRoomAlias(client, msg.room);
    if (!alias) {
        return false;
    }
    if (typeof CONFIG_TWITTER[alias] === "undefined") {
        return true;
    }
    let { consumer_key, consumer_secret, access_token, access_token_secret, } = CONFIG_TWITTER[alias];
    if (!consumer_key ||
        !consumer_secret ||
        !access_token ||
        !access_token_secret) {
        return true;
    }
    if (!(await utils.isAdmin(client, msg.room, msg.sender, extra))) {
        return true;
    }
    const T = new twit_1.Twit({
        consumer_key,
        consumer_secret,
        access_token,
        access_token_secret,
    });
    await T.post("statuses/update", { status: content });
    await utils.sendSeen(client, msg);
    return true;
}
async function handler(client, msg, extra) {
    if (toot(client, msg, extra)) {
        return;
    }
    if (twitter(client, msg, extra)) {
        return;
    }
}
module.exports = {
    handler,
    init,
    help: "Helps posting to Mastodon/Twitter accounts from Matrix",
};
