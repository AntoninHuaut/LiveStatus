package usecase

import (
	"LiveStatus/src/domain"
	"LiveStatus/src/internal"
	"fmt"
	"github.com/avast/retry-go/v4"
	esb "github.com/dnsge/twitch-eventsub-bindings"
	esf "github.com/dnsge/twitch-eventsub-framework"
	"log"
)

type TwitchHandler interface {
	GetHandler() *esf.SubHandler
}

func NewTwitchHandler(mapTwitchIdsToState map[string]*domain.LiveState, twClient internal.TwitchClient, webhookSecret string) TwitchHandler {
	subHandler := esf.NewSubHandler(true, []byte(webhookSecret))
	h := &twitchHandler{
		handler:             subHandler,
		mapTwitchIdsToState: mapTwitchIdsToState,
		twClient:            twClient,
	}

	subHandler.HandleChannelUpdate = func(headers *esb.ResponseHeaders, event *esb.EventChannelUpdate) {
		log.Printf("HandleChannelUpdate (twitchId=%s)\n", event.BroadcasterUserID)
		h.updateLiveState(event.BroadcasterUserID, headers.SubscriptionType)
	}
	subHandler.HandleStreamOnline = func(headers *esb.ResponseHeaders, event *esb.EventStreamOnline) {
		log.Printf("HandleStreamOnline (twitchId=%s)\n", event.BroadcasterUserID)
		h.updateLiveState(event.BroadcasterUserID, headers.SubscriptionType)
	}
	subHandler.HandleStreamOffline = func(headers *esb.ResponseHeaders, event *esb.EventStreamOffline) {
		log.Printf("HandleStreamOffline (twitchId=%s)\n", event.BroadcasterUserID)
		h.updateLiveState(event.BroadcasterUserID, headers.SubscriptionType)
	}

	return h
}

type twitchHandler struct {
	handler             *esf.SubHandler
	mapTwitchIdsToState map[string]*domain.LiveState
	twClient            internal.TwitchClient
}

func (h *twitchHandler) GetHandler() *esf.SubHandler {
	return h.handler
}

func (h *twitchHandler) updateLiveState(twitchId string, twitchSubscriptionType string) {
	errorAndLog := func(format string, args ...any) error {
		err := fmt.Errorf(format, args...)
		log.Printf("%v\n", err)
		return err
	}

	go func() {
		err := retry.Do(func() error {
			if liveState, stateOk := h.mapTwitchIdsToState[twitchId]; stateOk {
				streams, err := h.twClient.GetStreams([]string{twitchId})
				if err != nil {
					return errorAndLog("ERROR updateLiveState GetStreams (twitchId=%s): %v", twitchId, err)
				}

				var setLiveStateErr error
				if stream, streamOk := streams[twitchId]; streamOk {
					if twitchSubscriptionType == domain.StreamOffline {
						return errorAndLog("  ERROR updateLiveState prevent SetLiveState online (twitchId=%s), received StreamOffline, streams: %+v", twitchId, streams)
					}

					setLiveStateErr = liveState.SetLiveState(&stream)
					log.Printf("  updateLiveState SetLiveState online (twitchId=%s)\n", twitchId)
				} else {
					if twitchSubscriptionType == domain.StreamOnline {
						return errorAndLog("  ERROR updateLiveState prevent SetLiveState offline (twitchId=%s), received StreamOnline, streams: %+v", twitchId, streams)
					}

					setLiveStateErr = liveState.SetLiveState(nil)
					log.Printf("  updateLiveState SetLiveState offline (twitchId=%s)\n", twitchId)
				}

				if setLiveStateErr != nil {
					return errorAndLog("ERROR updateLiveState SetLiveState (twitchId=%s): %v", twitchId, setLiveStateErr)
				}

				log.Printf("  updateLiveState succeed (twitchId=%s)\n", twitchId)
				return nil
			}

			return errorAndLog("ERROR updateLiveState liveState not found (twitchId=%s)", twitchId)
		}, retry.Attempts(domain.RetryMaxAttempts), retry.Delay(domain.RetryDelay))

		if err != nil {
			log.Printf("ERROR updateLiveState retry failed (twitchId=%s)\n", twitchId)
		}
	}()
}
