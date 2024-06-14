package boot

import (
	"LiveStatus/src/usecase/twitch"
	"log"
	"net/http"
	"strconv"
)

func StartHttpHandler(handler twitch.Handler, port int) {
	done := make(chan bool)
	go func() {
		err := http.ListenAndServe(":"+strconv.Itoa(port), handler.GetHandler())
		if err != nil {
			log.Fatalf("failed to listen: %v\n", err)
		}
	}()
	log.Printf("Server started at port %v", port)
	<-done
}
