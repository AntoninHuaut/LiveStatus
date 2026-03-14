package usecase

import (
	"LiveStatus/src/domain"
	"context"
	"fmt"
	esb "github.com/dnsge/twitch-eventsub-bindings"
	esf "github.com/dnsge/twitch-eventsub-framework"
)

func NewTwitchSubscriber(clientId string, appToken string, webhookUrl string, webhookSecret string) domain.TwitchSubscriber {
	return &twitchSubscriber{
		client:        esf.NewSubClient(esf.NewStaticCredentials(clientId, appToken)),
		webhookUrl:    webhookUrl,
		webhookSecret: webhookSecret,
	}
}

type twitchSubscriber struct {
	client        *esf.SubClient
	webhookUrl    string
	webhookSecret string
}

func (s *twitchSubscriber) getSubscriptions() (*esb.RequestStatus, error) {
	return s.client.GetSubscriptions(context.Background(), esf.StatusAny)
}

func (s *twitchSubscriber) UnsubscribeAll() error {
	subscriptions, err := s.getSubscriptions()
	if err != nil {
		return err
	}

	for _, sub := range subscriptions.Data {
		if err = s.client.Unsubscribe(context.Background(), sub.ID); err != nil {
			return err
		}
	}

	return nil
}

// SubscribeAll subscribes to the "stream.online" and "stream.offline" event types for the provided broadcasterUserIds.
// Returns:
//   - int: the total cost used
//   - int: the maximum total cost allowed
//   - error: any error that occurred
func (s *twitchSubscriber) SubscribeAll(broadcasterUserIds []string) (int, int, error) {
	if len(broadcasterUserIds) == 0 {
		return 0, 0, nil
	}

	var latestResponse *esb.RequestStatus

	for _, broadcasterUserId := range broadcasterUserIds {
		for _, subType := range domain.SubscriptionList {
			resp, err := s.client.Subscribe(context.Background(), &esf.SubRequest{
				Type: subType,
				Condition: esb.ConditionChannelUpdate{
					BroadcasterUserID: broadcasterUserId,
				},
				Callback: s.webhookUrl,
				Secret:   s.webhookSecret,
			})
			if err != nil {
				return 0, 0, fmt.Errorf("error subscribing to %s/%s: %w", broadcasterUserId, subType, err)
			}
			latestResponse = resp
		}
	}

	return latestResponse.TotalCost, latestResponse.MaxTotalCost, nil
}
