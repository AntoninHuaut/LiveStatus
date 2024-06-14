package discord

import (
	"LiveStatus/src/domain"
	"errors"
)

type Cron interface {
	TickEvent() error
}

func NewCron(eventInstance Event, mapTwitchIdsToState map[string]*domain.LiveState) Cron {
	return &cron{
		eventInstance:       eventInstance,
		mapTwitchIdsToState: mapTwitchIdsToState,
	}
}

type cron struct {
	eventInstance       Event
	mapTwitchIdsToState map[string]*domain.LiveState
}

// TickEvent updates events to update the end date
func (c cron) TickEvent() error {
	var errs []error
	for _, state := range c.mapTwitchIdsToState {
		if err := c.eventInstance.HandleLiveState(*state); err != nil {
			errs = append(errs, err)
		}
	}

	return errors.Join(errs...)
}
