package main

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed static
var staticFS embed.FS

// routes builds the HTTP router and registers every route on the server
func routes() http.Handler {
	// API routes, written without the prefix
	api := http.NewServeMux()
	api.HandleFunc("GET /templates/{id}", handleGetTemplate)
	api.HandleFunc("POST /templates", postTemplate)
	api.HandleFunc("POST /documents", generateDocuments)

	// Initialize a multiplexer (router)
	mux := http.NewServeMux()
	// Route for a healthcheck
	mux.HandleFunc("GET /healthz", healthz)
	// Strip the prefix so mux sees /templates and not /api/v1
	mux.Handle("/api/v1/", http.StripPrefix("/api/v1", api))

	// Serve the frontend within the static directory
	site, err := fs.Sub(staticFS, "static")
	if err != nil {

	}
	mux.Handle("/", http.FileServerFS(site))
	return mux
}
