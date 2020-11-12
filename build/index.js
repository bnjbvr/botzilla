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
const matrix_bot_sdk_1 = require("matrix-bot-sdk");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const util = __importStar(require("util"));
const settings = __importStar(require("./settings"));
let fsReadDir = util.promisify(fs.readdir);
// A place where to store the client, for cleanup purposes.
let CLIENT = null;
let roomJoinedAt = {};
async function loadConfig(fileName) {
    let config = JSON.parse(fs.readFileSync(fileName).toString());
    const handlers = [];
    const handlerNames = [];
    const helpMessages = {};
    let moduleNames = await fsReadDir(path.join(__dirname, "modules"));
    moduleNames = moduleNames.map((filename) => filename.split(".js")[0]);
    for (let moduleName of moduleNames) {
        let mod = require("./" + path.join("modules", moduleName));
        if (mod.init) {
            await mod.init(config);
        }
        handlerNames.push(moduleName);
        handlers.push({
            moduleName,
            handler: mod.handler,
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
            logLevel: config.logLevel || "warn",
        },
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
        // Ignore messages published before we started or joined the room.
        let eventTime = parseInt(event.origin_server_ts);
        if (eventTime < startTime) {
            return;
        }
        if (typeof roomJoinedAt[room] === "number" &&
            eventTime < roomJoinedAt[room]) {
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
                while (lines.length &&
                    (lines[0].startsWith("> ") || !lines[0].trim().length)) {
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
            room,
            event,
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
            }
            catch (err) {
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
            matrix_bot_sdk_1.LogService.setLevel(matrix_bot_sdk_1.LogLevel.DEBUG);
            break;
        case "info":
            matrix_bot_sdk_1.LogService.setLevel(matrix_bot_sdk_1.LogLevel.INFO);
            break;
        case "warn":
        default:
            matrix_bot_sdk_1.LogService.setLevel(matrix_bot_sdk_1.LogLevel.WARN);
            break;
        case "error":
            matrix_bot_sdk_1.LogService.setLevel(matrix_bot_sdk_1.LogLevel.ERROR);
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
    const storage = new matrix_bot_sdk_1.SimpleFsStorageProvider(path.join(storageDir, "matrix.json"));
    await require("./db").init(storageDir);
    // Now we can create the client and set it up to automatically join rooms.
    const client = new matrix_bot_sdk_1.MatrixClient(config.homeserverUrl, config.accessToken, storage);
    matrix_bot_sdk_1.AutojoinRoomsMixin.setupOnClient(client);
    client.on("room.join", (roomId) => {
        roomJoinedAt[roomId] = Date.now();
        console.log("joined room", roomId, "at", roomJoinedAt[roomId]);
    });
    // We also want to make sure we can receive events - this is where we will
    // handle our command.
    client.on("room.message", makeHandleCommand(client, config));
    // Now that the client is all set up and the event handler is registered, start the
    // client up. This will start it syncing.
    await client.start();
    console.log("Client started!");
    CLIENT = client;
    await client.setPresenceStatus("online", "bot has been started");
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
main().catch((err) => {
    console.error("Error in main:", err.stack);
});
function wait(ms) {
    return new Promise((ok) => {
        setTimeout(ok, ms);
    });
}
async function exitHandler(options = {}) {
    if (CLIENT === null) {
        return;
    }
    let _client = CLIENT;
    CLIENT = null;
    console.log("setting bot presence to offline...");
    _client.stop();
    await wait(1000);
    await _client.setPresenceStatus("offline", "bot exited");
    while (true) {
        let presence = (await _client.getPresenceStatus()).state;
        if (presence !== "online") {
            break;
        }
        console.log("waiting, status is", presence);
        await wait(11000);
    }
    console.log("Done, ciao!");
    process.exit(0);
}
// Misc signals (Ctrl+C, kill, etc.).
process.on("SIGINT", exitHandler);
process.on("SIGHUP", exitHandler);
process.on("SIGQUIT", exitHandler);
process.on("SIGTERM", exitHandler);
