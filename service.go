package main

// CreateTemplate creates a template
func CreateTemplate(name, body string) (Template, error) {
	return Template{ID: 1, Name: name, Body: body}, nil
}

func CreateDocument(id int, par Parameter) {

}
