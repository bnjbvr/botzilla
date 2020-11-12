import { MatrixClient } from "matrix-bot-sdk";
import { migrateRoom } from "./settings";

export default {
  setupOnClient(client: MatrixClient) {
    client.on(
      "room.archived",
      async (prevRoomId: string, tombstoneEvent: any) => {
        if (!tombstoneEvent["content"]) return;
        if (!tombstoneEvent["sender"]) return;
        if (!tombstoneEvent["content"]["replacement_room"]) return;

        const serverName = tombstoneEvent["sender"]
          .split(":")
          .splice(1)
          .join(":");

        const newRoomId = tombstoneEvent["content"]["replacement_room"];
        await migrateRoom(prevRoomId, newRoomId);

        return client.joinRoom(newRoomId, [serverName]);
      }
    );
  },
};
