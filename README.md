Botzilla
===

This is a very work-in-progress bot for Matrix, to use on the Mozilla Matrix
server.

Hacking
===

Currently, all the code is in `src/`. This project uses the babeljs transpiler
to write modern JS using ES modules.

Make sure that nodejs 10 or more is installed on your machine.

- Run `npm install` to make sure all your dependencies are up to date.
- Copy `config.json.example` to `config.json` and fill the access token for
  your bot as documented there.
- Run `npm run watch` so the transpiler continually watches changes to your
  code. Transpiled code ends up in `dist/index.js`.
- (Optional) Make your code beautiful with `npm run pretty`.
- Start the script with `node ./dist/index.js`.
