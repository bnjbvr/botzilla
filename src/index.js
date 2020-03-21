let {
  MatrixClient,
  SimpleFsStorageProvider,
  AutojoinRoomsMixin,
  RichReply,
  LogService,
  LogLevel
} = require("matrix-bot-sdk");

let fs = require("fs");
let path = require("path");

let util = require("util");
let fsReadDir = util.promisify(fs.readdir);

let settings = require("./settings");

async function loadConfig(fileName) {
  let config = JSON.parse(fs.readFileSync(fileName));

  const handlers = [];
  const handlerNames = [];
  const helpMessages = {};

  let moduleNames = await fsReadDir(path.join(__dirname, "modules"));
  moduleNames = moduleNames.map(filename => filename.split(".js")[0]);
  for (let moduleName of moduleNames) {
    let mod = require("./" + path.join("modules", moduleName));
    handlerNames.push(moduleName);
    handlers.push({
      moduleName,
      handler: mod.handler
    });
    helpMessages[moduleName] = mod.help || "No help for this module.";
  }

  return {
    homeserverUrl: config.homeserver,
    accessToken: config.accessToken,
    handlers,
    extra: {
      handlerNames,
      helpMessages,
      owner: config.owner,
      logLevel: config.logLevel || "warn"
    }
  };
}

function makeHandleCommand(client, config) {
  let startTime = Date.now();
  return async function handleCommand(room, event) {
    console.log("Received event: ", JSON.stringify(event));

    // Don't handle events that don't have contents (they were probably redacted)
    let content = event.content;
    if (!content) {
      return;
    }

    // Ignore messages published before we started.
    if (parseInt(event.origin_server_ts) < startTime) {
      return;
    }

    // Don't handle non-text events
    if (content.msgtype !== "m.text") {
      return;
    }

    // Make sure that the event looks like a command we're expecting
    let body = content.body;
    if (!body) {
      return;
    }

    // Strip answer content in replies.
    if (typeof content["m.relates_to"] !== "undefined") {
      if (typeof content["m.relates_to"]["m.in_reply_to"] !== "undefined") {
        let lines = body.split("\n");
        while (
          lines.length &&
          (lines[0].startsWith("> ") || !lines[0].trim().length)
        ) {
          lines.shift();
        }
        body = lines.join("\n");
      }
    }

    // Filter out events sent by the bot itself.
    let sender = event.sender;
    if (sender === (await client.getUserId())) {
      return;
    }

    body = body.trim();
    if (!body.length) {
      return;
    }

    let msg = {
      body,
      sender,
      room
    };

    for (let { moduleName, handler } of config.handlers) {
      let extra = Object.assign({}, config.extra);

      if (moduleName !== "admin") {
        let enabled = await settings.isModuleEnabled(room, moduleName);
        if (!enabled) {
          continue;
        }
      }

      try {
        await handler(client, msg, extra);
      } catch (err) {
        console.error("Handler error: ", err);
      }
    }
  };
}

async function createClient(configFilename) {
  const config = await loadConfig(configFilename);

  switch (config.extra.logLevel) {
    case "trace":
      break;
    case "debug":
      LogService.setLevel(LogLevel.DEBUG);
      break;
    case "info":
      LogService.setLevel(LogLevel.INFO);
      break;
    case "warn":
    default:
      LogService.setLevel(LogLevel.WARN);
      break;
    case "error":
      LogService.setLevel(LogLevel.ERROR);
      break;
  }

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

  await require("./db").init(storageDir);

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

  let configFilename = cliArgs.length ? cliArgs[0] : "config.json";

  await createClient(configFilename);
}

// No top-level await, alright.
main().catch(err => {
  console.error("Error in main:", err.stack);
});
