Slay the Spire map analysis gui
===

Try it here: https://emlun.se/spire-map-gui/

I made this because it seemed like an interesting project to build, I have no particular plans to keep developing it.


Requirements
---

- [Rust][rust-lang]
- [npm][npm]


Usage
---

To run the development server:

```
$ npm install
$ npm start
$ $BROWSER http://localhost:8080
```

To build artifacts:

```
$ npm install
$ npm run build
```

Then copy the contents of `build/` into your favourite web server.


[npm]: https://docs.npmjs.com/downloading-and-installing-node-js-and-npm
[rust-lang]: https://www.rust-lang.org/learn/get-started
[wasm-pack]: https://rustwasm.github.io/docs/wasm-pack/quickstart.html
