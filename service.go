package main

// CreateTemplate creates a template
func CreateTemplate(name, body string) (Template, error) {
	return Template{ID: 1, Name: name, Body: body}, nil
}

// CreateParameter creates a parameter
func CreateParameter(key, value string) (Parameter, error) {
	return Parameter{ID: 1, Key: key, Value: value}, nil
}
