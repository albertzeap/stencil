package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	_ "modernc.org/sqlite"
	"sync"
)

var (
	db      *sql.DB
	dbOnce  sync.Once
	dbError error
)

const (
	dbDriver = "sqlite"
	dbSource = "stencil.db"
	schema   = `
	CREATE TABLE IF NOT EXISTS templates (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL, 
		body TEXT NOT NULL,
		parameters TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(parameters))
	);
	`
)

// getDB starts a singleton of the db connection
func getDB() (*sql.DB, error) {
	dbOnce.Do(func() {
		db, dbError = sql.Open(dbDriver, dbSource)
		if dbError != nil {
			return
		}
		if dbError = db.Ping(); dbError != nil {
			return
		}
		_, dbError = db.Exec(schema)
	})
	return db, dbError
}

// TODO: Store the template
func saveTemplate(templ Template) error {
	conn, err := getDB()
	if err != nil {
		return err
	}
	if templ.Parameters == nil {
		templ.Parameters = Parameters{}
	}
	jsonBlob, err := json.Marshal(templ.Parameters)
	if err != nil {
		return err
	}
	// Insert the template into the sqlite db
	_, err = conn.Exec("INSERT INTO templates (id, name, body, parameters) VALUES (?, ?, ?, ?)",
		templ.ID, templ.Name, templ.Body, string(jsonBlob),
	)
	if err != nil {
		return err
	}
	return nil
}

// TODO:  Get the template
func getTemplate(id string) (Template, error) {
	conn, err := getDB()
	if err != nil {
		return Template{}, err
	}
	var (
		templ      Template
		stringBlob string
	)
	// Select the ID for the template
	err = conn.QueryRow("SELECT id, name, body, parameters FROM templates WHERE id = ?", id).Scan(&templ.ID, &templ.Name, &templ.Body, &stringBlob)
	// Error if there is nothing found
	if errors.Is(err, sql.ErrNoRows) {
		return Template{}, err
	}
	if json.Unmarshal([]byte(stringBlob), &templ.Parameters); err != nil {
		return Template{}, err
	}
	return templ, nil
}
