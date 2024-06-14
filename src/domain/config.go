package domain

import (
	"slices"
)

const (
	DatabaseEventBucket   = "event"
	DatabaseMessageBucket = "message"

	ConfigFileName   = "config.yaml"
	DatabaseFileName = "storage/database.db"
	LogFileName      = "storage/log.txt"
)

type Config struct {
	Twitch  TwitchConfig  `yaml:"twitch"`
	Discord DiscordConfig `yaml:"discord"`
}

type TwitchConfig struct {
	ClientId      string `yaml:"clientId"`
	ClientSecret  string `yaml:"clientSecret"`
	WebhookUrl    string `yaml:"webhookUrl"`
	WebhookSecret string `yaml:"webhookSecret"`
	WebhookPort   int    `yaml:"webhookPort"`

	// Not in yaml, fill by code
	UserResolver map[string]TwitchUserResolver
}

type TwitchUserResolver struct {
	TwitchId          string
	TwitchName        string
	TwitchDisplayName string
}

type DiscordConfig struct {
	Token   string                       `yaml:"token"`
	Servers map[string][]DiscordNotifier `yaml:"servers"` // Key is guildId
}

type DiscordNotifier struct {
	TwitchId string `yaml:"twitchId"`
	Lang     string `yaml:"lang"`
	Event    struct {
		Active bool `yaml:"active"`
	} `yaml:"event"`
	Message struct {
		Active        bool   `yaml:"active"`
		Buttons       bool   `yaml:"buttons"`
		ChannelId     string `yaml:"channelId"`
		RoleMentionId string `yaml:"roleMentionId"`
	} `yaml:"message"`
}

func (dc Config) GetAllTwitchLinkGroupByGuild() map[string][]TwitchUserResolver {
	guildToTwitchLink := make(map[string][]TwitchUserResolver)
	isContainsTwitchId := func(twitchId string) bool {
		for _, twitchIds := range guildToTwitchLink {
			for _, linkIdName := range twitchIds {
				if linkIdName.TwitchId == twitchId {
					return true
				}
			}
		}
		return false
	}

	for guildId, notifiers := range dc.Discord.Servers {
		guildToTwitchLink[guildId] = make([]TwitchUserResolver, 0)

		for _, notifier := range notifiers {
			userResolver, ok := dc.Twitch.UserResolver[notifier.TwitchId]
			if ok && !isContainsTwitchId(notifier.TwitchId) {
				guildToTwitchLink[guildId] = append(guildToTwitchLink[guildId], userResolver)
			}
		}
	}
	return guildToTwitchLink
}

func (dc DiscordConfig) GetAllTwitchIds() []string {
	var twitchIds []string
	for _, notifiers := range dc.Servers {
		for _, notifier := range notifiers {
			if !slices.Contains(twitchIds, notifier.TwitchId) {
				twitchIds = append(twitchIds, notifier.TwitchId)
			}
		}
	}
	return twitchIds
}

func (dc DiscordConfig) FindNotifierByGuildIdAndTwitchId(exceptedGuildId string, exceptedTwitchId string) *DiscordNotifier {
	for guildId, guildNotifiers := range dc.Servers {
		if guildId != exceptedGuildId {
			continue
		}
		for _, notifier := range guildNotifiers {
			if notifier.TwitchId == exceptedTwitchId {
				return &notifier
			}
		}
	}
	return nil
}
