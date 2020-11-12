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
const utils_1 = require("../utils");
const settings = __importStar(require("../settings"));
const _ = __importStar(require("../html"));
const ISSUE_OR_PR_REGEXP = /#(\d+)/g;
async function handleIssueOrPr(client, repo, roomId, issueNumber) {
    let url = `https://api.github.com/repos/${repo}/issues/${issueNumber}`;
    let response = await utils_1.request({
        uri: url,
        headers: {
            accept: "application/vnd.github.v3+json",
            host: "api.github.com",
            "user-agent": "curl/7.64.0",
        },
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
        formatted_body: html,
    });
}
async function expandGithub(client, msg) {
    let repo = await settings.getOption(msg.room, "github", "user-repo");
    if (typeof repo === "undefined") {
        return;
    }
    var matches = null;
    while ((matches = ISSUE_OR_PR_REGEXP.exec(msg.body)) !== null) {
        await handleIssueOrPr(client, repo, msg.room, matches[1]);
    }
}
module.exports = {
    handler: expandGithub,
    help: "If configured for a specific Github repository (via the 'user-repo set option), in this room, will expand #123 into the issue's title and URL.",
};
