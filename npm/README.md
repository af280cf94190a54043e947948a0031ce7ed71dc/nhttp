<!-- // deno-fmt-ignore-file -->

<p align="center">
  <a href="https://github.com/nhttp/nhttp"><img height="200" style="height: 200px" src="https://raw.githubusercontent.com/nhttp/nhttp/master/dummy/logo.png" alt="logo"></a>
  <h1 align="center">NHttp</h1>
</p>
<p align="center">
An Simple <i>Http Route</i> framework for <a href="https://deno.land/">Deno</a> and Friends.
</p>
<p align="center">
   <a href="https://github.com/nhttp/nhttp"><img src="https://github.com/nhttp/nhttp/workflows/ci/badge.svg" alt="ci" /></a>
   <a href="https://codecov.io/gh/nhttp/nhttp"><img src="https://codecov.io/gh/nhttp/nhttp/branch/master/graph/badge.svg?token=SJ2NZQ0ZJG" alt="coverage" /></a>
   <a href="https://www.codefactor.io/repository/github/nhttp/nhttp/overview/master"><img src="https://www.codefactor.io/repository/github/nhttp/nhttp/badge/master" alt="codefactor" /></a>
   <a href="https://deno.land/x/nhttp"><img src="https://img.shields.io/endpoint?url=https%3A%2F%2Fdeno-visualizer.danopia.net%2Fshields%2Flatest-version%2Fx%2Fnhttp@1.1.14%2Fmod.ts" alt="denoland" /></a>
   <a href="https://deno.land/x/nhttp"><img src="https://img.shields.io/endpoint?url=https%3A%2F%2Fdeno-visualizer.danopia.net%2Fshields%2Fdep-count%2Fhttps%2Fdeno.land%2Fx%2Fnhttp@1.1.14%2Fmod.ts" alt="deps" /></a>
   <a href="https://deno.land/x/nhttp"><img src="https://img.shields.io/endpoint?url=https%3A%2F%2Fdeno-visualizer.danopia.net%2Fshields%2Fcache-size%2Fhttps%2Fdeno.land%2Fx%2Fnhttp@1.1.14%2Fmod.ts" alt="size" /></a>
   <a href="http://badges.mit-license.org"><img src="https://img.shields.io/:license-mit-blue.svg" alt="licence" /></a>
   <a href="http://makeapullrequest.com"><img src="https://img.shields.io/badge/PRs-welcome-blue.svg" alt="prs" /></a>
   <a href="https://nest.land/package/nhttp"><img src="https://nest.land/badge.svg" alt="nestland" /></a>
</p>
<hr/>

## Features

- Easy to use.
- Simple performance.
- Cross runtime support (Deno, Bun, Node, etc).
- Low overhead & True handlers (no caching anything).
- Small & Zero deps.
- Middleware support.
- Sub router support.
- Return directly on handlers.
- Auto parses the body (`json / urlencoded / multipart / raw`).

[See examples](https://github.com/nhttp/nhttp/tree/master/examples)

## Installation

### deno.land

```ts
import { nhttp } from "https://deno.land/x/nhttp@1.1.14/mod.ts";
```

### deno-npm

```ts
import { nhttp } from "npm:nhttp-land@1.1.14";
```

### nest.land

```ts
import { nhttp } from "https://x.nest.land/nhttp@1.1.14/mod.ts";
```

### npm/yarn

```bash
npm i nhttp-land

// or

yarn add nhttp-land
```

```ts
import { nhttp } from "nhttp-land";
```

## Usage

```ts
import { nhttp } from "https://deno.land/x/nhttp@1.1.14/mod.ts";

const app = nhttp();

app.get("/", (rev) => {
  rev.send("Hello, World");
});

// return directly
app.get("/cat", () => {
  return "Hello, Cat";
  // or json
  // return { name: "cat" };
});

app.listen(8000, () => {
  console.log("> Running on port 8000");
});
```

## Run

```bash
deno run -A myapp.ts
```

## Deno Flash

> requires `--unstable` flag.

```ts
const app = nhttp({ flash: true });
```

## Middleware

```ts
const app = nhttp();

app.use((rev, next) => {
  rev.foo = "bar";
  return next();
});

app.get("/", ({ foo }) => foo);
```

## Body Parser

Support `json / urlencoded / multipart / raw`.

> note: nhttp automatically parses the body.

```ts
const app = nhttp();

// if you want disable bodyParser
// const app = nhttp({ bodyParser: false });

app.post("/save", (rev) => {
  console.log(rev.body);
  return "success save";
});

// inline bodyParser
// app.post("/save", bodyParser(), (rev) => {...});
```

## Other Runtime (Bun / Node)

> for nodejs, requires v18.14.0 or higher. cause it uses `Web Stream API` like
> `ReadableStream`.

```ts
import { nhttp } from "nhttp-land";

const app = nhttp();

app.get("/", () => "hello, world");

app.listen(8000, () => {
  console.log("> Running on port 8000");
});

// if cfw or other runtime, just invoke app.handle
// export default { fetch: app.handle };
```

## tsconfig

```json
{
  "compilerOptions": {
    // if bun
    // "types": ["bun-types"],
    "lib": [
      "DOM",
      "DOM.Iterable",
      "ESNext"
    ]
  }
}
```

## License

[MIT](LICENSE)