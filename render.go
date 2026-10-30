package main

import (
	"bytes"
	"text/template"
)

func parseTemplate(templ Template, params Parameters) string {
	// Create and parse the body of a text/template object
	outputTemp, err := template.New(templ.Name).Parse(templ.Body)
	if err != nil {
	}

	// Create the buffer that will be used to store the output
	var buf bytes.Buffer
	for _, paramMap := range params {
		if err := outputTemp.Execute(&buf, paramMap); err != nil {
		}
	}
	return buf.String()
}
