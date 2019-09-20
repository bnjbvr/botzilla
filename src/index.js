let {
  MatrixClient,
  SimpleFsStorageProvider,
  AutojoinRoomsMixin,
  RichReply
} = require("matrix-bot-sdk");

let fs = require("fs");

// Match handler names (as specified in the configuration handler key) to
// scripts paths in ./modules/.
const HANDLER_NAMES = {
  "expand-bug": "expand-bug",
  "horse-js": "horse",
  "tree-status": "treestatus",
  pun: "pun"
};

function loadConfig() {
  let config = JSON.parse(fs.readFileSync("./config.json"));

  const handlers = [];
  for (let handler of config.handlers) {
    let moduleFileName = HANDLER_NAMES[handler];
    if (moduleFileName) {
      console.log("Loading handler:", handler);
      let module = require(`./modules/${moduleFileName}`);
      handlers.push(module);
    } else {
      console.warn("Unknown handler:", handler);
    }
  }

  return {
    homeserverUrl: config.homeserver,
    accessToken: config.accessToken,
    handlers
  };
}

function makeHandleCommand(client, handlers) {
  return async function handleCommand(roomId, event) {
    console.log("Received event: ", JSON.stringify(event));

    // Don't handle events that don't have contents (they were probably redacted)
    if (!event["content"]) {
      return;
    }

    // Don't handle non-text events
    if (event["content"]["msgtype"] !== "m.text") {
      return;
    }

    // We never send `m.text` messages so this isn't required, however this is
    // how you would filter out events sent by the bot itself.
    if (event["sender"] === (await client.getUserId())) {
      return;
    }

    // Make sure that the event looks like a command we're expecting
    let body = event["content"]["body"];

    if (!body) {
      return;
    }

    body = body.trim();
    if (!body.length) {
      return;
    }

    for (let handler of handlers) {
      try {
        await handler(client, roomId, body);
      } catch (err) {
        console.error("Handler error: ", err);
      }
    }
  };
}

async function main() {
  const config = loadConfig();

  // We'll want to make sure the bot doesn't have to do an initial sync every
  // time it restarts, so we need to prepare a storage provider. Here we use
  // a simple JSON database.
  const storage = new SimpleFsStorageProvider("botzilla.json");

  // Now we can create the client and set it up to automatically join rooms.
  const client = new MatrixClient(
    config.homeserverUrl,
    config.accessToken,
    storage
  );
  AutojoinRoomsMixin.setupOnClient(client);

  // We also want to make sure we can receive events - this is where we will
  // handle our command.
  client.on("room.message", makeHandleCommand(client, config.handlers));

  // Now that the client is all set up and the event handler is registered, start the
  // client up. This will start it syncing.
  await client.start();
  console.log("Client started!");
}

// No top-level await, alright.
main().catch(err => {
  console.error("Error in main:", err.stack);
});
