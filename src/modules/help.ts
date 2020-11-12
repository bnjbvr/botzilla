import * as _ from "../html";

const MATCH_REGEXP = /!help ?([a-zA-Z-]+)?/g;

function fullHelp(client, msg, extra) {
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
      .map((name) => `- ${name} : ${extra.helpMessages[name]}`)
      .join("\n");

    let handlersHelp = extra.handlerNames.map((name) =>
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
    formatted_body: html,
  });
}

module.exports = {
  handler: function (client, msg, extra) {
    MATCH_REGEXP.lastIndex = 0;
    let match = MATCH_REGEXP.exec(msg.body);
    if (match === null) {
      return;
    }

    let moduleName = match[1];
    if (moduleName) {
      let text;
      let html;
      if (extra.handlerNames.indexOf(moduleName) !== -1) {
        text = extra.helpMessages[moduleName];
        html = _.p(
          {},
          _.strong({}, moduleName),
          ":",
          extra.helpMessages[moduleName]
        );
      } else {
        let modulesList = extra.handlerNames.join(", ");
        text = `unknown module ${moduleName}. Currently enabled modules are: ${modulesList}`;
        html = _.p({}, text);
      }

      client.sendMessage(msg.room, {
        msgtype: "m.notice",
        body: text,
        format: "org.matrix.custom.html",
        formatted_body: html,
      });
    } else {
      fullHelp(client, msg, extra);
    }
  },

  help: "Well, this is what you're looking at :)",
};
