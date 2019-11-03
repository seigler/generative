# p5-brunch
[Brunch](http://brunch.io/) skeleton for [p5.js](https://p5js.org/)

## Start
Start a new p5 project in seconds. Here's how:
- If you don't have brunch, get it with `npm i -g brunch`.
- Run `brunch new -s mattpilla/p5-brunch`.

## Develop
`npm start` will start your app at http://localhost:3333, complete with hot reload.

## Build for Production
`npm run build` will build your app to the `public/` directory, with babel, uglify, and cache-prevention.

## Boring Stuff
- All source code goes in the `app/` directory.
- Start your sketch in `app/sketch.js`.
- p5 is in [instance mode](https://github.com/processing/p5.js/wiki/Global-and-instance-mode) here, not global. Interface with p5 through the `sketch` object.
- Your JS is ES2015 ready. Write all the `require`s you want.
- Everything in the `app/assets/` directory will be copied to `public/` for builds.
- All CSS in `app/` will be concatenated and minified for builds.
- All JS in `app/` will be concatenated and minified for builds.
- By default, `p5.min.js` and `p5.sound.min.js` are included. They are copied from `node_modules/` as is (intentionally).
- Want to add another p5 plugin? In `brunch-config.js`, include its path in `exports.plugins.copycat.modules`. Then, include the relevant script tag in `app/assets/index.html`.
- Don't forget to edit `package.json`!
