package main

import (
	"github.com/google/uuid"
)

func GetTemplate(id string) (Template, error) {
	templ, err := getTemplate(id)
	if err != nil {
		return Template{}, err
	}
	return templ, nil
}

func createUUID() string {
	return uuid.New().String()
}

// CreateTemplate creates a template
func CreateTemplate(name, body string) (Template, error) {
	templ := Template{ID: createUUID(), Name: name, Body: body}
	err := saveTemplate(templ)
	if err != nil {
		return Template{}, err
	}
	return templ, nil
}

// CreateDocument creates a document from the template and provided Parameters
func CreateDocument(id string, params Parameters) ([]string, error) {
	// TODO: Obtain the template from the provided template ID
	templ, err := getTemplate(id)
	if err != nil {
		return nil, err
	}
	// TODO: Parse and render the template
	documents, err := parseTemplate(templ, params)
	return documents, err
}
