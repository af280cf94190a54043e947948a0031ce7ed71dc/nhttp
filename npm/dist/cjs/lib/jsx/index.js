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
var jsx_exports = {};
__export(jsx_exports, {
  Fragment: () => Fragment,
  Helmet: () => Helmet,
  n: () => n,
  renderToHtml: () => renderToHtml,
  renderToString: () => renderToString
});
const dangerHTML = "dangerouslySetInnerHTML";
const emreg = /area|base|br|col|embed|hr|img|input|keygen|link|meta|param|source|track|wbr/;
function escapeHtml(unsafe) {
  return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function n(name, props, ...args) {
  props ??= { children: "" };
  if (!name)
    return "";
  const children = args.map((el) => {
    return typeof el === "number" ? String(el) : el;
  }).filter(Boolean);
  if (typeof name === "function") {
    if (name.name === "Helmet")
      props.h_children = children;
    else
      props.children = children.join("");
    return name(props);
  }
  let str = `<${name}`;
  for (const k in props) {
    const val = props[k];
    if (val !== void 0 && val !== null && k !== dangerHTML && k !== "children") {
      const type = typeof val;
      if (type === "boolean" || type === "object") {
        if (type === "object") {
          str += ` ${k}="${Object.keys(val).reduce((a, b) => a + b.split(/(?=[A-Z])/).join("-").toLowerCase() + ":" + (typeof val[b] === "number" ? val[b] + "px" : val[b]) + ";", "")}"`;
        } else if (val === true)
          str += ` ${k}`;
        else if (val === false)
          str += "";
      } else
        str += ` ${k}="${escapeHtml(val.toString())}"`;
    }
  }
  str += ">";
  if (emreg.test(name))
    return str;
  if (props[dangerHTML]) {
    str += props[dangerHTML].__html;
  } else {
    children.forEach((child) => {
      if (typeof child === "string")
        str += child;
    });
  }
  return str += name ? `</${name}>` : "";
}
const Fragment = ({ children }) => children;
n.Fragment = Fragment;
function toHelmet(olds, childs) {
  const idx = olds.findIndex((el) => el.startsWith("<title>"));
  const latest = childs.map((item) => {
    if (item.startsWith("<title>") && idx !== -1)
      olds.splice(idx, 1);
    return item;
  });
  const arr = latest.concat(olds);
  return arr.filter((item, i) => arr.indexOf(item) === i);
}
function toAttr(regex, child) {
  const arr = regex.exec(child) ?? [];
  return arr.length === 2 ? arr[1] : "";
}
const Helmet = ({ h_children, body }) => {
  const heads = Helmet.head?.() ?? [];
  const bodys = Helmet.body?.() ?? [];
  const childs = [];
  for (let i = 0; i < h_children.length; i++) {
    const child = h_children[i];
    if (child.startsWith("<html")) {
      Helmet.htmlAttr = () => toAttr(/<html\s([^>]+)><\/html>/gm, child);
    } else if (child.startsWith("<body")) {
      Helmet.bodyAttr = () => toAttr(/<body\s([^>]+)><\/body>/gm, child);
    } else
      childs.push(child);
  }
  if (body)
    Helmet.body = () => toHelmet(bodys, childs);
  else
    Helmet.head = () => toHelmet(heads, childs);
  return null;
};
const tt = "\n	";
const resetHelmet = () => {
  Helmet.head = void 0;
  Helmet.body = void 0;
  Helmet.htmlAttr = void 0;
  Helmet.bodyAttr = void 0;
};
const renderToString = (elem) => elem;
const renderToHtml = (elem) => {
  const head = Helmet.head?.();
  const body = Helmet.body?.();
  const htmlAttr = Helmet.htmlAttr?.() ?? `lang="en"`;
  const bodyAttr = Helmet.bodyAttr?.() ?? "";
  resetHelmet();
  return `<!DOCTYPE html>
<html${htmlAttr ? ` ${htmlAttr}` : ""}>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">${head ? `${tt}${head.join(tt)}` : ""}
  </head>
  <body${bodyAttr ? ` ${bodyAttr}` : ""}>
    ${elem}${body ? `${tt}${body.join(tt)}` : ""}
  </body>
</html>`;
};
module.exports = __toCommonJS(jsx_exports);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Fragment,
  Helmet,
  n,
  renderToHtml,
  renderToString
});
