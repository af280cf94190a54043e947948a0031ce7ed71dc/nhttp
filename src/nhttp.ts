import {
  Handler,
  Handlers,
  HttpResponse,
  NextFunction,
  RequestEvent,
  TBodyLimit,
} from "./types.ts";
import Router from "./router.ts";
import {
  findFns,
  findUrl,
  modPath,
  parseQuery as parseQueryOri,
  parseurl,
  toPathx,
} from "./utils.ts";
import { buildResponse } from "./response.ts";
import { withBody } from "./body.ts";
import { getError, NotFoundError } from "./error.ts";

type TApp = {
  parseQuery?: (data: any, ...args: any) => any;
  bodyLimit?: TBodyLimit;
  env?: string;
};

export class NHttp<
  Rev extends RequestEvent = RequestEvent,
> extends Router<Rev> {
  #parseQuery: (data: any, ...args: any) => any;
  #bodyLimit?: TBodyLimit;
  #env: string;
  constructor({ parseQuery, bodyLimit, env }: TApp = {}) {
    super();
    this.#parseQuery = parseQuery || parseQueryOri;
    this.#bodyLimit = bodyLimit;
    this.#env = env || "development";
    if (parseQuery) {
      this.use((rev: RequestEvent, next) => {
        rev.__parseQuery = parseQuery;
        next();
      });
    }
  }
  #onError = (
    err: any,
    rev: Rev,
    _: NextFunction,
  ) => {
    let obj = getError(err, this.#env === "development");
    return rev.response.status(obj.status).json(obj);
  };
  #on404 = (
    rev: Rev,
    _: NextFunction,
  ) => {
    let obj = getError(
      new NotFoundError(`Route ${rev.request.method}${rev.url} not found`),
    );
    return rev.response.status(obj.status).json(obj);
  };
  #addRoutes = (arg: string, args: any[], routes: any[]) => {
    let prefix = "", midds = findFns(args), i = 0, len = routes.length;
    if (typeof arg === "string" && arg.length > 1 && arg.charAt(0) === "/") {
      prefix = arg;
    }
    for (; i < len; i++) {
      let el = routes[i];
      el.handlers = midds.concat(el.handlers);
      this.on(el.method, prefix + el.path, ...el.handlers);
    }
  };
  #handleConn = async (conn: Deno.Conn) => {
    try {
      const httpConn = Deno.serveHttp(conn);
      for await (const { request, respondWith } of httpConn) {
        let resp: (res: Response) => void;
        const promise = new Promise<Response>((ok) => (resp = ok));
        const rw = respondWith(promise);
        this.handle({
          request: request,
          respondWith: resp!,
        } as Rev);
        await rw;
      }
    } catch (_e) {}
  };
  onError(
    fn: (
      err: any,
      rev: Rev,
      next: NextFunction,
    ) => any,
  ) {
    this.#onError = fn;
  }
  on404(
    fn: (
      rev: Rev,
      next: NextFunction,
    ) => any,
  ) {
    this.#on404 = fn;
  }
  use(prefix: string, routers: Router<Rev>[]): this;
  use(prefix: string, router: Router<Rev>): this;
  use(router: Router<Rev>): this;
  use(router: Router<Rev>[]): this;
  use(middleware: Handler<Rev>, routers: Router<Rev>[]): this;
  use(middleware: Handler<Rev>, router: Router<Rev>): this;
  use(middleware: Handler<Rev>): this;
  use(...middlewares: Handlers<Rev>): this;
  use(prefix: string, middleware: Handler<Rev>, routers: Router<Rev>[]): this;
  use(prefix: string, middleware: Handler<Rev>, router: Router<Rev>): this;
  use(prefix: string, middleware: Handler<Rev>): this;
  use(prefix: string, ...middlewares: Handlers<Rev>): this;
  use(...args: any): this;
  use(...args: any) {
    let arg = args[0],
      larg = args[args.length - 1],
      len = args.length;
    if (len === 1 && typeof arg === "function") this.midds.push(arg);
    else if (typeof arg === "string" && typeof larg === "function") {
      if (arg === "/" || arg === "") {
        this.midds = this.midds.concat(findFns(args));
      } else this.pmidds[arg] = [modPath(arg)].concat(findFns(args));
    } else if (typeof larg === "object" && larg.c_routes) {
      this.#addRoutes(arg, args, larg.c_routes);
    } else if (Array.isArray(larg)) {
      let el: any, i = 0, len = larg.length;
      for (; i < len; i++) {
        el = larg[i];
        if (typeof el === "object" && el.c_routes) {
          this.#addRoutes(arg, args, el.c_routes);
        } else if (typeof el === "function") this.midds.push(el);
      }
    } else this.midds = this.midds.concat(findFns(args));
    return this;
  }
  on(method: string, path: string, ...handlers: Handlers<Rev>): this {
    let fns = findFns(handlers);
    let obj = toPathx(path, method === "ANY");
    if (obj !== void 0) {
      if (obj.key) {
        this.route[method + obj.key] = { params: obj.params, handlers: fns };
      } else {
        if (this.route[method] === void 0) this.route[method] = [];
        this.route[method].push({ ...obj, handlers: fns });
      }
    } else this.route[method + path] = { handlers: fns };
    return this;
  }
  handle(rev: Rev) {
    rev.url = findUrl(rev.request.url);
    let url = parseurl(rev),
      obj = this.findRoute(rev.request.method, url.pathname, this.#on404),
      i = 0,
      next: NextFunction = (err?: any) => {
        if (err === void 0) {
          let ret;
          try {
            ret = obj.handlers[i++](rev, next);
          } catch (error) {
            return next(error);
          }
          if (ret && typeof ret.then === "function") {
            ret.then(void 0).catch(next);
          }
        } else this.#onError(err, rev, next);
      };
    rev.params = obj.params;
    rev.path = url.pathname;
    rev.query = this.#parseQuery(url.query);
    rev.search = url.search;
    buildResponse(
      rev.response = {} as HttpResponse,
      rev.respondWith,
      rev.responseInit = {},
    );
    withBody(rev, next, this.#parseQuery, this.#bodyLimit);
  }
  async listen(
    opts:
      | number
      | Deno.ListenOptions
      | Deno.ListenTlsOptions
      | { [k: string]: any },
    callback?: (
      err?: Error,
      opts?:
        | Deno.ListenOptions
        | Deno.ListenTlsOptions
        | { [k: string]: any },
    ) => void | Promise<void>,
  ) {
    let isTls = false;
    if (typeof opts === "number") opts = { port: opts };
    else if (typeof opts === "object") {
      isTls = (opts as any).certFile !== void 0;
    }
    let server = (
      isTls ? Deno.listenTls(opts as Deno.ListenTlsOptions) : Deno.listen(
        opts as Deno.ListenOptions & { transport?: "tcp" | undefined },
      )
    ) as Deno.Listener;
    try {
      if (callback) {
        callback(undefined, {
          ...opts,
          hostname: opts.hostname || "localhost",
          server,
        });
      }
      while (true) {
        try {
          const conn = await server.accept();
          if (conn) {
            this.#handleConn(conn);
          } else {
            break;
          }
        } catch (_e) {}
      }
    } catch (error) {
      if (callback) {
        callback(error, {
          ...opts,
          hostname: opts.hostname || "localhost",
          server,
        });
      }
    }
  }
}
