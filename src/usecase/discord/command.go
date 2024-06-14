package discord

import (
	"LiveStatus/src/domain"
	"LiveStatus/src/usecase"
	"github.com/bwmarrin/discordgo"
)

type Command interface {
	InitCommands() error
	GetSession() *discordgo.Session
}

func NewCommand(config *domain.Config, mapTwitchIdsToState map[string]*domain.LiveState, dcSession *discordgo.Session, dcMessage Message, i18n usecase.I18n) Command {
	return &command{
		config:              config,
		dcSession:           dcSession,
		dcMessage:           dcMessage,
		i18n:                i18n,
		mapTwitchIdsToState: mapTwitchIdsToState,
	}
}

type command struct {
	config              *domain.Config
	dcSession           *discordgo.Session
	dcMessage           Message
	i18n                usecase.I18n
	mapTwitchIdsToState map[string]*domain.LiveState
}

func (d *command) InitCommands() error {
	d.dcSession.AddHandler(d.liveCommandHandler)

	err := d.unregisterCommands()
	if err != nil {
		return err
	}

	err = d.registerCommands()
	if err != nil {
		return err
	}

	return nil
}

func (d *command) GetSession() *discordgo.Session {
	return d.dcSession
}

func (d *command) unregisterCommands() error {
	twitchIdsGroupByServer := d.config.GetAllTwitchLinkGroupByGuild()

	for guildId, _ := range twitchIdsGroupByServer {
		applications, err := d.dcSession.ApplicationCommands(d.dcSession.State.User.ID, guildId)
		if err != nil {
			return err
		}

		for _, application := range applications {
			if application.Name != domain.LiveCommandName {
				continue
			}

			err := d.dcSession.ApplicationCommandDelete(d.dcSession.State.User.ID, guildId, application.ID)
			if err != nil {
				return err
			}
		}
	}

	return nil
}

func (d *command) registerCommands() error {
	guildToTwitchLink := d.config.GetAllTwitchLinkGroupByGuild()

	for guildId, twitchLinks := range guildToTwitchLink {
		commandLang := domain.I18nDefaultLang
		if notifiers, ok := d.config.Discord.Servers[guildId]; ok {
			if len(notifiers) > 0 {
				commandLang = notifiers[0].Lang
			}
		}
		i18nMessages := d.i18n.GetMessages(commandLang)

		liveCommand := discordgo.ApplicationCommand{
			Name:        domain.LiveCommandName,
			Type:        discordgo.ChatApplicationCommand,
			Description: i18nMessages.Discord.LiveCommand.Description,
		}

		liveCommand.Options = []*discordgo.ApplicationCommandOption{{
			Name:        i18nMessages.Discord.LiveCommand.Option.Name,
			Description: i18nMessages.Discord.LiveCommand.Option.Description,
			Type:        discordgo.ApplicationCommandOptionString,
			Required:    true,
			Choices:     []*discordgo.ApplicationCommandOptionChoice{},
		}}
		for _, linkIdName := range twitchLinks {
			liveCommand.Options[0].Choices = append(liveCommand.Options[0].Choices, &discordgo.ApplicationCommandOptionChoice{
				Name:  linkIdName.TwitchDisplayName,
				Value: linkIdName.TwitchId,
			})
		}

		_, err := d.dcSession.ApplicationCommandCreate(d.dcSession.State.User.ID, guildId, &liveCommand)
		if err != nil {
			return err
		}
	}

	return nil
}

func (d *command) liveCommandHandler(s *discordgo.Session, i *discordgo.InteractionCreate) {
	options := i.ApplicationCommandData().Options
	if len(options) == 0 {
		return // Must never happen, option is required
	}

	twitchId := options[0].StringValue()
	notifier := d.config.Discord.FindNotifierByGuildIdAndTwitchId(i.GuildID, twitchId)
	if notifier == nil {
		return // Must never happen
	}

	liveState, ok := d.mapTwitchIdsToState[twitchId]
	if !ok {
		return // Must never happen
	}

	_ = s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Flags:      discordgo.MessageFlagsEphemeral,
			Components: d.dcMessage.getComponents(notifier.Lang, *liveState),
			Embeds:     []*discordgo.MessageEmbed{d.dcMessage.getEmbed(notifier.Lang, *liveState)},
		},
	})
}
