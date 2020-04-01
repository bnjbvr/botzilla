Botzilla
===

This is a very work-in-progress bot for Matrix, to use on the Mozilla Matrix
server.

Hack
===

Make sure that nodejs 10 or more is installed on your machine.

- Run `npm install` to make sure all your dependencies are up to date.
- Copy `config.json.example` to `config.json` and fill the access token for
  your bot as documented there.
- (Optional) Make your code beautiful with `npm run pretty`.
- Start the script with `npm start`.

Available modules
===

[See the list](./src/modules). You can refer to a module by its filename in
the modules directory.

How to create a new module
===

- Create a new JS file in `./src/modules`.
- It must export an object of the form:

```js
{
    handler: async function(client, msg) {
        // This contains the message's content.
        let body = msg.body;
        if (body !== '!botsnack') {
            return;
        }

        // This is the Matrix internal room identifier, not a pretty-printable
        // room alias name.
        let roomId = msg.room;

        // This contains the full id of the sender, with the form
        // nickname@domaine.com.
        let sender = msg.sender;

        client.sendText(roomId, `thanks ${sender} for the snack!`);
        client.sendNotice(roomId, "i like snacks!");
    },

    help: "An help message for this module."
}
```

- The module's name is the file name.
- It must be enabled by an admin with `!admin enable moduleName` for a single
  room, or `!admin enable-all moduleName`.
- Fun and profit.

Deploy
===

A Dockerfile has been set up to ease local and production deployment of this
bot. You can spawn an instance with the following:

    docker run -ti \
        -v /path/to/local/config.json:/config.json \
        -v /path/to/local/data-dir:/app/data \
        bnjbvr/botzilla

Community
===

If you want to hang out and talk about botzilla, please join our [Matrix
room](https://matrix.to/#/#botzilla:delire.party).

There's also a [Matrix room](https://matrix.to/#/#botzilla-tests:delire.party)
to try the bot features live.
