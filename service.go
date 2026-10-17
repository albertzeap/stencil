package main

// CreateTemplate creates a template
func CreateTemplate(name, body string) (Template, error) {
	respTemp := Template{
		ID:   1,
		Name: name,
		Body: body,
	}
	return respTemp, nil
}

// CreateParameter creates a parameter
func CreateParameter(key, value string) (Parameter, error) {
	respParameter := Parameter{
		ID:    1,
		Key:   key,
		Value: value,
	}
	return respParameter, nil
}
