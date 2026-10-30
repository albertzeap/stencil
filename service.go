package main

import (
	"github.com/google/uuid"
)

func createUUID() string {
	return uuid.New().String()
}

// CreateTemplate creates a template
func CreateTemplate(name, body string) (Template, error) {
	return Template{ID: createUUID(), Name: name, Body: body}, nil
}

// CreateDocument creates a document from the template and provided Parameters
func CreateDocument(id string, params Parameters) ([]string, error) {
	// TODO: Obtain the template from the provided template ID
	testTemplate := Template{"123", "template-1", "This is {{ .name }}. I like to eat {{ .food }}"}
	// TODO: Parse and render the template
	documents, err := parseTemplate(testTemplate, params)
	return documents, err
}
