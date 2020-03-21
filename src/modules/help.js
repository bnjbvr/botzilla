let { RichReply } = require("matrix-bot-sdk");

let _ = require("../html");

module.exports = {
  handler: function(client, msg, extra) {
    if (msg.body.indexOf("!help") === -1) {
      return;
    }

    let text =
      "Hi there! Botzilla <https://github.com/bnjbvr/botzilla> is a bot trying to help you.";

    let html = _.p(
      {},
      "Hi there!",
      _.a({ href: "https://github.com/bnjbvr/botzilla" }, "Botzilla"),
      "is a bot trying to help you."
    );

    if (extra.handlerNames.length) {
      text += "\nModules enabled:\n\n";
      text += extra.handlerNames
        .map(name => `- ${name} : ${extra.helpMessages[name]}`)
        .join("\n");

      let handlersHelp = extra.handlerNames.map(name =>
        _.li({}, _.strong({}, name), ":", extra.helpMessages[name])
      );

      html += _.p({}, "Modules enabled:", _.ul({}, ...handlersHelp));
    } else {
      let notice = "No modules enabled for this instance of Botzilla!";
      text += `\n${notice}`;
      html += _.p({}, notice);
    }

    if (typeof extra.owner !== "undefined") {
      let notice = `The owner of this bot is ${extra.owner}. In case the bot misbehaves in any ways, feel free to get in touch with its owner.`;
      html += _.p(notice);
      text += `\n${notice}`;
    }

    client.sendMessage(msg.room, {
      msgtype: "m.notice",
      body: text,
      format: "org.matrix.custom.html",
      formatted_body: html
    });
  },

  help: "Well, this is what you're looking at :)"
};
