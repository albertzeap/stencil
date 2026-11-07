package main

// Template is a resuable document body with placeholders
type Template struct {
	ID         string     `json:"id"`
	Name       string     `json:"name"`
	Body       string     `json:"body"`
	Parameters Parameters `json:"parameters"`
}

// Parameter is a map of key value pairs
// These key value pairs represent the placeholder keys
// and the values that the template will contain
type Parameter map[string]string

// Parameters are maps of Parameter
// These are useful in the case when mutiple Parameter
// are applied to the same template for bulk generation
type Parameters []Parameter
