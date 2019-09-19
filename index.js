import {
    MatrixClient,
    SimpleFsStorageProvider,
    AutojoinRoomsMixin,
    RichReply,
} from "matrix-bot-sdk";

import * as fs from "fs";

let config = JSON.parse(fs.readFileSync('./config.json'));

// where you would point a client to talk to a homeserver
const homeserverUrl = config.homeserver;
const accessToken = config.accessToken;

// We'll want to make sure the bot doesn't have to do an initial sync every
// time it restarts, so we need to prepare a storage provider. Here we use
// a simple JSON database.
const storage = new SimpleFsStorageProvider("botzilla.json");

// Now we can create the client and set it up to automatically join rooms.
const client = new MatrixClient(homeserverUrl, accessToken, storage);
AutojoinRoomsMixin.setupOnClient(client);

// We also want to make sure we can receive events - this is where we will
// handle our command.
client.on("room.message", handleCommand);

// Now that the client is all set up and the event handler is registered, start the
// client up. This will start it syncing.
client.start().then(() => console.log("Client started!"));

const BUG_NUMBER_REGEXP = /bug (\d+)/g;

async function expandBugNumber(client, roomId, msg) {
    // Expands "bug 1507820" into "https://bugzilla.mozilla.org/show_bug.cgi?id=1507820".
    var matches = null;
    while ((matches = BUG_NUMBER_REGEXP.exec(msg)) !== null) {
        let bugNumber = matches[1];
        let msg = `https://bugzil.la/${bugNumber}`;
        client.sendText(roomId, msg);
    }
}

const HANDLERS = [
    expandBugNumber,
];

// This is our event handler for dealing with the `!hello` command.
async function handleCommand(roomId, event) {
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
    if (event["sender"] === await client.getUserId()) {
        return;
    }

    // Make sure that the event looks like a command we're expecting
    const body = event["content"]["body"];

    if (!body) {
        return;
    }

    for (let handler of HANDLERS) {
        try {
            await handler(client, roomId, body);
        } catch(err) {
            console.error("Handler error: ", err);
        }
    }
}
