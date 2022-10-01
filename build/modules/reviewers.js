"use strict";
// Suggest reviewers for given file in m-c.
//
// This communicates with hg.m.o to get the log.
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const SEARCH_FOX_QUERY = "https://searchfox.org/mozilla-central/search?q=&path=**/{{FILENAME}}";
const JSON_URL = "https://hg.mozilla.org/mozilla-central/json-log/tip/";
const MESSAGE_REGEXP = /[wW]ho (?:can review|has reviewed) (?:a patch in |patches in )?\/?(\S+?)\s*\??$/;
const REVIEWER_REGEXP = /r=(\S+)/;
const MAX_REVIEWERS = 3;
async function getReviewers(path) {
    const url = `${JSON_URL}${path}`;
    const log = await (0, utils_1.requestJson)(url);
    const reviewers = {};
    for (const item of log.entries) {
        const m = item.desc.match(REVIEWER_REGEXP);
        if (!m) {
            continue;
        }
        for (const r of m[1].split(",")) {
            if (r in reviewers) {
                reviewers[r]++;
            }
            else {
                reviewers[r] = 1;
            }
        }
    }
    return Object.entries(reviewers)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => {
        return b.count - a.count;
    });
}
async function fuzzyMatch(path) {
    let result;
    try {
        const url = SEARCH_FOX_QUERY.replace("{{FILENAME}}", path);
        result = await (0, utils_1.requestJson)(url);
    }
    catch (_) {
        // Just try the normal path in case of error.
    }
    if (result && result.normal && result.normal.Files) {
        let files = result.normal.Files;
        if (files.length === 1 && files[0].path.trim().length) {
            return files[0].path;
        }
    }
    return path;
}
module.exports = {
    handler: async function (client, msg) {
        const m = msg.body.match(MESSAGE_REGEXP);
        if (!m) {
            return;
        }
        const path = await fuzzyMatch(m[1]);
        try {
            const reviewers = await getReviewers(path);
            if (reviewers.length > MAX_REVIEWERS) {
                reviewers.length = MAX_REVIEWERS;
            }
            const list = reviewers.length > 0
                ? reviewers
                    .map(({ name, count }) => {
                    return `${name} x${count}`;
                })
                    .join(", ")
                : "found no previous reviewers for";
            client.sendText(msg.room, `${list}: /${path}`);
        }
        catch (e) {
            client.sendText(msg.room, `Could not find reviewers for /${path}`);
        }
    },
    help: "Suggest reviewers for given file in m-c. Usage: Who can review <path>?",
};
