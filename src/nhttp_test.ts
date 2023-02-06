import { Handler, Router } from "../mod.ts";
import { nhttp } from "./nhttp.ts";
import { RequestEvent } from "./request_event.ts";
import { assertEquals, superdeno } from "./deps_test.ts";
import { NextFunction, TRet } from "./types.ts";
import { expressMiddleware } from "./utils.ts";
import { mockConn } from "https://deno.land/std@0.170.0/http/_mock_conn.ts";

const renderFile = (file: string, ..._args: TRet) => {
  return Deno.readTextFileSync(file);
};
const renderFileAsync = (file: string, ..._args: TRet) => {
  return Deno.readTextFile(file);
};
const myReq = (method = "GET", url = "/", body?: TRet) => {
  return new Request("http://127.0.0.1:8000" + url, { method, body });
};
Deno.test("nhttp", async (t) => {
  await t.step("wildcard", async () => {
    const app = nhttp();
    app.get("*", (rev) => rev.params);
    app.any("/any/*", (rev) => rev.params);
    app.post("/*/:id", (rev) => rev.params);
    app.put("/:slug*", (rev) => rev.params);
    app.patch("/:slug*/:id", (rev) => rev.params);
    await superdeno(app.handle).get("/hello").expect({
      wild: ["hello"],
    });
    await superdeno(app.handle).get("/hello/").expect({
      wild: ["hello"],
    });
    await superdeno(app.handle).post("/hello/123").expect({
      wild: ["hello"],
      id: "123",
    });
    await superdeno(app.handle).post("/hello/123/").expect({
      wild: ["hello"],
      id: "123",
    });
    await superdeno(app.handle).put("/hello/123").expect({
      slug: ["hello", "123"],
    });
    await superdeno(app.handle).put("/hello/123/").expect({
      slug: ["hello", "123"],
    });
    await superdeno(app.handle).patch("/hello/world/123").expect({
      slug: ["hello", "world"],
      id: "123",
    });
    await superdeno(app.handle).patch("/hello/world/123/").expect({
      slug: ["hello", "world"],
      id: "123",
    });
    await superdeno(app.handle).delete("/any/hello").expect({
      wild: ["hello"],
    });
  });
  await t.step("handle", async () => {
    const app = nhttp({ env: "production" });
    app.get("/", (rev) => rev.getCookies());
    app.get("/promise", async () => await new Promise((res) => res("ok")));
    app.post("/post", () => "post");
    app.head("/", () => "head");
    app.get("/hello", ({ response }) => {
      return response.send([]);
    });
    app.get("/lose", (_, next) => next());
    app.get("/lose", () => "yeah");
    app.get("/lose/:name", (_, next) => next());
    app.get("/lose/:name", () => "yeah");
    app.get("/send", ({ response }) => {
      response.send();
    });
    app.get("/json-header", ({ response }) => {
      response.header("name", "john");
      response.json({ name: "john" });
    });
    app.get("/json-header2", ({ response }) => {
      response.header().set("name", "john");
      response.json({ name: "john" });
    });
    app.get("/status", ({ response }) => response.sendStatus(204));
    app.get("/status2", ({ response }) => response.sendStatus(1000));
    await superdeno(app.handle).get("/").expect({});
    await superdeno(app.handle).get("/promise?name=john").expect("ok");
    await superdeno(app.handle).post("/post/").expect("post");
    await superdeno(app.handle).get("/hello").expect([]);
    await superdeno(app.handle).get("/lose").expect("yeah");
    await superdeno(app.handle).get("/lose/john").expect("yeah");
    await superdeno(app.handle).get("/status").expect(204);
    await superdeno(app.handle).get("/status2").expect(500);
    const head = await app.handleEvent(
      { request: myReq("HEAD", "/") },
    );
    const sendNull = await app.handle(myReq("GET", "/send"));
    const jsonHeader: Response = await app.handle(myReq("GET", "/json-header"));
    const jsonHeader2: Response = await app.handle(
      myReq("GET", "/json-header2"),
    );
    assertEquals(await head.text(), "head");
    assertEquals(sendNull instanceof Response, true);
    assertEquals(jsonHeader.headers.get("name"), "john");
    assertEquals(jsonHeader2.headers.get("name"), "john");
  });
  await t.step("noop response", async () => {
    const app = nhttp();
    app.get("/", () => {});
    const noop = await app.handle(myReq());
    assertEquals(noop, undefined);
  });
  await t.step("engine", async () => {
    const app = nhttp();
    app.engine((tmp, params) => {
      return { tmp, params };
    }, { base: "base", ext: "html" });
    app.get("/", ({ response }) => response.render("hello", { name: "john" }));
    await superdeno(app.handle).get("/").expect({
      tmp: "base/hello.html",
      params: { name: "john" },
    });
  });
  await t.step("body parser", async () => {
    const app = nhttp({ bodyParser: true });
    app.post("/", (rev) => rev.body);
    await superdeno(app.handle)
      .post("/")
      .set("Content-Type", "application/json")
      .set("Accept", "application/json")
      .send({ name: "john" })
      .expect({ name: "john" });
  });
  await t.step("engine1", async () => {
    const app = nhttp();
    app.engine(renderFile, { base: "/dummy", ext: "html" });
    app.get("/", ({ response }) => {
      response.params = { name: "john" };
      response.render("index");
    });
    await superdeno(app.handle).get("/").expect(200);
  });
  await t.step("engine2", async () => {
    const app = nhttp();
    app.engine(renderFileAsync, { base: "/dummy", ext: "html" });
    app.get("/", async ({ response }) => {
      response.params = { name: "john" };
      await response.render("index");
    });
    await superdeno(app.handle).get("/").expect(200);
  });
  await t.step("engine error", async () => {
    const app = nhttp();
    app.engine(renderFile, { base: "/dummy", ext: "html" });
    app.get("/", ({ response }) => {
      response.params = { name: "john" };
      response.render("noop");
    });
    await superdeno(app.handle).get("/").expect(500);
  });
  await t.step("middleware", async () => {
    const app = nhttp();
    const midd: Handler = (rev, next) => {
      if (rev.count === undefined) {
        rev.count = 0;
      }
      rev.count += 1;
      return next();
    };
    app.use(midd);
    app.use(midd, [midd, [midd]], midd);
    app.use("/assets/hello", ({ count }) => count);
    app.use("/hello", () => "hello");
    app.use("/name", (rev, next) => {
      rev.name = "john";
      return next();
    });
    app.get("/name", ({ name }) => name);
    await superdeno(app.handle).get("/assets/hello/doe/john").expect("5");
    await superdeno(app.handle).get("/hello").expect("hello");
    await superdeno(app.handle).get("/name").expect("john");
  });
  await t.step("assets", async () => {
    const app = nhttp();
    const midd: Handler = (rev, _next) => {
      return rev.url;
    };
    app.use("/hello/*", (rev, next) => {
      rev.user = "john";
      return next();
    });
    app.use("/assets", midd);
    app.get("/hello/john", ({ user }) => user);
    await superdeno(app.handle).get("/assets/hello").expect("/hello");
    await superdeno(app.handle).get("/hello/john").expect("john");
  });
  await t.step("noop 404", async () => {
    const app = nhttp();
    app.get("/", (_, next) => next());
    app.get("/hello", async (_, next) => await next());
    await superdeno(app.handle).get("/").expect(404);
    await superdeno(app.handle).get("/hello").expect(404);
  });
  await t.step("noop path", async () => {
    const app = nhttp();
    app.get("/hello/", () => "hello");
    await superdeno(app.handle).get("/hello").expect(200);
  });
  await t.step("class midd", async () => {
    class Midd {
      use(rev: RequestEvent, next: NextFunction) {
        rev.user = "john";
        return next();
      }
    }
    const app = nhttp();
    app.use(Midd);
    app.get("/", ({ user }) => user);
    await superdeno(app.handle).get("/").expect("john");
  });
  await t.step("middleware express", async () => {
    const app = nhttp();
    const midd: TRet = (_req: TRet, _res: TRet, next: TRet) => {
      next();
    };
    app.use(midd, expressMiddleware([midd]));
    app.get("/", ({ response }) => {
      response.setHeader("name", "john");
      response.getHeader("name");
      response.get("name");
      response.hasHeader("name");
      response.hasHeader("test");
      response.append("name", "sahimar");
      response.removeHeader("name");
      response.writeHead(200, { name: "john" });
      return "base";
    });
    const init = await app.handle(myReq("GET", "/"));
    assertEquals(await init.text(), "base");
  });
  await t.step("sub router", async () => {
    const app = nhttp();
    const user = nhttp.Router();
    const item = new Router();
    const book = new Router({ base: "/book" });
    const name = new Router({ base: "/" });
    const hobby = new Router();
    item.use("/item", (rev, next) => {
      rev.name = "item";
      return next();
    });
    item.get("/item", ({ name }) => name);
    user.get("/user", () => "user");
    book.get("/", () => "book");
    name.get("/name", () => "name");
    hobby.get(/\/hobby/, () => "hobby");
    app.use("/api/v1", user);
    app.use("/api/v2", [item, book, name, hobby]);
    await superdeno(app.handle).get("/api/v1/user").expect("user");
    await superdeno(app.handle).get("/api/v2/item").expect("item");
    await superdeno(app.handle).get("/api/v2/book").expect("book");
    await superdeno(app.handle).get("/api/v2/name").expect("name");
    await superdeno(app.handle).get("/api/v2/hobby").expect("hobby");
  });
  await t.step("error handling", async () => {
    const app = nhttp();
    app.get("/", ({ noop }) => noop());
    app.get("/noop", async ({ noop }, next) => {
      try {
        await noop();
        return "success";
      } catch (error) {
        error.status = 400;
        return next(error);
      }
    });
    app.get("/noop2", async ({ noop }, next) => {
      try {
        await noop();
        return "success";
      } catch (error) {
        error.status = "400";
        return next(error);
      }
    });
    app.onError((err) => err.message);
    app.on404(() => "404");
    const noop = app.handle(myReq("GET", "/"));
    const noop2 = app.handle(myReq("GET", "/noop"));
    const noop3 = app.handle(myReq("GET", "/noop2"));
    const notFound = app.handle(myReq("GET", "/404"));
    assertEquals(await noop.text(), "noop is not a function");
    assertEquals(await notFound.text(), "404");
    assertEquals((await noop2).status, 400);
    assertEquals((await noop3).status, 500);
  });
  await t.step("error handling default", async () => {
    const app = nhttp();
    app.get("/", ({ noop }) => noop());
    app.get("/2", async ({ noop }) => await noop());
    const noop = app.handle(myReq("GET", "/"));
    const noop2 = await app.handle(myReq("GET", "/2"));
    const notFound = app.handle(myReq("GET", "/404"));
    const message = (await noop.json()).message;
    const message2 = (await noop2.json()).message;
    const status = (await notFound.json()).status;
    assertEquals(message, "noop is not a function");
    assertEquals(message2, "noop is not a function");
    assertEquals(status, 404);
  });
  await t.step("error handling noop", async () => {
    const app = nhttp();
    app.get("/", ({ doo }) => doo());
    app.onError((rev) => {
      rev.noop();
    });
    app.on404((rev) => {
      rev.noop();
    });
    const noop = await app.handle(myReq("GET", "/"));
    const noop2 = await app.handle(myReq("GET", "/noop"));
    assertEquals((await noop.json()).message, "rev.noop is not a function");
    assertEquals((await noop2.json()).message, "rev.noop is not a function");
  });
  await t.step("query", async () => {
    const app = nhttp();
    app.get("/", (rev) => rev.query);
    await superdeno(app.handle).get("/?foo=bar").expect({ foo: "bar" });
  });
  await t.step("option parse query", async () => {
    const app = nhttp({ parseQuery: (str: string) => str });
    app.get("/", ({ __parseMultipart }) => __parseMultipart("test"));
    const val = app.handle(myReq("GET", "/"));
    assertEquals(await val.text(), "test");
  });
  await t.step("params", async () => {
    const app = nhttp();
    app.get("/:name", (rev) => rev.params);
    const val = app.handle(myReq("GET", "/john"));
    assertEquals(await val.text(), `{"name":"john"}`);
  });
  await t.step("awaiter", async () => {
    const app = nhttp();
    app.get("/", async (r) => {
      await Promise.resolve();
      setTimeout(() => {
        r.send("hello");
      }, 500);
    });
    app.get("/promise", () => {
      return Promise.resolve("hello");
    });
    const val = await app.handle(myReq("GET", "/"));
    const promise = await app.handle(myReq("GET", "/promise"));
    assertEquals(await val.text(), "hello");
    assertEquals(await promise.text(), "hello");
  });
  await t.step("conn", async () => {
    const conn = mockConn();
    const app = nhttp();
    app.get("/", () => "hello");
    const ret = await app["handleConn"](conn, app.handle);
    assertEquals(ret, undefined);
  });
  await t.step("listen", async () => {
    const def_port = 8080;
    const app = nhttp();
    const ac = new AbortController();
    app.get("/", () => "hello");
    const info: TRet = await new Promise((ok) => {
      app.listen({
        signal: ac.signal,
        port: def_port,
        test: true,
        handler: app.handle,
      }, (_, obj) => {
        ok(obj);
      });
    });
    const infoSSL: TRet = await new Promise((ok) => {
      app.listen({
        port: def_port + 1,
        cert: "./dummy/localhost.cert",
        key: "./dummy/localhost.key",
        alpnProtocols: ["h2", "http/1.1"],
        test: true,
      }, (_, info) => {
        ok(info);
      });
    });
    ac.abort();
    assertEquals(info.port, def_port);
    assertEquals(infoSSL.port, def_port + 1);
  });
});