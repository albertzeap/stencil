package main

// Template is a resuable document body with placeholders
type Template struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Body string `json:"body"`
}

// Parameter is a key-value struct that resembles which placeholders to replace
// in a Template
type Parameter struct {
	ID    int    `json:"id"`
	Key   string `json:"key"`
	Value string `json:"value"`
}
