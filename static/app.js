// app.js: page behavior. Talks to the server only through window.api (api.js).
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const els = {
    views: { write: $("view-write"), recipients: $("view-recipients"), letters: $("view-letters") },
    navButtons: document.querySelectorAll("[data-view]"),
    navLetters: $("nav-letters"),
    name: $("template-name"),
    body: $("template-body"),
    mirror: $("mirror"),
    fields: $("fields"),
    btnContinue: $("btn-continue"),
    btnGenerate: $("btn-generate"),
    btnBack: $("btn-back"),
    recipients: $("recipients"),
    recipientCount: $("recipient-count"),
    addRow: $("add-row"),
    statLetters: $("stat-letters"),
    statWords: $("stat-words"),
    letters: $("letters"),
    copyAll: $("copy-all"),
    downloadAll: $("download-all"),
    print: $("print"),
    toasts: $("toasts"),
    openPalette: $("open-palette"),
    palette: $("palette"),
    paletteInput: $("palette-input"),
    paletteList: $("palette-list"),
  };

  const STORAGE_KEY = "stencil.templates";
  const STARTER_NAME = "thank you note";
  const STARTER_BODY =
    "Dear {{ .name }},\n\n" +
    "Thank you so much for the {{ .gift }}. It was a thoughtful surprise, and we love it.\n\n" +
    "With thanks,\n{{ .sender }}";
  const SEPARATOR = "\n\n----------\n\n";

  const state = {
    view: "write",
    saved: null, // the template as the server has it: { id, name, body, parameters }
    savedSnapshot: "", // snapshot() of the page at the moment it was saved or opened
    fields: [], // placeholder names found in the body, in order of appearance
    rows: [{}], // one object per recipient: { fieldName: value }
    letters: [], // generated text, one entry per recipient
    busy: false,
  };

  // ---------- helpers ----------

  function escapeHTML(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function sameList(a, b) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }

  function slug(s) {
    return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "letter";
  }

  function toast(text, kind) {
    const t = document.createElement("div");
    t.className = "toast";
    t.dataset.kind = kind || "info";
    t.textContent = text;
    t.addEventListener("click", () => t.remove());
    els.toasts.append(t);
    setTimeout(() => t.remove(), kind === "error" ? 8000 : 3500);
  }

  // Finds the fields a text/template body uses: {{ .name }}, {{ if .x }}, and so on.
  // Only top-level keys count, because documents are filled from a flat map.
  function parseFields(body) {
    const found = [];
    for (const action of body.matchAll(/\{\{-?([\s\S]*?)-?\}\}/g)) {
      const text = action[1];
      if (text.includes("/*")) continue; // comment
      const cleaned = text.replace(/"(?:[^"\\]|\\.)*"|`[^`]*`/g, '""'); // ignore string literals
      for (const m of cleaned.matchAll(/(?:^|[\s(|,])\.([A-Za-z_]\w*)/g)) {
        if (!found.includes(m[1])) found.push(m[1]);
      }
    }
    return found;
  }

  // The parameters to store with the template: one object per letter, holding
  // every field the body uses. A body with no fields still needs one empty
  // object, because the server renders one letter per parameter.
  function buildParameters() {
    const fields = state.fields;
    if (fields.length === 0) return [{}];
    return state.rows.map((row) => Object.fromEntries(fields.map((f) => [f, row[f] || ""])));
  }

  // Everything that gets saved, as one string, so "changed since saved?" is a comparison
  function snapshot() {
    return JSON.stringify({ name: els.name.value.trim(), body: els.body.value, parameters: buildParameters() });
  }

  function isDirty() {
    return !state.saved || snapshot() !== state.savedSnapshot;
  }

  function countWords(s) {
    return s.split(/\s+/).filter(Boolean).length;
  }

  // ---------- remembered templates (this browser only) ----------
  // The server has no "list templates" endpoint yet, so we remember the ones
  // this browser has saved or opened.

  function readList() {
    try {
      const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(v) ? v.filter((t) => t && typeof t.id === "string" && typeof t.name === "string") : [];
    } catch (e) {
      return [];
    }
  }

  function writeList(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      /* storage can be blocked; the list just won't persist */
    }
  }

  function remember(t) {
    const list = readList().filter((x) => x.id !== t.id);
    list.unshift({ id: t.id, name: t.name });
    writeList(list.slice(0, 50));
  }

  function forget(id) {
    writeList(readList().filter((x) => x.id !== id));
  }

  // ---------- views ----------

  function setView(name) {
    state.view = name;
    for (const [key, el] of Object.entries(els.views)) el.hidden = key !== name;
    for (const btn of els.navButtons) {
      if (btn.dataset.view === name) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    }
    if (name === "write") {
      focusBody();
    } else if (name === "recipients") {
      renderRecipients();
      focusFirstEmpty();
    }
  }

  function focusBody(toEnd) {
    els.body.focus({ preventScroll: true });
    if (toEnd) {
      const n = els.body.value.length;
      els.body.setSelectionRange(n, n);
    }
  }

  // The main action of whichever view you're on (ctrl + enter)
  function primaryAction() {
    if (state.busy) return;
    if (state.view === "write") {
      if (state.fields.length) setView("recipients");
      else generate();
    } else if (state.view === "recipients") {
      generate();
    } else {
      setView("write");
    }
  }

  function updateActions() {
    const generateLabel = state.busy ? "working…" : isDirty() ? "save + generate" : "generate";
    els.btnContinue.querySelector(".label").textContent = state.fields.length ? "continue" : generateLabel;
    els.btnGenerate.querySelector(".label").textContent = generateLabel;
    els.btnContinue.disabled = state.busy;
    els.btnGenerate.disabled = state.busy;
  }

  // ---------- typing area ----------

  function renderMirror() {
    const body = els.body.value;
    let html = "";
    let last = 0;
    for (const m of body.matchAll(/\{\{[\s\S]*?\}\}/g)) {
      html += escapeHTML(body.slice(last, m.index)) + '<span class="blank">' + escapeHTML(m[0]) + "</span>";
      last = m.index + m[0].length;
    }
    els.mirror.innerHTML = html + escapeHTML(body.slice(last));
  }

  function autoGrow() {
    els.body.style.height = "auto";
    els.body.style.height = els.body.scrollHeight + "px";
  }

  function renderFieldNames() {
    els.fields.replaceChildren();
    if (state.fields.length === 0) {
      const none = document.createElement("span");
      none.className = "no-fields";
      none.textContent = "none yet";
      els.fields.append(none);
      return;
    }
    for (const f of state.fields) {
      const span = document.createElement("span");
      span.className = "field-name";
      span.textContent = f;
      els.fields.append(span);
    }
  }

  // Let the name box grow with its text, within a sensible range
  function sizeName() {
    const chars = Math.min(40, Math.max(14, els.name.value.length + 1));
    els.name.style.width = "calc(" + chars + "ch + 1.5rem)";
  }

  function onBodyChange() {
    sizeName();
    renderMirror();
    autoGrow();
    const fields = parseFields(els.body.value);
    if (!sameList(fields, state.fields)) {
      state.fields = fields;
      renderFieldNames();
      renderRecipients();
    }
    updateActions();
  }

  // ---------- recipients ----------

  function focusCell(row, col) {
    const input = els.recipients.querySelector('input[data-row="' + row + '"][data-col="' + col + '"]');
    if (input) input.focus();
  }

  function focusFirstEmpty() {
    const inputs = els.recipients.querySelectorAll("input");
    for (const input of inputs) {
      if (!input.value) {
        input.focus();
        return;
      }
    }
    if (inputs.length) inputs[0].focus();
  }

  function renderRecipients() {
    els.recipients.replaceChildren();
    els.recipientCount.textContent = state.fields.length ? String(state.rows.length) : "1";
    els.addRow.hidden = state.fields.length === 0;
    const fields = state.fields;

    if (fields.length === 0) {
      const p = document.createElement("p");
      p.className = "single-note";
      p.textContent = "this template has no blanks, so it makes one letter.";
      els.recipients.append(p);
      return;
    }

    const table = document.createElement("table");
    const head = table.createTHead().insertRow();
    for (const f of fields) {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = f;
      head.append(th);
    }
    head.append(document.createElement("td"));

    const tbody = table.createTBody();
    state.rows.forEach((row, r) => {
      const tr = tbody.insertRow();
      fields.forEach((f, c) => {
        const input = document.createElement("input");
        input.type = "text";
        input.autocomplete = "off";
        input.spellcheck = false;
        input.value = row[f] || "";
        input.dataset.row = r;
        input.dataset.col = c;
        input.setAttribute("aria-label", f + ", recipient " + (r + 1));
        input.addEventListener("input", () => {
          row[f] = input.value;
          updateActions(); // editing a recipient changes the saved template
        });
        input.addEventListener("keydown", (e) => {
          if (e.key !== "Enter" || e.ctrlKey || e.metaKey) return;
          e.preventDefault();
          // Enter moves down a row, and adds one after the last row.
          if (r === state.rows.length - 1) addRow(c);
          else focusCell(r + 1, c);
        });
        tr.insertCell().append(input);
      });
      const end = tr.insertCell();
      end.className = "row-end";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "row-remove";
      remove.textContent = "×";
      remove.title = "remove recipient";
      remove.setAttribute("aria-label", "Remove recipient " + (r + 1));
      remove.disabled = state.rows.length === 1;
      remove.addEventListener("click", () => {
        state.rows.splice(r, 1);
        renderRecipients();
        updateActions();
        focusCell(Math.min(r, state.rows.length - 1), 0);
      });
      end.append(remove);
    });
    els.recipients.append(table);
  }

  function addRow(focusCol) {
    state.rows.push({});
    renderRecipients();
    updateActions();
    focusCell(state.rows.length - 1, focusCol || 0);
  }

  // ---------- letters ----------

  function showLetters(letters, labels) {
    state.letters = letters;
    els.letters.replaceChildren();
    letters.forEach((text, i) => {
      const letter = document.createElement("article");
      letter.className = "letter";

      const head = document.createElement("div");
      head.className = "letter-head";
      const label = document.createElement("span");
      label.textContent = labels[i];
      const actions = document.createElement("span");
      actions.className = "letter-actions";

      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "link";
      copy.textContent = "copy";
      copy.addEventListener("click", () => copyText(text, copy));

      const dl = document.createElement("button");
      dl.type = "button";
      dl.className = "link";
      dl.textContent = "download";
      dl.addEventListener("click", () => download(slug(state.saved && state.saved.name) + "-" + (i + 1) + ".txt", text));

      actions.append(copy, dl);
      head.append(label, actions);

      const body = document.createElement("div");
      body.className = "letter-text";
      body.textContent = text;

      letter.append(head, body);
      els.letters.append(letter);
    });

    els.statLetters.textContent = String(letters.length);
    els.statWords.textContent = String(letters.reduce((n, t) => n + countWords(t), 0));
    els.navLetters.disabled = letters.length === 0;
  }

  function hideLetters() {
    state.letters = [];
    els.letters.replaceChildren();
    els.navLetters.disabled = true;
  }

  async function copyText(text, button) {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch (e) {
      // Fallback for pages not served over https or localhost
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.append(ta);
      ta.select();
      try {
        ok = document.execCommand("copy");
      } catch (e2) {
        ok = false;
      }
      ta.remove();
    }
    const original = button.textContent;
    button.textContent = ok ? "copied" : "copy failed";
    setTimeout(() => {
      button.textContent = original;
    }, 1500);
  }

  function download(filename, text) {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- actions ----------

  async function generate() {
    if (state.busy) return;
    const name = els.name.value.trim();
    const body = els.body.value;
    if (!name) {
      toast("give the template a name first", "error");
      setView("write");
      els.name.focus();
      return;
    }
    if (!body.trim()) {
      toast("write the letter text first", "error");
      setView("write");
      return;
    }

    state.busy = true;
    updateActions();
    try {
      // A template stores its own recipients, so they are saved together with it.
      const fields = state.fields.slice();
      const parameters = buildParameters();
      let template = state.saved;
      if (isDirty()) {
        // The server has no update endpoint, so a changed template is saved as a new one.
        const snap = snapshot();
        template = await api.createTemplate(name, body, parameters);
        state.saved = template;
        state.savedSnapshot = snap;
        remember(template);
      }

      // The server renders the template with the parameters it has stored.
      const letters = await api.generateDocuments(template.id);

      const labels = parameters.map((p, i) => {
        const first = fields.length ? (p[fields[0]] || "").trim() : "";
        return first ? "letter for " + first : "letter " + (i + 1);
      });
      showLetters(letters, labels);
      setView("letters");

      const blanks = parameters.some((p) => Object.values(p).some((v) => v.trim() === ""));
      if (blanks) toast("some fields were left blank");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      state.busy = false;
      updateActions();
    }
  }

  async function openTemplate(id, fromList) {
    id = id.trim();
    if (!id) return;
    try {
      const t = await api.getTemplate(id);
      state.saved = t;
      els.name.value = t.name;
      els.body.value = t.body;
      // A saved template brings its recipients back with it.
      const stored = Array.isArray(t.parameters) ? t.parameters.filter((p) => p && typeof p === "object") : [];
      state.rows = stored.length ? stored.map((p) => ({ ...p })) : [{}];
      state.fields = [];
      remember(t);
      hideLetters();
      onBodyChange();
      state.savedSnapshot = snapshot();
      updateActions();
      setView("write");
      focusBody(true);
    } catch (err) {
      if (err.status === 404) {
        if (fromList) forget(id);
        toast("that template isn't on the server. check the ID and try again", "error");
      } else {
        toast(err.message, "error");
      }
    }
  }

  function newTemplate() {
    state.saved = null;
    state.savedSnapshot = "";
    state.rows = [{}];
    state.fields = [];
    els.name.value = "";
    els.body.value = "";
    hideLetters();
    onBodyChange();
    setView("write");
    focusBody(true);
  }

  // ---------- templates palette (esc) ----------

  const palette = { items: [], index: 0 };

  function paletteItems() {
    const q = els.paletteInput.value.trim();
    const ql = q.toLowerCase();
    const list = readList();
    const items = [];
    if (!q || "new template".includes(ql)) items.push({ kind: "new", label: "new template", meta: "" });
    for (const t of list) {
      if (!q || t.name.toLowerCase().includes(ql) || t.id.toLowerCase().startsWith(ql)) {
        items.push({ kind: "open", id: t.id, label: t.name, meta: t.id.slice(0, 8) });
      }
    }
    if (q && !list.some((t) => t.id === q)) items.push({ kind: "id", id: q, label: "open by ID: " + q, meta: "" });
    return items;
  }

  function renderPalette() {
    palette.items = paletteItems();
    if (palette.index >= palette.items.length) palette.index = 0;
    els.paletteList.replaceChildren();
    palette.items.forEach((item, i) => {
      const li = document.createElement("li");
      li.id = "palette-item-" + i;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", i === palette.index ? "true" : "false");
      if (item.kind === "open" && state.saved && state.saved.id === item.id) li.setAttribute("aria-current", "true");
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = item.label;
      const meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = item.meta;
      li.append(name, meta);
      li.addEventListener("click", () => activatePalette(item));
      li.addEventListener("mousemove", () => {
        if (palette.index !== i) {
          palette.index = i;
          markSelected();
        }
      });
      els.paletteList.append(li);
    });
    els.paletteInput.setAttribute("aria-activedescendant", palette.items.length ? "palette-item-" + palette.index : "");
  }

  function markSelected() {
    els.paletteList.querySelectorAll("li").forEach((li, i) => li.setAttribute("aria-selected", i === palette.index ? "true" : "false"));
    els.paletteInput.setAttribute("aria-activedescendant", "palette-item-" + palette.index);
    const li = els.paletteList.children[palette.index];
    if (li) li.scrollIntoView({ block: "nearest" });
  }

  function openPalette() {
    if (els.palette.open) return;
    els.paletteInput.value = "";
    palette.index = 0;
    renderPalette();
    els.palette.showModal();
    els.paletteInput.focus();
  }

  function activatePalette(item) {
    if (!item) return;
    els.palette.close();
    if (item.kind === "new") newTemplate();
    else openTemplate(item.id, item.kind === "open");
  }

  els.paletteInput.addEventListener("input", () => {
    palette.index = 0;
    renderPalette();
  });
  els.paletteInput.addEventListener("keydown", (e) => {
    const n = palette.items.length;
    if (e.key === "ArrowDown" && n) {
      e.preventDefault();
      palette.index = (palette.index + 1) % n;
      markSelected();
    } else if (e.key === "ArrowUp" && n) {
      e.preventDefault();
      palette.index = (palette.index - 1 + n) % n;
      markSelected();
    } else if (e.key === "Enter") {
      e.preventDefault();
      activatePalette(palette.items[palette.index]);
    }
  });
  // Clicking the backdrop closes it
  els.palette.addEventListener("click", (e) => {
    if (e.target === els.palette) els.palette.close();
  });
  els.palette.addEventListener("close", () => {
    if (state.view === "write") focusBody();
  });

  // ---------- wiring ----------

  els.body.addEventListener("input", onBodyChange);
  els.name.addEventListener("input", () => {
    sizeName();
    updateActions();
  });
  window.addEventListener("resize", autoGrow);

  els.btnContinue.addEventListener("click", primaryAction);
  els.btnGenerate.addEventListener("click", primaryAction);
  els.btnBack.addEventListener("click", primaryAction);
  els.addRow.addEventListener("click", () => addRow(0));
  els.openPalette.addEventListener("click", openPalette);
  for (const btn of els.navButtons) btn.addEventListener("click", () => setView(btn.dataset.view));

  els.copyAll.addEventListener("click", () => copyText(state.letters.join(SEPARATOR), els.copyAll));
  els.downloadAll.addEventListener("click", () =>
    download(slug(state.saved && state.saved.name) + "-all.txt", state.letters.join(SEPARATOR))
  );
  els.print.addEventListener("click", () => window.print());

  // Click empty space on the write screen to keep typing
  els.views.write.addEventListener("click", (e) => {
    if (e.target === els.views.write) focusBody();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      if (els.palette.open) return;
      e.preventDefault();
      primaryAction();
    } else if (e.key === "Escape" && !els.palette.open) {
      // preventDefault stops the browser's own Esc handling from closing the dialog we just opened
      e.preventDefault();
      openPalette();
    }
  });

  // ---------- start ----------

  els.name.value = STARTER_NAME;
  els.body.value = STARTER_BODY;
  renderFieldNames();
  onBodyChange();
  setView("write");
  focusBody(true);
})();
