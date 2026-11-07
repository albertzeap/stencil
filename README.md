# Stencil

Stencil generates letters from templates. You write a template once, list the recipients, and Stencil produces one filled-in letter per recipient. It ships as a single Go binary with a built-in web interface and a JSON API.

## Requirements

- Go 1.26.8 or later

SQLite is provided by `modernc.org/sqlite`, which is pure Go, so no C compiler or system SQLite is needed.

## Run

```bash
go run .
```

Or build a binary first:

```bash
go build
./stencil
```

The server listens on port 8080. Open http://localhost:8080 for the web interface.

On first start it creates `stencil.db` in the working directory. Delete that file to reset all data.

The server logs JSON to stdout and shuts down cleanly on SIGINT or SIGTERM.

## Writing templates

Templates use Go's [`text/template`](https://pkg.go.dev/text/template) syntax. Blanks are written as `{{ .name }}`, and each recipient supplies a value for every blank:

```
Dear {{ .name }},

Thank you so much for the {{ .gift }}.
```

A template with no blanks produces one letter. Rendering fails if a recipient is missing a value for a blank.

## Web interface

The interface is in `static/` and is embedded into the binary, so changes to those files need a rebuild.

- Write the letter text on the home screen. Blanks are highlighted and detected automatically.
- `ctrl + enter` moves to the next step: recipients, then generate, then back to write.
- `esc` opens the template picker. It lists templates saved from this browser, and any template can be opened by pasting its ID.
- Generated letters can be copied, downloaded as text, or printed.

## API

All routes are under `/api/v1`. Request and response bodies are JSON.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/templates` | Create a template with its recipients. Returns `201` and the template. |
| `GET` | `/api/v1/templates/{id}` | Fetch a template, including its recipients. |
| `POST` | `/api/v1/documents` | Generate the letters for a template. Returns `201` and an array of strings. |
| `GET` | `/healthz` | Health check. |

Create a template, using the `id` in the response for the next call:

```bash
curl -X POST http://localhost:8080/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Thank you",
    "body": "Dear {{ .name }}, thank you for the {{ .gift }}.",
    "parameters": [
      {"name": "Ana", "gift": "mug"},
      {"name": "Bo", "gift": "plant"}
    ]
  }'
```

Generate the letters:

```bash
curl -X POST http://localhost:8080/api/v1/documents \
  -H "Content-Type: application/json" \
  -d '{"template_id": "<id>"}'
```

```json
["Dear Ana, thank you for the mug.", "Dear Bo, thank you for the plant."]
```

Templates cannot be edited after they are created. Saving a changed template creates a new one with a new ID.

## Project layout

| File | Purpose |
|---|---|
| `main.go` | Starts the HTTP server and handles shutdown |
| `routes.go` | Route table and embedded static files |
| `handlers.go` | HTTP handlers |
| `service.go` | Creating templates and generating documents |
| `render.go` | Template rendering |
| `store.go` | SQLite storage |
| `models.go` | `Template` and `Parameters` types |
| `static/` | Web interface (HTML, CSS, JavaScript) |
