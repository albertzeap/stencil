package main

import (
	"database/sql"
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
		name text NOT NULL, 
		body text NOT NULL
	);

	CREATE TABLE IF NOT EXISTS parameters (
		id TEXT PRIMARY KEY,
		template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
		data TEXT
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
	// Insert the template into the sqlite db
	_, err = conn.Exec("INSERT INTO templates (id, name, body) VALUES (?, ?, ?)",
		templ.ID, templ.Name, templ.Body,
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
	var templ Template
	// Select the ID for the template
	err = conn.QueryRow("SELECT id, name, body FROM templates WHERE id = ?", id).Scan(&templ.ID, &templ.Name, &templ.Body)
	// Error if there is nothing found
	if errors.Is(err, sql.ErrNoRows) {
		return Template{}, err
	}
	if err != nil {
		return Template{}, err
	}

	return templ, nil
}

// TODO:  Store the parameters
func saveParameters(templateId string, params Parameters) error {
	return nil
}

// TODO:  Get the parameters
func getParameters(templateId string) (Parameters, error) {
	return Parameters{}, nil
}
