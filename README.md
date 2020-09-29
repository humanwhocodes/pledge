# Pledge

by [Nicholas C. Zakas](https://humanwhocodes.com)

If you find this useful, please consider supporting my work with a [donation](https://humanwhocodes.com/donate).

## Description

An implementation of JavaScript promises that matches the [ECMA-262](https://www.ecma-international.org/ecma-262/11.0/index.html#sec-promise-objects) specification as closely as possible. Some differences:

1. Intentionally does not address `Realm` concerns as this isn't important to understanding promises.
2. In order to make things more "JavaScripty", some functions in the specification are represented as classes in this package.
3. Where variable names were too confusing, I chose to replace them with more meaningful names.

**Note:** This package is intended only for educational purposes and should not be used in production. There's no reason to use this package because the JavaScript `Promise` class already implements all of this functionality.

## Blog Posts

This package was created as part of the, "Creating a JavaScript promise from scratch," blog post series. If you have questions about this package, please be sure to check out the blog posts:

1. [Part 1: Constructor](https://humanwhocodes.com/blog/2020/09/creating-javascript-promise-from-scratch-constructor/)
2. [Part 2: Resolving to a promise](https://humanwhocodes.com/blog/2020/09/creating-javascript-promise-from-scratch-resolving-to-a-promise/)
3. Part 3: then(), catch(), and finally() (coming October 6, 2020)
4. Part 4: Promise.resolve() and Promise.reject (coming in October 2020)

Additionally, for every five new [GitHub sponsors](https://github.com/sponsors/nzakas) I receive (donating any amount), I'll release another blog post and associated code:

5. Part 5: Promise.race() and Promise.any() (when I reach 35 sponsors)
6. Part 6: Promise.all() and Promise.allSettled() (when I reach 40 sponsors)
7. Unhandled rejection tracking (when I reach 45 sponsors)

So if you would like to see parts 5-7, along with the associated changes to this library, please [sponsor me](https://github.com/sponsors/nzakas) on GitHub.

## Usage

### Node.js

Install using [npm][npm] or [yarn][yarn]:

```
npm install @humanwhocodes/pledge --save

# or

yarn add @humanwhocodes/pledge
```

Import into your Node.js project:

```js
// CommonJS
const { Pledge } = require("@humanwhocodes/pledge");

// ESM
import { Pledge } from "@humanwhocodes/pledge";
```

### Deno

Import into your Deno project:

```js
import { Pledge } from "https://unpkg.com/@humanwhocodes/pledge/dist/pledge.js";
```

### Browser

It's recommended to import the minified version to save bandwidth:

```js
import { Pledge } from "https://unpkg.com/@humanwhocodes/pledge/dist/pledge.min.js";
```

However, you can also import the unminified version for debugging purposes:

```js
import { Pledge } from "https://unpkg.com/@humanwhocodes/pledge/dist/pledge.js";
```

## API

After importing, create a new instance of `Pledge` and use it like a `Promise`:

```js
// basics
const pledge = new Pledge((resolve, reject) => {
    resolve(42);

    // or

    reject(42);
});

pledge.then(value => {
    console.log(value);
}).catch(reason => {
    console.error(reason);
}).finally(() => {
    console.log("done");
});

// create resolved pledges
const fulfilled = Pledge.resolve(42);
const rejected = Pledge.reject(new Error("Uh oh!"));
```

## Frequently Asked Questions (FAQ)

### Why make this package?

Promises have a lot of difficult concepts to understand, and sometimes the easiest way to understand difficult concepts is to put them into a familiar paradigm. In this case, creating an implementation of promises in JavaScript gave me a better understanding of how they work, and hopefully, they will help others understand them better, too.

### Why doesn't this include `all()`, `race()`, `allSettled()`, and `any()`?

These are all just different ways to mix and match multiple promises, and my immediate goal was to get a basic understanding of dealing with one promise at a time. If you'd like me to implement these, please consider [donating](https://github.com/sponsors/nzakas).

[npm]: https://npmjs.com/
[yarn]: https://yarnpkg.com/
