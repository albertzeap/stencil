package main

import (
	"net/http"
)

func healthz(writer http.ResponseWriter, request *http.Request) {
	writer.WriteHeader(http.StatusOK)
	writer.Write([]byte("Server is up and healthy\n"))
}
