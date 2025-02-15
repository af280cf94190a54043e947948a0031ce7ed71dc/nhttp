class DocumentBuilder {
  constructor() {
    this._doc = {
      openapi: "3.0.0",
      info: {
        title: "",
        description: "",
        version: "1.0.0",
        contact: {}
      },
      tags: [],
      servers: [],
      components: {
        schemas: {}
      },
      definitions: {}
    };
  }
  setHost(str) {
    this._doc.host = str;
    return this;
  }
  addSchemes(str) {
    this._doc.schemes = (this._doc.schemes || []).concat([str]);
    return this;
  }
  addTags(object) {
    this._doc.tags = (this._doc.tags || []).concat([object]);
    return this;
  }
  useSwagger(version = "2.0.0") {
    this._doc.swagger = version;
    if (this._doc.openapi) {
      delete this._doc.openapi;
    }
    return this;
  }
  useOpenApi(version = "3.0.0") {
    this._doc.openapi = version;
    if (this._doc.swagger) {
      delete this._doc.swagger;
    }
    return this;
  }
  setInfo(info) {
    this._doc.info = info;
    return this;
  }
  addServer(url, description, variables) {
    this._doc.servers.push({ url, description, variables });
    return this;
  }
  setExternalDoc(description, url) {
    this._doc.externalDocs = { description, url };
    return this;
  }
  addSecurity(name, opts) {
    this._doc.components.securitySchemes = {
      ...this._doc.components.securitySchemes || {},
      [name]: opts
    };
    return this;
  }
  addSecurityRequirements(name, requirements = []) {
    let obj;
    if (typeof name === "string") {
      obj = { [name]: requirements };
    } else {
      obj = name;
    }
    this._doc.security = (this._doc.security || []).concat({
      ...obj
    });
    return this;
  }
  addBearerAuth(options = {
    type: "http"
  }, name = "bearerAuth") {
    this.addSecurity(name, {
      scheme: "bearer",
      bearerFormat: "JWT",
      ...options
    });
    return this;
  }
  addOAuth2(options = {
    type: "oauth2"
  }, name = "oauth2") {
    this.addSecurity(name, {
      flows: {},
      ...options
    });
    return this;
  }
  addApiKey(options = {
    type: "apiKey"
  }, name = "api_key") {
    this.addSecurity(name, {
      in: "header",
      name,
      ...options
    });
    return this;
  }
  addBasicAuth(options = {
    type: "http"
  }, name = "basicAuth") {
    this.addSecurity(name, {
      scheme: "basic",
      ...options
    });
    return this;
  }
  addCookieAuth(cookieName = "connect.sid", options = {
    type: "apiKey"
  }, name = "cookieAuth") {
    this.addSecurity(name, {
      in: "cookie",
      name: cookieName,
      ...options
    });
    return this;
  }
  build() {
    return this._doc;
  }
}
export {
  DocumentBuilder
};
