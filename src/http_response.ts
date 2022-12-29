import { MIME_LIST, STATUS_LIST } from "./constant.ts";
import { RespondWith } from "./request_event.ts";
import { Cookie, TObject, TRet } from "./types.ts";
import {
  createOptionFile,
  getContentType,
  is304,
  sendBody,
  serializeCookie,
} from "./utils.ts";

export const JSON_TYPE_CHARSET = "application/json; charset=UTF-8";

export type ResInit = {
  headers?: TObject;
  status?: number;
};

export class HttpResponse {
  constructor(public resp: RespondWith, public request: Request) {}
  /**
   * set header or get header
   * @example
   * // set header
   * response.header("content-type", "text/css");
   * response.header({ "content-type": "text/css" });
   *
   * // get header
   * const type = response.header("content-type");
   *
   * // delete header
   * response.headers.delete("content-type");
   *
   * // append header
   * response.headers.append("key", "other-value");
   */
  header(key: string, value: string | string[]): this;
  header(key: string): string;
  header(key: TObject): this;
  header(): Headers;
  header(
    key?: TObject | string,
    value?: string | string[],
  ): this | string | Headers {
    if (!this.init) this.init = {};
    if (this.init.headers) {
      if (this.init.headers instanceof Headers) {
        this.init.headers = Object.fromEntries(this.init.headers.entries());
      }
    } else this.init.headers = {};
    if (typeof key == "string") {
      key = key.toLowerCase();
      if (!value) {
        return this.init.headers[key];
      }
      this.init.headers[key] = value;
      return this;
    }
    if (typeof key == "object") {
      if (key instanceof Headers) key = Object.fromEntries(key.entries());
      for (const k in key) this.init.headers[k.toLowerCase()] = key[k];
      return this;
    }
    return (this.init.headers = new Headers(this.init.headers));
  }
  /**
   * headers instanceof Headers
   * @example
   * // delete
   * response.headers.delete("key");
   *
   * // append
   * response.headers.append("key", "val");
   */
  get headers() {
    if (!this.init) this.init = {};
    if (this.init.headers instanceof Headers) return this.init.headers;
    return (this.init.headers = new Headers(this.init.headers));
  }
  set headers(val: Headers) {
    if (!this.init) this.init = {};
    this.init.headers = val;
  }
  /**
   * set status or get status
   * @example
   * // set status
   * response.status(200);
   *
   * // get status
   * const status = response.status();
   */
  status(code: number): this;
  status(): number;
  status(code?: number): this | number {
    if (!this.init) this.init = {};
    if (code) {
      this.init.statusText = STATUS_LIST[code];
      this.init.status = code;
      return this;
    }
    return (this.init.status || 200);
  }
  /**
   * sendStatus
   * @example
   * return response.sendStatus(500);
   */
  sendStatus(code: number) {
    return this.status(code).send(STATUS_LIST[code]);
  }
  /**
   * setHeader
   * @example
   * response.setHeader("key", "value");
   */
  setHeader(key: string, value: string | string[]) {
    return this.header(key, value);
  }
  /**
   * getHeader
   * @example
   * const str = response.getHeader("key");
   */
  getHeader(key: string) {
    return this.header(key);
  }
  /**
   * sendFile
   * @example
   * return response.sendFile("folder/file.txt");
   * return response.sendFile("folder/file.txt", { etag: false });
   */
  async sendFile(
    pathFile: string,
    opts: {
      etag?: boolean;
      readFile?: (pathFile: string) => TRet;
      stat?: (pathFile: string) => TRet;
    } = {},
  ) {
    createOptionFile(opts);
    const stat = await opts.stat?.(pathFile);
    this.type(this.header("content-type") ?? getContentType(pathFile));
    if (opts.etag && is304(this, stat)) return this.status(304).send();
    const file = await opts.readFile?.(pathFile);
    return this.resp(new Response(file, this.init));
  }
  /**
   * download
   * @example
   * return response.download("folder/file.txt");
   * return response.download("folder/file.txt", "filename.txt", { etag: false });
   */
  async download(
    pathFile: string,
    filename?: string,
    opts: {
      etag?: boolean;
      readFile?: (pathFile: string) => TRet;
      stat?: (pathFile: string) => TRet;
    } = {},
  ) {
    filename = filename ?? pathFile.substring(pathFile.lastIndexOf("/") + 1);
    createOptionFile(opts);
    const stat = await opts.stat?.(pathFile);
    this.type(this.header("content-type") ?? getContentType(pathFile));
    this.header("content-disposition", `attachment; filename=${filename}`);
    if (opts.etag && is304(this, stat)) return this.status(304).send();
    const file = await opts.readFile?.(pathFile);
    return this.resp(new Response(file, this.init));
  }
  /**
   * set/get statusCode
   * @example
   * // set status
   * response.statusCode = 200;
   *
   * // get status
   * const status = response.statusCode;
   */
  get statusCode() {
    return this.status();
  }
  set statusCode(val: number) {
    this.status(val);
  }
  /**
   * shorthand for content-type headers
   * @example
   * return response.type("html").send("<h1>hello, world</h1>");
   */
  type(contentType: string) {
    return this.header("content-type", MIME_LIST[contentType] ?? contentType);
  }
  /**
   * send response body
   * @example
   * return response.send("hello");
   */
  send(body?: BodyInit | TObject | null) {
    return sendBody(this.resp, this.init, body);
  }
  /**
   * shorthand for send json body
   * @example
   * return response.json({ name: "john" });
   */
  json(body: TObject | null) {
    if (!this.init) this.init = {};
    if (this.init.headers) this.type(JSON_TYPE_CHARSET);
    else this.init.headers = { "content-type": JSON_TYPE_CHARSET };
    return this.resp(new Response(JSON.stringify(body), this.init));
  }
  /**
   * redirect url
   * @example
   * return response.redirect("/home");
   * return response.redirect("/home", 301);
   * return response.redirect("http://google.com");
   */
  redirect(url: string, status?: number) {
    return this.header("Location", url).status(status ?? 302).send();
  }
  /**
   * cookie
   * @example
   * response.cookie("key", "value" , {
   *    httpOnly: true
   * });
   */
  cookie(
    name: string,
    value: string | string[] | number | number[] | TObject | undefined,
    opts: Cookie = {},
  ) {
    opts.httpOnly = opts.httpOnly !== false;
    opts.path = opts.path || "/";
    if (opts.maxAge) {
      opts.expires = new Date(Date.now() + opts.maxAge);
      opts.maxAge /= 1000;
    }
    value = typeof value === "object"
      ? "j:" + JSON.stringify(value)
      : String(value);
    this.headers.append(
      "Set-Cookie",
      serializeCookie(name, value, opts),
    );
    return this;
  }
  /**
   * clear cookie
   * @example
   * response.clearCookie("name");
   */
  clearCookie(name: string, opts: Cookie = {}) {
    opts.httpOnly = opts.httpOnly !== false;
    this.headers.append(
      "Set-Cookie",
      serializeCookie(name, "", { ...opts, expires: new Date(0) }),
    );
  }
  [k: string]: TRet;
}

export class JsonResponse extends Response {
  constructor(body: TObject | null, resInit: ResponseInit = {}) {
    if (resInit.headers) {
      if (resInit.headers instanceof Headers) {
        resInit.headers.set("content-type", JSON_TYPE_CHARSET);
      } else (resInit.headers as TObject)["content-type"] = JSON_TYPE_CHARSET;
    } else resInit.headers = { "content-type": JSON_TYPE_CHARSET };
    super(JSON.stringify(body), resInit);
  }
}
