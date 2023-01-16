Botzilla
===

**⚠⚠⚠ This project has been deprecated in favor of [Trinity](https://github.com/bnjbvr/trinity), a more advanced bot system written in Rust and making use of commands implemented as WebAssembly modules. No more issues or pull requests will be taken against this repository.**

This is a Matrix bot, with a few features, tuned for Mozilla's needs but could
be useful in other contexts.

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

Admin
===

A user with a power level greater than 50 (administrator or moderator) can
administrate the bot by opening an unencrypted private chat with it, and using
the following commands. The super-admin is a username set in the `config.json`
configuration file.

- `!admin list`: lists all the known modules, without any information with
  their being enabled or not.
- `!admin status`: gives the enabled/disabled status of modules for the current
  room.
- `!admin enable uuid`/`!admin disable uuid`: enables/disables the `uuid` for
  this room.
- `!admin enable-all uuid`/`!admin disable-all uuid`: (super-admin only)
  enables/disables the `uuid` for all the rooms.
- `!admin set MODULE KEY VALUE`: for the given MODULE, sets the given KEY to
  the given VALUE (acting as a key-value store). There's a `set-all` variant
  for super-admins that will set the values for all the rooms (a per-room value
  is preferred, when it's set).
- `!admin get MODULE KEY`: for the given MODULE, returns the current value of
  the given KEY. There's a `get-all` variant for super-admins that will set
  the values for all the rooms.

### Known keys

#### Gitlab

- `url` is the key for the full URL of the gitlab repository, including the
  instance URL up to the user and repository name. e.g
  `https://gitlab.com/ChristianPauly/fluffychat-flutter`.

#### Github

- `user-repo` is the key for the user/repo combination, e.g. `bnjbvr/botzilla`.

#### Confession

- `userRepo` is the key for the user/repo combination of the Github repository
  used to save the confessions, e.g.  `robotzilla/histoire`. Note the bot's
  configuration must contain Github API keys for a github user who can push to
  this particular repository.

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
