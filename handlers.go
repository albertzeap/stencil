package main

import (
	"encoding/json"
	"net/http"
)

// healthz reports that the server is up. It returns a simple response
func healthz(writer http.ResponseWriter, request *http.Request) {
	writer.WriteHeader(http.StatusOK)
	writer.Write([]byte("Server is up and healthy\n"))
}

// postTemplate creates a template from the incoming post request
func postTemplate(writer http.ResponseWriter, request *http.Request) {
	var payload struct {
		Name string `json:"name"`
		Body string `json:"body"`
	}
	// Check to see if the request is valid JSON
	if err := json.NewDecoder(request.Body).Decode(&payload); err != nil {
		http.Error(writer, "Not a valid request body", http.StatusBadRequest)
		return
	}
	// Check to see if the request has values for requested fields
	if payload.Name == "" || payload.Body == "" {
		http.Error(writer, "Not a valid request body", http.StatusBadRequest)
		return
	}
	createdTemp, err := CreateTemplate(payload.Name, payload.Body)
	if err != nil {
		http.Error(writer, "Failed to create template", http.StatusInternalServerError)
		return
	}
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(http.StatusCreated)
	json.NewEncoder(writer).Encode(createdTemp)
}

// generateDocument creates the documents with the given template and parameters from the incoming post request
func generateDocuments(writer http.ResponseWriter, request *http.Request) {
	var payload struct {
		TemplateID int         `json:"template_id"`
		Parameters []Parameter `json:"parameters"`
	}
	// Check to see if the request is valid JSON
	if err := json.NewDecoder(request.Body).Decode(&payload); err != nil {
		http.Error(writer, "Not a valid request body", http.StatusBadRequest)
		return
	}
	// Check to see if the request has values for requested fields
	if payload.TemplateID == 0 || len(payload.Parameters) == 0 {
		http.Error(writer, "Not a valid request body", http.StatusBadRequest)
		return
	}
	createdDocument := Parameter{"key": "value"}
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(http.StatusCreated)
	json.NewEncoder(writer).Encode(createdDocument)
}
