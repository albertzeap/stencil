package main

import (
	"net/http"
)

// healthz reports that the server is up. It returns a simple response
func healthz(writer http.ResponseWriter, request *http.Request) {
	writer.WriteHeader(http.StatusOK)
	writer.Write([]byte("Server is up and healthy\n"))
}

// postTemplate creates a template from the incoming post request
func postTemplate(writer http.ResponseWriter, request *http.Request) {
	writer.WriteHeader(http.StatusCreated)
	writer.Write([]byte("Template has been created\n"))
}

// postParameter creates a parameter from the incoming post request
func postParameter(writer http.ResponseWriter, request *http.Request) {
	writer.WriteHeader(http.StatusCreated)
	writer.Write([]byte("Parameter has been created\n"))
}

// generateDocument creates the documents with the given template and parameters from the incoming post request
func generateDocument(writer http.ResponseWriter, request *http.Request) {
	writer.WriteHeader(http.StatusCreated)
	writer.Write([]byte("Document has been created\n"))
}
