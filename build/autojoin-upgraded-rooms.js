"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const settings_1 = require("./settings");
exports.default = {
    setupOnClient(client) {
        client.on("room.archived", async (prevRoomId, tombstoneEvent) => {
            if (!tombstoneEvent["content"])
                return;
            if (!tombstoneEvent["sender"])
                return;
            if (!tombstoneEvent["content"]["replacement_room"])
                return;
            const serverName = tombstoneEvent["sender"]
                .split(":")
                .splice(1)
                .join(":");
            const newRoomId = tombstoneEvent["content"]["replacement_room"];
            await (0, settings_1.migrateRoom)(prevRoomId, newRoomId);
            return client.joinRoom(newRoomId, [serverName]);
        });
    },
};
