const BUG_NUMBER_REGEXP = /bug (\d+)/g;

async function expandBugNumber(client, roomId, msg) {
  // Expands "bug 1507820" into "https://bugzilla.mozilla.org/show_bug.cgi?id=1507820".
  var matches = null;
  while ((matches = BUG_NUMBER_REGEXP.exec(msg)) !== null) {
    let bugNumber = matches[1];
    let msg = `https://bugzil.la/${bugNumber}`;
    client.sendText(roomId, msg);
  }
}

export default expandBugNumber;
