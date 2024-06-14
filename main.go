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
			err := database.Close()
			if err != nil {
				log.Printf("ERROR closeDatabase: %v\n", err)
			}
		}
		if logFile != nil {
			err := logFile.Close()
			if err != nil {
				log.Printf("ERROR closeLog: %v\n", err)
			}
		}
	}()
	if err != nil {
		log.Printf("ERROR inits: %v", err)
		return
	}

	boot.StartHttpHandler(handler, config.Twitch.WebhookPort)
}
