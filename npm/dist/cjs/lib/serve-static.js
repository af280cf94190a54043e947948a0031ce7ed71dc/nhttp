var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __reExport = (target, module2, copyDefault, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && (copyDefault || key !== "default"))
        __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target;
};
var __toCommonJS = /* @__PURE__ */ ((cache) => {
  return (module2, temp) => {
    return cache && cache.get(module2) || (temp = __reExport(__markAsModule({}), module2, 1), cache && cache.set(module2, temp), temp);
  };
})(typeof WeakMap !== "undefined" ? /* @__PURE__ */ new WeakMap() : 0);
var serve_static_exports = {};
__export(serve_static_exports, {
  default: () => serve_static_default,
  sendFile: () => sendFile,
  serveStatic: () => serveStatic
});
var import_deps = require("./deps");
var import_etag = require("./etag");
const sendFile = import_etag.sendFile;
function serveStatic(dir, opts = {}) {
  opts.index ??= "index.html";
  opts.redirect ??= true;
  if (dir.endsWith("/"))
    dir = dir.slice(0, -1);
  const index = opts.redirect ? opts.index : "";
  return async (rev, next) => {
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
          if (opts.prefix[0] !== "/")
            opts.prefix = "/" + opts.prefix;
          if (!rev.path.startsWith(opts.prefix))
            return next();
          pathFile = pathFile.replace(opts.prefix, "");
        }
      }
      const idx = pathFile.lastIndexOf(".");
      if (pathFile.slice((idx - 1 >>> 0) + 2) === "") {
        if (pathFile.endsWith("/"))
          pathFile += index;
        else
          pathFile += "/" + index;
      }
      return await sendFile(rev, (0, import_deps.decURIComponent)(pathFile), opts);
    } catch {
      if (!opts.spa || !index)
        return next();
      let spa = dir + "/" + index;
      if (spa.startsWith("file://"))
        spa = new URL(spa).pathname;
      return await sendFile(rev, (0, import_deps.decURIComponent)(spa), opts);
    }
  };
}
var serve_static_default = serveStatic;
module.exports = __toCommonJS(serve_static_exports);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  sendFile,
  serveStatic
});
