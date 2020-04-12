import { request } from "../utils";
import * as settings from "../settings";
import * as _ from "../html";

const ISSUE_OR_PR_REGEXP = /#(\d+)/g;

async function handleIssueOrPr(client, repo, roomId, issueNumber) {
  let url = `https://api.github.com/repos/${repo}/issues/${issueNumber}`;

  let response = await request({
    uri: url,
    headers: {
      accept: "application/vnd.github.v3+json",
      host: "api.github.com",
      "user-agent": "curl/7.64.0" // oh you
    }
  });

  if (!response) {
    return;
  }

  if (response.statusCode !== 200) {
    console.warn("github: error status code", response.statusCode);
    return;
  }

  let json = JSON.parse(response.body);
  if (!json) {
    return;
  }

  let text = `${json.title} | ${json.html_url}`;
  let html = _.a({ href: json.html_url }, json.title);

  client.sendMessage(roomId, {
    msgtype: "m.notice",
    body: text,
    format: "org.matrix.custom.html",
    formatted_body: html
  });
}

async function expandGithub(client, msg) {
  let repo = await settings.getOption(msg.room, "github", "user-repo");
  if (typeof repo === "undefined") {
    return;
  }

  var matches: RegExpExecArray | null = null;
  while ((matches = ISSUE_OR_PR_REGEXP.exec(msg.body)) !== null) {
    await handleIssueOrPr(client, repo, msg.room, matches[1]);
  }
}

module.exports = {
  handler: expandGithub,
  help:
    "If configured for a specific Github repository (via the 'user-repo set option), in this room, will expand #123 into the issue's title and URL."
};
