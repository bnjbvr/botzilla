let { promisify } = require("util");
let request = require("request");

const promiseRequest = promisify(request);

module.exports = {
  request: promiseRequest,

  requestJson: async url => {
    let options = {
      uri: url,
      headers: {
        accept: "application/json"
      }
    };
    let response = await promiseRequest(options);
    return JSON.parse(response.body);
  }
};
