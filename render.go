package main

import (
	"bytes"
	"text/template"
)

func parseTemplate(templ Template, params Parameters) ([]string, error) {
	// Create and parse the body of a text/template object
	outputTemp, err := template.New(templ.Name).Option("missingkey=error").Parse(templ.Body)
	if err != nil {
		return nil, err
	}

	// Create the buffer that will be used to store the output
	var buf bytes.Buffer
	// Create the string slice that will hold all the parsed templates
	parsedTemplates := []string{}
	for _, paramMap := range params {
		buf.Reset()
		if err := outputTemp.Execute(&buf, paramMap); err != nil {
			return nil, err
		}
		parsedTemplates = append(parsedTemplates, buf.String())
	}

	return parsedTemplates, nil
}
