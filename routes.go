package main

import "net/http"

// routes builds the HTTP router and registers every route on the server
func routes() http.Handler {
	// Initialize a multiplexer (router)
	mux := http.NewServeMux()
	// Route for a healthcheck
	mux.HandleFunc("GET /healthz", healthz)
	mux.HandleFunc("GET /templates/{id}", handleGetTemplate)

	mux.HandleFunc("POST /templates", postTemplate)
	mux.HandleFunc("POST /documents", generateDocuments)
	return mux
}
