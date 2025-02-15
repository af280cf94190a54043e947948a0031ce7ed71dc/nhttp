import { HttpError } from "./error.ts";
import { multipart } from "./multipart.ts";
import { RequestEvent } from "./request_event.ts";
import {
  Handler,
  NextFunction,
  TBodyParser,
  TQueryFunc,
  TRet,
  TValidBody,
} from "./types.ts";
import {
  decoder,
  decURIComponent,
  parseQuery as parseQueryOri,
  toBytes,
} from "./utils.ts";
const c_types = [
  "application/json",
  "application/x-www-form-urlencoded",
  "text/plain",
  "multipart/form-data",
];
export const isTypeBody = (a: string, b: string) => {
  return a === b || a.includes(b);
};
function cloneReq(req: Request, body: TRet, n?: number) {
  return new Request(req.url, {
    method: "POST",
    body: n ? JSON.stringify(body) : body,
    headers: req.headers,
  });
}
export function memoBody(req: Request, body: TRet, n?: number) {
  try {
    req.json = () => cloneReq(req, body, n).json();
    req.text = () => cloneReq(req, body, n).text();
    req.arrayBuffer = () => cloneReq(req, body, n).arrayBuffer();
    req.formData = () => cloneReq(req, body, n).formData();
    req.blob = () => cloneReq(req, body, n).blob();
  } catch (_e) { /* no_^_op */ }
}

async function verifyBody(
  rev: RequestEvent,
  limit: TValidBody,
) {
  const arrBuff = await rev.request.arrayBuffer();
  const len = arrBuff.byteLength;
  if (limit && len > toBytes(limit)) {
    rev.body = {};
    throw new HttpError(
      400,
      `Body is too large. max limit ${limit}`,
      "BadRequestError",
    );
  }
  if (len === 0) return;
  memoBody(rev.request, arrBuff);
  return decURIComponent(decoder.decode(arrBuff));
}

const isNotValid = (v: TValidBody) => v === false || v === 0;
const uptd = (m: string) => m.toLowerCase().includes("unexpected end of json");

async function handleBody(
  validate: TValidBody,
  rev: RequestEvent,
  next: NextFunction,
  cb: (body: string) => void,
) {
  if (isNotValid(validate)) {
    rev.body = {};
    return next();
  }
  try {
    const body = await verifyBody(rev, validate);
    if (!body) return next();
    cb(body);
    return next();
  } catch (error) {
    return next(error);
  }
}
async function jsonBody(
  validate: TValidBody,
  rev: RequestEvent,
  next: NextFunction,
) {
  if (validate === undefined) {
    try {
      const body = await rev.request.json();
      if (body) {
        rev.body = body;
        memoBody(rev.request, body, 1);
      }
      return next();
    } catch (e) {
      if (uptd(e.message)) return next();
      return next(e);
    }
  }
  return handleBody(validate, rev, next, (body) => {
    rev.body = JSON.parse(body);
  });
}
async function multipartBody(
  validate: TValidBody,
  parseMultipart: TQueryFunc,
  rev: RequestEvent,
  next: NextFunction,
) {
  if (isNotValid(validate)) {
    rev.body = {};
    return next();
  }
  try {
    const formData = await rev.request.formData();
    const body = await multipart.createBody(formData, {
      parse: parseMultipart,
    });
    rev.body = body;
    memoBody(rev.request, formData);
    return next();
  } catch (error) {
    return next(error);
  }
}

export function bodyParser(
  opts?: TBodyParser | boolean,
  parseQuery?: TQueryFunc,
  parseMultipart?: TQueryFunc,
): Handler {
  return (rev, next) => {
    if (typeof opts === "boolean") {
      if (opts === false) return next();
      opts = void 0;
    }
    const type = (<TRet> rev.request).raw
      ? (<TRet> rev.request).raw.req.headers["content-type"]
      : rev.request.headers.get("content-type");
    if (type) {
      if (isTypeBody(type, c_types[0])) {
        return jsonBody(opts?.json, rev, next);
      }
      if (isTypeBody(type, c_types[1])) {
        return handleBody(opts?.urlencoded, rev, next, (body) => {
          const parse = parseQuery ?? parseQueryOri;
          rev.body = parse(body);
        });
      }
      if (isTypeBody(type, c_types[2])) {
        return handleBody(opts?.raw, rev, next, (body) => {
          try {
            rev.body = JSON.parse(body);
          } catch {
            rev.body = { _raw: body };
          }
        });
      }
      if (isTypeBody(type, c_types[3])) {
        return multipartBody(opts?.multipart, parseMultipart, rev, next);
      }
    }
    return next();
  };
}
