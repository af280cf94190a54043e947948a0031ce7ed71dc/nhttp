import { decURIComponent, NextFunction, RequestEvent } from "./deps.ts";
import { sendFile as sendFileEtag, TOptsSendFile } from "./etag.ts";

interface StaticOptions extends TOptsSendFile {
  index?: string;
  redirect?: boolean;
  prefix?: string;
  spa?: boolean;
}
export const sendFile = sendFileEtag;
export function serveStatic(dir: string, opts: StaticOptions = {}) {
  opts.index ??= "index.html";
  opts.redirect ??= true;
  if (dir.endsWith("/")) dir = dir.slice(0, -1);
  const index = opts.redirect ? opts.index : "";
  return async (rev: RequestEvent, next: NextFunction) => {
    if (rev.method !== "GET" && rev.method !== "HEAD") {
      return next();
    }
    try {
      let pathFile = dir + rev.path;
      if (pathFile.startsWith("file://")) {
        pathFile = new URL(pathFile).pathname;
      }
      if (opts.prefix) {
        if (opts.prefix !== "/") {
          if (opts.prefix[0] !== "/") opts.prefix = "/" + opts.prefix;
          if (!rev.path.startsWith(opts.prefix)) return next();
          pathFile = pathFile.replace(opts.prefix, "");
        }
      }
      const idx = pathFile.lastIndexOf(".");
      if (pathFile.slice((idx - 1 >>> 0) + 2) === "") {
        if (pathFile.endsWith("/")) pathFile += index;
        else pathFile += "/" + index;
      }
      return await sendFile(rev, decURIComponent(pathFile), opts);
    } catch {
      if (!opts.spa || !index) return next();
      let spa = dir + "/" + index;
      if (spa.startsWith("file://")) spa = new URL(spa).pathname;
      return await sendFile(rev, decURIComponent(spa), opts);
    }
  };
}

export default serveStatic;
