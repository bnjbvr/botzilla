let {
  MatrixClient,
  SimpleFsStorageProvider,
  AutojoinRoomsMixin,
  RichReply
} = require("matrix-bot-sdk");

let fs = require("fs");
let path = require("path");

function loadConfig(fileName) {
  let config = JSON.parse(fs.readFileSync(fileName));

  const handlers = [];
  const handlerNames = [];
  const helpMessages = {};

  function addOneModule(handlerName) {
    let mod;
    try {
      mod = require(`./modules/${handlerName}`);
    } catch (err) {
      console.error("unknown handler:", handlerName);
      return;
    }
    handlerNames.push(handlerName);
    handlers.push(mod.handler);
    helpMessages[handlerName] = mod.help || "No help for this module.";
  }

  for (let handlerName of config.handlers) {
    addOneModule(handlerName);
  }

  if (!handlerNames.includes("help")) {
    addOneModule("help");
  }

  return {
    homeserverUrl: config.homeserver,
    accessToken: config.accessToken,
    handlers,
    extra: {
      handlerNames,
      helpMessages
    }
  };
}

function makeHandleCommand(client, config) {
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

    for (let handler of config.handlers) {
      let extra = Object.assign({}, config.extra);
      try {
        await handler(client, roomId, body, extra);
      } catch (err) {
        console.error("Handler error: ", err);
      }
    }
  };
}

async function createClient(configFilename) {
  const config = loadConfig(configFilename);

  const prefix = configFilename.replace(".json", "").replace("config-", "");

  const storageDir = path.join("data", prefix);
  if (!fs.existsSync("./data")) {
    fs.mkdirSync("./data");
  }
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir);
  }

  // We'll want to make sure the bot doesn't have to do an initial sync every
  // time it restarts, so we need to prepare a storage provider. Here we use
  // a simple JSON database.
  const storage = new SimpleFsStorageProvider(
    path.join(storageDir, "matrix.json")
  );

  // Now we can create the client and set it up to automatically join rooms.
  const client = new MatrixClient(
    config.homeserverUrl,
    config.accessToken,
    storage
  );
  AutojoinRoomsMixin.setupOnClient(client);

  // We also want to make sure we can receive events - this is where we will
  // handle our command.
  client.on("room.message", makeHandleCommand(client, config));

  // Now that the client is all set up and the event handler is registered, start the
  // client up. This will start it syncing.
  await client.start();
  console.log("Client started!");
}

async function main() {
  let argv = process.argv;

  // Remove node executable name + script name.
  while (argv.length && argv[0] !== __filename) {
    argv = argv.splice(1);
  }
  argv = argv.splice(1);

  // Remove script name.
  const cliArgs = argv;

  for (let arg of cliArgs) {
    if (arg === "-h" || arg === "--help") {
      console.log(`USAGE: [cmd] CONFIG1.json CONFIG2.json

-h, --help: Displays this message.

CONFIG[n] files are config.json files based on config.json.example.
`);
      process.exit(0);
    }
  }

  let configFilenames = cliArgs.length ? cliArgs : ["config.json"];

  for (let configFilename of configFilenames) {
    await createClient(configFilename);
  }
}

// No top-level await, alright.
main().catch(err => {
  console.error("Error in main:", err.stack);
});
