package twitch

import (
	"LiveStatus/src/domain"
	esb "github.com/dnsge/twitch-eventsub-bindings"
	esf "github.com/dnsge/twitch-eventsub-framework"
	"log"
)

type Handler interface {
	GetHandler() *esf.SubHandler
}

func NewHandler(mapTwitchIdsToState map[string]*domain.LiveState, twClient Client, webhookSecret string) Handler {
	subHandler := esf.NewSubHandler(true, []byte(webhookSecret))
	h := &handler{
		handler:             subHandler,
		mapTwitchIdsToState: mapTwitchIdsToState,
		twClient:            twClient,
	}

	subHandler.HandleChannelUpdate = func(headers *esb.ResponseHeaders, event *esb.EventChannelUpdate) {
		log.Printf("HandleChannelUpdate: %s\n", event.BroadcasterUserID)
		h.updateLiveState(event.BroadcasterUserID)
	}
	subHandler.HandleStreamOnline = func(headers *esb.ResponseHeaders, event *esb.EventStreamOnline) {
		log.Printf("HandleStreamOnline: %s\n", event.BroadcasterUserID)
		h.updateLiveState(event.BroadcasterUserID)
	}
	subHandler.HandleStreamOffline = func(headers *esb.ResponseHeaders, event *esb.EventStreamOffline) {
		log.Printf("HandleStreamOffline: %s\n", event.BroadcasterUserID)
		h.updateLiveState(event.BroadcasterUserID)
	}

	return h
}

type handler struct {
	handler             *esf.SubHandler
	mapTwitchIdsToState map[string]*domain.LiveState
	twClient            Client
}

func (h *handler) GetHandler() *esf.SubHandler {
	return h.handler
}

func (h *handler) updateLiveState(twitchId string) {
	go func() {
		if liveState, ok := h.mapTwitchIdsToState[twitchId]; ok {
			streams, err := h.twClient.GetStreams([]string{twitchId})
			if err != nil {
				log.Printf("ERROR updateLiveState GetStreams (twitchId=%s): %v\n", twitchId, err)
				return
			}

			var setLiveStateErr error
			if stream, ok := streams[twitchId]; ok {
				setLiveStateErr = liveState.SetLiveState(&stream)
			} else {
				setLiveStateErr = liveState.SetLiveState(nil)
			}

			if setLiveStateErr != nil {
				log.Printf("ERROR updateLiveState SetLiveState (twitchId=%s): %v\n", twitchId, err)
				return
			}
		} else {
			log.Printf("ERROR updateLiveState liveState not found (twitchId=%s)\n", twitchId)
		}
	}()
}
