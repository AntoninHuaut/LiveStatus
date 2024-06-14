package domain

import (
	"github.com/bwmarrin/discordgo"
	"time"
)

const (
	LiveCommandName = "live"

	EmbedColorOffline  = 9807270
	EmbedColorOnline   = 10181046
	EmbedFooterIconUrl = "https://i.imgur.com/Qo9ZWge.png"

	everyoneMention = "everyone"
	hereMention     = "here"

	FakeEndDateDelay = 2 * time.Minute
)

var (
	CustomMentions    = []string{everyoneMention, hereMention}
	EventStatusToSkip = []discordgo.GuildScheduledEventStatus{discordgo.GuildScheduledEventStatusCanceled, discordgo.GuildScheduledEventStatusCompleted}
)
