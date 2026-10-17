package main

import "net/http"

func routes() http.Handler {
	// Initialize a multiplexer (router)
	mux := http.NewServeMux()
	// Route for a healthcheck
	mux.HandleFunc("GET /healthz", healthz)
	return mux
}
