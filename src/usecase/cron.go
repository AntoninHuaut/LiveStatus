package usecase

import (
	"LiveStatus/src/domain"
	"LiveStatus/src/internal"
	"errors"
	"log"
)

type Cron interface {
	RefreshDiscordEvent() error
	RefreshTwitchStreams() error
}

func NewCron(eventInstance DiscordEvent, mapTwitchIdsToState map[string]*domain.LiveState, twClient internal.TwitchClient) Cron {
	return &cron{
		eventInstance:       eventInstance,
		mapTwitchIdsToState: mapTwitchIdsToState,
		twClient:            twClient,
	}
}

type cron struct {
	eventInstance       DiscordEvent
	mapTwitchIdsToState map[string]*domain.LiveState
	twClient            internal.TwitchClient
}

// RefreshDiscordEvent updates events to update the end date
func (c cron) RefreshDiscordEvent() error {
	var errs []error
	for _, state := range c.mapTwitchIdsToState {
		if err := c.eventInstance.HandleLiveState(*state); err != nil {
			errs = append(errs, err)
		}
	}

	return errors.Join(errs...)
}

// RefreshTwitchStreams used to fix sync issues with twitch EventSub
func (c cron) RefreshTwitchStreams() error {
	var twitchIds []string
	for twitchId := range c.mapTwitchIdsToState {
		twitchIds = append(twitchIds, twitchId)
	}

	if len(twitchIds) == 0 {
		return nil
	}

	streams, err := c.twClient.GetStreams(twitchIds)
	if err != nil {
		return err
	}

	var errs []error
	for twitchId, state := range c.mapTwitchIdsToState {
		var setLiveStateErr error
		if stream, streamOk := streams[twitchId]; streamOk {
			setLiveStateErr = state.SetLiveState(&stream)
			log.Printf("RefreshTwitchStreams SetLiveState online (twitchId=%s)\n", twitchId)
		} else {
			setLiveStateErr = state.SetLiveState(nil)
			log.Printf("RefreshTwitchStreams SetLiveState offline (twitchId=%s)\n", twitchId)
		}

		if setLiveStateErr != nil {
			errs = append(errs, setLiveStateErr)
			log.Printf("ERROR RefreshTwitchStreams SetLiveState (twitchId=%s): %v", twitchId, setLiveStateErr)
		}
	}

	return errors.Join(errs...)
}
