package main

import (
	"LiveStatus/src/boot"
	"log"
)

func main() {
	config, err := boot.LoadConfig()
	if err != nil {
		log.Fatalf("loadConfig: %v", err)
	}

	handler, logFile, database, err := boot.Init(config)
	defer func() {
		if database != nil {
			_ = database.Close()
		}
		if logFile != nil {
			_ = logFile.Close()
		}
	}()
	if err != nil {
		log.Printf("ERROR inits: %v", err)
		return
	}

	boot.StartHttpHandler(handler, config.Twitch.WebhookPort)
}
