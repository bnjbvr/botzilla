let { request } = require("../utils");
let cheerio = require("cheerio");

const BUG_NUMBER_REGEXP = /bug (\d+)/g;

async function expandBugNumber(client, roomId, msg) {
  // Expands "bug 1507820" into the bug's title.
  var matches = null;
  while ((matches = BUG_NUMBER_REGEXP.exec(msg)) !== null) {
    let bugNumber = matches[1];
    let url = `https://bugzilla.mozilla.org/show_bug.cgi?id=${bugNumber}`;

    let response = await request(url);

    if (!response || response.statusCode !== 200) {
      continue;
    }

    let shortUrl = `https://bugzil.la/${bugNumber}`;

    const $ = cheerio.load(response.body);

    const title = $("head title").text();
    if (!title.length) {
      // Probably a private bug! Just send the basic information.
      client.sendText(roomId, shortUrl);
      continue;
    }

    let statusAndAssignee = $('head meta[property="og:description"]').attr(
      "content"
    );

    // It contains a string of the form "STATUS (assignee) in JavaScript: Core".
    // Remove what's after the parenthesis (hacky :)).
    statusAndAssignee = statusAndAssignee.substring(
      0,
      statusAndAssignee.indexOf(")") + 1
    );

    let msg = `${shortUrl} — ${statusAndAssignee} — ${title}`;

    client.sendText(roomId, msg);
  }
}

module.exports = expandBugNumber;
