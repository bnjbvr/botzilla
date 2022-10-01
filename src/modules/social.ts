import { Masto } from "masto";
import { Twit } from "twit";

import * as github from "octonode";
import * as settings from "../settings";
import * as utils from "../utils";

const TOOT_REGEXP = /^!(toot|mastodon) (.*)/g;
const TWEET_REGEXP = /^!(tweet|twitter) (.*)/g;

interface MastodonConfig {
  baseUrl: string;
  accessToken: string;
}

interface TwitterConfig {
  consumer_key: string;
  consumer_secret: string;
  access_token: string;
  access_token_secret: string;
}

let CONFIG_MASTODON: { [roomAlias: string]: MastodonConfig } | null = null;
let CONFIG_TWITTER: { [roomAlias: string]: TwitterConfig } | null = null;

async function init(config) {
  CONFIG_MASTODON = config.mastodon || null;
  CONFIG_TWITTER = config.twitter || null;
}

async function toot(client, msg, extra): Promise<boolean> {
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

  const masto = await Masto.login({
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
async function twitter(client, msg, extra): Promise<boolean> {
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
  let {
    consumer_key,
    consumer_secret,
    access_token,
    access_token_secret,
  } = CONFIG_TWITTER[alias];
  if (
    !consumer_key ||
    !consumer_secret ||
    !access_token ||
    !access_token_secret
  ) {
    return true;
  }

  if (!(await utils.isAdmin(client, msg.room, msg.sender, extra))) {
    return true;
  }

  const T = new Twit({
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
  if (await toot(client, msg, extra)) {
    return;
  }
  if (await twitter(client, msg, extra)) {
    return;
  }
}

module.exports = {
  handler,
  init,
  help: "Helps posting to Mastodon/Twitter accounts from Matrix",
};
