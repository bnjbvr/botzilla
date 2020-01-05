// This bot fetches quotes from the @horsejs twitter account, and reads them
// out loud. It's unsafe.

let { requestJson } = require("../utils");

// Constants.
var KNOWN_FRAMEWORKS = [
  "react",
  "angular",
  "jquery",
  "backbone",
  "meteor",
  "vue",
  "mocha",
  "jest"
];

var KNOWN_KEYWORDS = [
  "ember.js",
  "emberjs",
  "node.js",
  "nodejs",
  "crockford",
  "eich",
  "rhino",
  "spidermonkey",
  "v8",
  "spartan",
  "chakra",
  "webkit",
  "blink",
  "jsc",
  "turbofan",
  "tc39",
  "wasm",
  "webassembly",
  "webasm",
  "ecma262",
  "ecmascript"
];

var PRE_LOADED_TWEETS = 10;

const URL = "http://javascript.horse/random.json";

// Global values
var TWEETS = [];

var KEYWORD_MAP = {};

function maybeCacheTweet(tweet) {
  for (var j = 0; j < KNOWN_KEYWORDS.length; j++) {
    var keyword = KNOWN_KEYWORDS[j];
    if (tweet.toLowerCase().indexOf(keyword) === -1) {
      continue;
    }
    console.log("Found:", keyword, "in", tweet);
    KEYWORD_MAP[keyword] = KEYWORD_MAP[keyword] || [];
    KEYWORD_MAP[keyword].push(tweet);
  }
}

async function getTweet() {
  let result = null;
  if (TWEETS.length) {
    result = TWEETS.pop();
  }

  let tweet = (await requestJson(URL)).text;
  if (result !== null) {
    maybeCacheTweet(tweet);
    TWEETS.push(tweet);
  } else {
    result = tweet;
  }
  return result;
}

async function onLoad() {
  // Note all the known keywords.
  for (var i = 0; i < KNOWN_FRAMEWORKS.length; i++) {
    var fw = KNOWN_FRAMEWORKS[i];
    KNOWN_KEYWORDS.push(fw + "js");
    KNOWN_KEYWORDS.push(fw + ".js");
  }
  KNOWN_KEYWORDS = KNOWN_KEYWORDS.concat(KNOWN_FRAMEWORKS);

  // Preload a few tweets.
  var promises = [];
  for (var i = 0; i < PRE_LOADED_TWEETS; i++) {
    promises.push(getTweet());
  }
  let tweets = await Promise.all(promises);
  for (let tweet of tweets) {
    maybeCacheTweet(tweet);
  }
  console.log("preloaded", tweets.length, "tweets");
}

// TODO there should be a way to properly init a submodule. In the meanwhile,
// just do it in the global scope here.
(async function() {
  try {
    await onLoad();
  } catch (err) {
    console.error("when initializing horse.js:", err.message, err.stack);
  }
})();

module.exports = {
  handler: async function(client, roomId, msg) {
    if (msg.indexOf("!horsejs") == -1) {
      return;
    }

    // Try to see if the message contained a known keyword.
    for (var kw in KEYWORD_MAP) {
      if (msg.toLowerCase().indexOf(kw) === -1) {
        continue;
      }
      var tweets = KEYWORD_MAP[kw];
      var index = (Math.random() * tweets.length) | 0;
      client.sendText(roomId, tweets[index]);
      tweets.splice(index, 1);
      return;
    }

    // No it didn't, just send a random tweet.
    let tweet = await getTweet();
    client.sendText(roomId, tweet);
  },

  help: "Tells a random message from the @horsejs twitter account. UNSAFE!"
};
