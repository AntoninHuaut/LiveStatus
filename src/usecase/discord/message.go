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

type Message interface {
	HandleLiveState(state domain.LiveState) error
	getComponents(lang string, state domain.LiveState) []discordgo.MessageComponent
	getEmbed(lang string, state domain.LiveState) *discordgo.MessageEmbed
}

func NewMessage(dcInstance *discordgo.Session, dConfig domain.DiscordConfig, database usecase.Database, i18n usecase.I18n) Message {
	return &message{
		database:   database,
		dConfig:    dConfig,
		dcInstance: dcInstance,
		i18n:       i18n,
	}
}

type message struct {
	database   usecase.Database
	dConfig    domain.DiscordConfig
	dcInstance *discordgo.Session
	i18n       usecase.I18n
}

func (m message) HandleLiveState(state domain.LiveState) error {
	var errs []error
	for guildId, notifiers := range m.dConfig.Servers {
		for _, notifier := range notifiers {
			if notifier.Message.ChannelId == "" || notifier.TwitchId != state.TwitchId || !notifier.Message.Active {
				continue
			}

			dbMessageId, err := m.database.GetMessageId(state.TwitchId, notifier.Message.ChannelId)
			if err != nil {
				errs = append(errs, errors.New(fmt.Sprintf("failed to get dbMessageId to channel %s in guild %s: %v", notifier.Message.ChannelId, guildId, err)))
			}

			// Check if the message is still valid and not deleted
			if dbMessageId != "" {
				if _, msgErr := m.dcInstance.ChannelMessage(notifier.Message.ChannelId, dbMessageId); msgErr != nil {
					dbMessageId = ""
				}
			}

			// Skip if the stream is offline and there is no message to edit
			if dbMessageId == "" && !state.IsOnline() {
				return nil
			}

			embed := m.getEmbed(notifier.Lang, state)
			var newMessage *discordgo.Message
			var components []discordgo.MessageComponent
			if notifier.Message.Buttons {
				components = m.getComponents(notifier.Lang, state)
			}

			// Send or edit the message
			if dbMessageId != "" {
				newMessage, err = m.dcInstance.ChannelMessageEditComplex(&discordgo.MessageEdit{
					Channel:    notifier.Message.ChannelId,
					ID:         dbMessageId,
					Components: &components,
					Content:    getContent(state, notifier),
					Embed:      embed,
				})

			} else {
				newMessage, err = m.dcInstance.ChannelMessageSendComplex(notifier.Message.ChannelId, &discordgo.MessageSend{
					Components: components,
					Content:    *getContent(state, notifier),
					Embed:      embed,
				})
			}
			if err != nil {
				errs = append(errs, errors.New(fmt.Sprintf("failed to send discordMessage %s in channel %s in guild %s: %v", dbMessageId, notifier.Message.ChannelId, guildId, err)))
			}

			// Save the new message id
			if state.IsOnline() && newMessage != nil {
				dbMessageId = newMessage.ID
			} else {
				dbMessageId = ""
			}

			if err = m.database.SetMessageId(state.TwitchId, notifier.Message.ChannelId, dbMessageId); err != nil {
				errs = append(errs, errors.New(fmt.Sprintf("failed to save newMessageId to channel %s in guild %s: %v", notifier.Message.ChannelId, guildId, err)))
			}
		}
	}

	return errors.Join(errs...)
}

func getContent(state domain.LiveState, notifier domain.DiscordNotifier) *string {
	str := ""
	if state.IsOnline() {
		if slices.Contains(domain.CustomMentions, notifier.Message.RoleMentionId) {
			str = fmt.Sprintf("@%s", notifier.Message.RoleMentionId)
		} else if notifier.Message.RoleMentionId != "" {
			str = fmt.Sprintf("<@&%s>", notifier.Message.RoleMentionId)
		}
	}
	return &str
}

func (m message) getComponents(lang string, state domain.LiveState) []discordgo.MessageComponent {
	i18nMessages := m.i18n.GetMessages(lang).Discord.Embed
	streamVariables := state.GetStreamVariables("R")
	label := m.i18n.Format(i18nMessages.Offline.Button.Label, streamVariables)
	emoji := m.i18n.Format(i18nMessages.Offline.Button.Emoji, streamVariables)
	if state.IsOnline() {
		label = m.i18n.Format(i18nMessages.Online.Button.Label, streamVariables)
		emoji = m.i18n.Format(i18nMessages.Online.Button.Emoji, streamVariables)
	}

	return []discordgo.MessageComponent{
		discordgo.ActionsRow{
			Components: []discordgo.MessageComponent{
				discordgo.Button{
					Emoji: &discordgo.ComponentEmoji{
						Name: emoji,
					},
					Label: label,
					Style: discordgo.LinkButton,
					URL:   state.LiveUrl(),
				},
			},
		}}
}

func (m message) getEmbed(lang string, state domain.LiveState) *discordgo.MessageEmbed {
	i18nMessages := m.i18n.GetMessages(lang).Discord.Embed
	streamVariables := state.GetStreamVariables("R")

	color := domain.EmbedColorOffline
	description := m.i18n.Format(i18nMessages.Offline.Description, streamVariables)
	title := m.i18n.Format(i18nMessages.Offline.Title, streamVariables)
	var image *discordgo.MessageEmbedImage
	var fields []*discordgo.MessageEmbedField

	addFields := func(configFields []domain.DiscordField) {
		for _, field := range configFields {
			formattedValue := m.i18n.Format(field.Value, streamVariables)
			if formattedValue != "" {
				fields = append(fields, &discordgo.MessageEmbedField{
					Name:   m.i18n.Format(field.Name, streamVariables),
					Value:  formattedValue,
					Inline: field.Inline,
				})
			}
		}
	}

	if state.IsOnline() {
		color = domain.EmbedColorOnline
		description = m.i18n.Format(i18nMessages.Online.Description, streamVariables)
		title = m.i18n.Format(i18nMessages.Online.Title, streamVariables)
		addFields(i18nMessages.Online.Fields)
		image = &discordgo.MessageEmbedImage{
			URL:    fmt.Sprintf("%s?noCache%d", state.OnlineState.StreamImageUrl, time.Now().Unix()),
			Height: domain.StreamImageHeight,
			Width:  domain.StreamImageWidth,
		}
	} else {
		addFields(i18nMessages.Offline.Fields)
	}

	thumbnail := &discordgo.MessageEmbedThumbnail{
		URL:    state.OnlineState.GameImageUrl,
		Height: domain.GameThumbnailHeight,
		Width:  domain.GameThumbnailWidth,
	}
	if thumbnail.URL == "" {
		thumbnail = nil
	}

	return &discordgo.MessageEmbed{
		Title:       title,
		Description: description,
		URL:         state.LiveUrl(),
		Type:        discordgo.EmbedTypeRich,
		Color:       color,
		Image:       image,
		Thumbnail:   thumbnail,
		Fields:      fields,
		Footer: &discordgo.MessageEmbedFooter{
			Text:    fmt.Sprintf("/%s", domain.LiveCommandName),
			IconURL: domain.EmbedFooterIconUrl,
		},
	}
}
