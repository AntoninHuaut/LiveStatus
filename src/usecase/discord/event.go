package discord

import (
	"LiveStatus/src/domain"
	"LiveStatus/src/usecase"
	"errors"
	"fmt"
	"github.com/bwmarrin/discordgo"
	"slices"
	"time"
)

type Event interface {
	HandleLiveState(state domain.LiveState) error
}

func NewEvent(dcInstance *discordgo.Session, dConfig domain.DiscordConfig, database usecase.Database, i18n usecase.I18n) Event {
	return &event{
		database:   database,
		dcInstance: dcInstance,
		dConfig:    dConfig,
		i18n:       i18n,
	}
}

type event struct {
	database   usecase.Database
	dcInstance *discordgo.Session
	dConfig    domain.DiscordConfig
	i18n       usecase.I18n
}

func (m event) HandleLiveState(state domain.LiveState) error {
	var errs []error
	for guildId, notifiers := range m.dConfig.Servers {
		for _, notifier := range notifiers {
			if notifier.Message.ChannelId == "" || notifier.TwitchId != state.TwitchId || !notifier.Event.Active {
				continue
			}

			dbEventId, err := m.database.GetEventId(state.TwitchId, guildId)
			if err != nil {
				errs = append(errs, errors.New(fmt.Sprintf("failed to get dbEventId in guild %s: %v", guildId, err)))
			}

			// Check if the event is still valid and not deleted
			if dbEventId != "" {
				evt, evtErr := m.dcInstance.GuildScheduledEvent(guildId, dbEventId, false)
				if (evt != nil && slices.Contains(domain.EventStatusToSkip, evt.Status)) || evtErr != nil {
					dbEventId = ""
				}
			}

			if state.IsOnline() {
				// Send or edit the event
				var newEvent *discordgo.GuildScheduledEvent
				if dbEventId != "" {
					newEvent, err = m.dcInstance.GuildScheduledEventEdit(guildId, dbEventId, m.getEventParams(notifier.Lang, state))
				} else {
					eventParams := m.getEventParams(notifier.Lang, state)
					startDate := time.Now().Add(time.Second * 10) // Add 10 seconds to the current time to deal with time sync issues
					eventParams.ScheduledStartTime = &startDate
					newEvent, err = m.dcInstance.GuildScheduledEventCreate(guildId, eventParams)
				}
				if err != nil {
					errs = append(errs, errors.New(fmt.Sprintf("failed to send discordEvent %s in guild %s: %v", dbEventId, guildId, err)))
				}

				// Save the new event id
				if state.IsOnline() && newEvent != nil {
					dbEventId = newEvent.ID
				} else {
					dbEventId = ""
				}

				if err = m.database.SetEventId(state.TwitchId, guildId, dbEventId); err != nil {
					errs = append(errs, errors.New(fmt.Sprintf("failed to save newEventId in guild %s: %v", guildId, err)))
				}
			} else if dbEventId != "" {
				if err = m.dcInstance.GuildScheduledEventDelete(guildId, dbEventId); err != nil {
					errs = append(errs, errors.New(fmt.Sprintf("failed to delete discordEvent %s in guild %s: %v", dbEventId, guildId, err)))
				}
			}
		}
	}

	return errors.Join(errs...)
}

func (m event) getEventParams(lang string, state domain.LiveState) *discordgo.GuildScheduledEventParams {
	i18nMessages := m.i18n.GetMessages(lang).Discord.Event
	streamVariables := state.GetStreamVariables("R")
	return &discordgo.GuildScheduledEventParams{
		Name:             m.i18n.Format(i18nMessages.Title, streamVariables),
		Description:      m.i18n.Format(i18nMessages.Description, streamVariables),
		ScheduledEndTime: getFakedEventEndDate(),
		PrivacyLevel:     discordgo.GuildScheduledEventPrivacyLevelGuildOnly,
		Status:           discordgo.GuildScheduledEventStatusActive,
		EntityType:       discordgo.GuildScheduledEventEntityTypeExternal,
		EntityMetadata: &discordgo.GuildScheduledEventEntityMetadata{
			Location: state.LiveUrl(),
		},
		Image: state.OnlineState.StreamImageBase64,
	}
}

func getFakedEventEndDate() *time.Time {
	t := time.Now().Add(domain.FakeEndDateDelay)
	return &t
}
