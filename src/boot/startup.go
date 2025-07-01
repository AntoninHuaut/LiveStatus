package boot

import (
	"LiveStatus/src/domain"
	"LiveStatus/src/internal"
	"LiveStatus/src/usecase"
	"context"
	"github.com/avast/retry-go/v4"
	"io"
	"log"
	"os"
	"path/filepath"

	"github.com/bwmarrin/discordgo"
	"github.com/go-co-op/gocron/v2"
	"golang.org/x/sync/errgroup"
	"gopkg.in/yaml.v3"
)

func LoadConfig() (*domain.Config, error) {
	file, err := os.Open(domain.ConfigFileName)
	if err != nil {
		return nil, err
	}

	all, err := io.ReadAll(file)
	if err != nil {
		return nil, err
	}

	var config domain.Config
	if err = yaml.Unmarshal(all, &config); err != nil {
		return nil, err
	}
	return &config, nil
}

func Init(config *domain.Config) (usecase.TwitchHandler, *os.File, internal.Database, error) {
	logFile, err := initLog()
	if err != nil {
		return nil, nil, nil, err
	}

	twClient := internal.NewTwitchClient(config.Twitch.ClientId, config.Twitch.ClientSecret)

	database := internal.NewDatabase(domain.DatabaseFileName)
	if err := database.Open(); err != nil {
		return nil, logFile, nil, err
	}

	i18n, err := internal.NewI18n()
	if err != nil {
		return nil, logFile, database, err
	}

	appToken, err := twClient.GenerateTwitchAppToken()
	if err != nil {
		return nil, logFile, database, err
	}

	_, err = initTwitchSubscriber(*config, *appToken)
	if err != nil {
		return nil, logFile, database, err
	}

	err = resolveTwitchNameFromIds(config, twClient)
	if err != nil {
		return nil, logFile, database, err
	}

	mapTwitchIdsToState := make(map[string]*domain.LiveState)
	dcEvent, triggerFunction, err := initDiscord(config, mapTwitchIdsToState, database, i18n)
	if err != nil {
		return nil, logFile, database, err
	}

	if err = initLiveState(mapTwitchIdsToState, config, triggerFunction, twClient); err != nil {
		return nil, logFile, database, err
	}

	cron := usecase.NewCron(dcEvent, mapTwitchIdsToState, twClient)

	err = initCron(cron)
	if err != nil {
		return nil, logFile, database, err
	}

	handler := usecase.NewTwitchHandler(mapTwitchIdsToState, twClient, config.Twitch.WebhookSecret)
	return handler, logFile, database, nil
}

func initLog() (*os.File, error) {
	err := os.MkdirAll(filepath.Join(".", filepath.Dir(domain.LogFileName)), os.ModePerm)
	if err != nil {
		return nil, err
	}

	logFile, err := os.OpenFile(domain.LogFileName, os.O_CREATE|os.O_APPEND|os.O_RDWR, 0666)
	if err != nil {
		return nil, err
	}

	mw := io.MultiWriter(os.Stdout, logFile)
	log.SetOutput(mw)
	return logFile, nil
}

func initCron(dcCron usecase.Cron) error {
	scheduler, err := gocron.NewScheduler()
	if err != nil {
		return err
	}

	_, err = scheduler.NewJob(gocron.CronJob("* * * * *", false), gocron.NewTask(func() { // every minute
		if eventErr := retry.Do(dcCron.RefreshDiscordEvent, retry.Attempts(domain.RetryMaxAttempts), retry.Delay(domain.RetryDelay)); eventErr != nil {
			log.Printf("ERROR RefreshDiscordEvent: %v\n", eventErr)
		}
	}))
	if err != nil {
		return err
	}

	_, err = scheduler.NewJob(gocron.CronJob("*/5 * * * *", false), gocron.NewTask(func() { // every 5 minutes
		if eventErr := retry.Do(dcCron.RefreshTwitchStreams, retry.Attempts(domain.RetryMaxAttempts), retry.Delay(domain.RetryDelay)); eventErr != nil {
			log.Printf("ERROR RefreshTwitchStreams: %v\n", eventErr)
		}
	}))
	if err != nil {
		return err
	}

	scheduler.Start()
	return nil
}

func initTwitchSubscriber(config domain.Config, appToken string) (usecase.TwitchSubscriber, error) {
	subscriber := usecase.NewTwitchSubscriber(config.Twitch.ClientId, appToken, config.Twitch.WebhookUrl, config.Twitch.WebhookSecret)
	err := subscriber.UnsubscribeAll()
	if err != nil {
		return nil, err
	}

	broadcasterUserIds := config.Discord.GetAllTwitchIds()
	totalCost, maxTotalCost, err := subscriber.SubscribeAll(broadcasterUserIds)
	if err != nil {
		return nil, err
	}

	log.Printf("Subscribed to %d broadcasters with a total cost of %d/%d\n", len(broadcasterUserIds), totalCost, maxTotalCost)
	return subscriber, nil
}

func resolveTwitchNameFromIds(config *domain.Config, twitchClient internal.TwitchClient) error {
	mapIdToUser, err := twitchClient.GetTwitchUsers(config.Discord.GetAllTwitchIds())
	if err != nil {
		return err
	}

	config.Twitch.UserResolver = make(map[string]domain.TwitchUserResolver)
	for twitchId, twitchUser := range mapIdToUser {
		config.Twitch.UserResolver[twitchId] = domain.TwitchUserResolver{
			TwitchId:          twitchId,
			TwitchName:        twitchUser.Login,
			TwitchDisplayName: twitchUser.DisplayName,
		}
	}

	return nil
}

func initDiscord(config *domain.Config, mapTwitchIdsToState map[string]*domain.LiveState, database internal.Database, i18n internal.I18n) (usecase.DiscordEvent, func(state domain.LiveState) error, error) {
	dcSession, err := discordgo.New("Bot " + config.Discord.Token)
	if err != nil {
		return nil, nil, err
	}

	dcMessage := usecase.NewDiscordMessage(dcSession, config.Discord, database, i18n)
	dcEvent := usecase.NewDiscordEvent(dcSession, config.Discord, database, i18n)
	dcCommand := usecase.NewDiscordCommand(config, mapTwitchIdsToState, dcSession, dcMessage, i18n)

	dcSession.AddHandler(func(s *discordgo.Session, r *discordgo.Ready) {
		log.Printf("Logged in as: %v#%v", s.State.User.Username, s.State.User.Discriminator)
	})

	err = dcSession.Open()
	if err != nil {
		return nil, nil, err
	}

	err = dcCommand.InitCommands()
	if err != nil {
		return nil, nil, err
	}

	triggerFunction := func(state domain.LiveState) error {
		if err := dcEvent.HandleLiveState(state); err != nil {
			return err
		}
		return dcMessage.HandleLiveState(state)
	}

	return dcEvent, triggerFunction, nil
}

func initLiveState(mapTwitchIdToLiveState map[string]*domain.LiveState, config *domain.Config, triggerFunction func(state domain.LiveState) error, twClient internal.TwitchClient) error {
	var twitchIds []string
	for twitchId := range config.Twitch.UserResolver {
		twitchIds = append(twitchIds, twitchId)
	}

	if len(twitchIds) == 0 {
		return nil
	}

	streamsResponse, err := twClient.GetStreams(twitchIds)
	if err != nil {
		return err
	}

	for twitchId, userResolver := range config.Twitch.UserResolver {
		liveState := &domain.LiveState{
			TriggerFunction: triggerFunction,
			TwitchId:        twitchId,
			TwitchName:      userResolver.TwitchName,
		}

		errs, _ := errgroup.WithContext(context.Background())
		errs.Go(func() error {
			if stream, ok := streamsResponse[twitchId]; ok {
				return liveState.SetLiveState(&stream)
			} else {
				return liveState.SetLiveState(nil)
			}
		})
		if err := errs.Wait(); err != nil {
			return err
		}

		mapTwitchIdToLiveState[twitchId] = liveState
	}

	return nil
}
