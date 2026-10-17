package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	// Initialize the logger for the web server
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	// Initialize multiplexer (router)
	mux := http.NewServeMux()

	//Initialize web server object
	server := &http.Server{
		Addr:              ":8080",
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	// Create context and stop objects to detect when
	// the server process is being terminated
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Start the server with a goroutine so that other processes can still be ran
	go func() {
		logger.Info("listening", "addr", server.Addr)
		if err := server.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
			logger.Error("server failed", "err", err)
			os.Exit(1)
		}
	}()
	<-ctx.Done()
	logger.Info("shutting down")

	// Shutdown the server when invoked
	shutdownContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownContext); err != nil {
		logger.Error("shutdown failed", "err", err)
		os.Exit(1)
	}
}
