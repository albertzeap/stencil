package main

import (
	"github.com/google/uuid"
)

func createUUID() string {
	return uuid.New().String()
}

func GetTemplate(id string) (Template, error) {
	templ, err := getTemplate(id)
	if err != nil {
		return Template{}, err
	}
	return templ, nil
}

// CreateTemplate creates a template
func CreateTemplate(name, body string, params Parameters) (Template, error) {
	templ := Template{ID: createUUID(), Name: name, Body: body, Parameters: params}
	err := saveTemplate(templ)
	if err != nil {
		return Template{}, err
	}
	return templ, nil
}

// CreateDocument creates a document from the template and provided Parameters
func CreateDocument(id string) ([]string, error) {
	// TODO: Obtain the template from the provided template ID
	templ, err := getTemplate(id)
	if err != nil {
		return nil, err
	}
	// TODO: Parse and render the template
	documents, err := parseTemplate(templ)
	return documents, err
}
