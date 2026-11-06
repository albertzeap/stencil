// api.js: every call to the Go server lives here, so the page code never
// builds a URL or parses a response itself.
(function () {
  const BASE = "/api/v1";

  class ApiError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
  }

  async function request(path, options) {
    let res;
    try {
      res = await fetch(BASE + path, options);
    } catch (err) {
      throw new ApiError(0, "Can't reach the server. Check that it is running.");
    }
    if (!res.ok) {
      // The Go handlers reply to errors with plain text.
      const text = (await res.text()).trim();
      throw new ApiError(res.status, text || res.status + " " + res.statusText);
    }
    return res.json();
  }

  function postJSON(path, body) {
    return request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  window.api = {
    ApiError,
    // -> { id, name, body }
    getTemplate: (id) => request("/templates/" + encodeURIComponent(id)),
    // -> { id, name, body }
    createTemplate: (name, body) => postJSON("/templates", { name, body }),
    // parameters: [{ field: value, ... }, ...]  -> ["letter 1", "letter 2", ...]
    generateDocuments: (templateId, parameters) =>
      postJSON("/documents", { template_id: templateId, parameters }),
  };
})();
