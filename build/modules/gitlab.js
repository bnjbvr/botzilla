"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
const ISSUE_OR_MR_REGEXP = /(#|!)(\d+)/g;
async function handleIssueOrMr(client, baseUrl, user, project, roomId, isIssue, number) {
    let encoded = `${user}%2F${project}`;
    let url = isIssue
        ? `https://${baseUrl}/api/v4/projects/${encoded}/issues/${number}`
        : `https://${baseUrl}/api/v4/projects/${encoded}/merge_requests/${number}`;
    let response = await (0, utils_1.request)({
        uri: url,
        headers: {
            accept: "application/json",
            "user-agent": "curl/7.64.0", // oh you
        },
    });
    if (!response) {
        return;
    }
    if (response.statusCode !== 200) {
        console.warn("gitlab: error status code", response.statusCode);
        return;
    }
    let json = JSON.parse(response.body);
    if (!json) {
        return;
    }
    let text = `${json.title} | ${json.web_url}`;
    let html = _.a({ href: json.web_url }, json.title);
    client.sendMessage(roomId, {
        msgtype: "m.notice",
        body: text,
        format: "org.matrix.custom.html",
        formatted_body: html,
    });
}
async function expandGitlab(client, msg) {
    let url = await settings.getOption(msg.room, "gitlab", "url");
    if (typeof url === "undefined") {
        return;
    }
    // Remove the protocol.
    if (url.startsWith("http://")) {
        url = url.split("http://")[1];
    }
    else if (url.startsWith("https://")) {
        url = url.split("https://")[1];
    }
    // Remove trailing slash, if it's there.
    if (url.endsWith("/")) {
        url = url.substr(0, url.length - 1);
    }
    // e.g.: gitlab.com/somebody/project
    let split = url.split("/");
    let project = split.pop();
    let user = split.pop();
    let baseUrl = split.join("/");
    var matches = null;
    while ((matches = ISSUE_OR_MR_REGEXP.exec(msg.body)) !== null) {
        await handleIssueOrMr(client, baseUrl, user, project, msg.room, matches[1] === "#", matches[2]);
    }
}
module.exports = {
    handler: expandGitlab,
    help: "If configured for a specific Gitlab repository (via the 'url' set " +
        "option), in this room, will expand #123 into the issue's title and URL, " +
        "!123 into the MR's title and URL.",
};
