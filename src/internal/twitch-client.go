package internal

import (
	"LiveStatus/src/domain"
	"encoding/json"
	"fmt"
	"github.com/avast/retry-go/v4"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync/atomic"
	"time"
)

type TwitchClient interface {
	Init() error
	GetSubscriber() domain.TwitchSubscriber
	GetTwitchUsers(userIds []string) (map[string]domain.TwitchUserResponse, error)
	GetStreams(userIds []string) (map[string]domain.TwitchStreamResponse, error)
}

func NewTwitchClient(clientId string, clientSecret string, webhookUrl string, webhookSecret string, factory domain.SubscriberFactory) TwitchClient {
	return &twitchClient{
		clientId:      clientId,
		clientSecret:  clientSecret,
		webhookUrl:    webhookUrl,
		webhookSecret: webhookSecret,
		factory:       factory,
	}
}

type twitchClient struct {
	clientId      string
	clientSecret  string
	webhookUrl    string
	webhookSecret string
	factory       domain.SubscriberFactory
	appToken      atomic.Pointer[string]
	expiresAt     atomic.Int64 // unix seconds
	subscriber    domain.TwitchSubscriber
}

func (t *twitchClient) Init() error {
	if err := t.generateTwitchAppToken(); err != nil {
		return err
	}
	t.subscriber = t.factory(t.clientId, *t.appToken.Load(), t.webhookUrl, t.webhookSecret)
	return nil
}

func (t *twitchClient) GetSubscriber() domain.TwitchSubscriber {
	return t.subscriber
}

func (t *twitchClient) generateTwitchAppToken() error {
	clientId := t.clientId
	clientSecret := t.clientSecret

	result, err := createTwitchRequest("POST", domain.GetTwitchAppTokenUrl, map[string]string{},
		func() io.Reader {
			form := url.Values{}
			form.Add("client_id", clientId)
			form.Add("client_secret", clientSecret)
			form.Add("grant_type", "client_credentials")
			return strings.NewReader(form.Encode())
		},
		func(res *http.Response) (*tokenResult, error) {
			var data map[string]any
			if err := json.NewDecoder(res.Body).Decode(&data); err != nil {
				return nil, err
			}

			tokenRaw, ok := data["access_token"]
			if !ok {
				return nil, fmt.Errorf("missing access_token in twitch response")
			}
			token, ok := tokenRaw.(string)
			if !ok {
				return nil, fmt.Errorf("invalid access_token type in twitch response")
			}

			expiresIn := 0
			if expiresRaw, ok := data["expires_in"]; ok {
				if exp, ok := expiresRaw.(float64); ok {
					expiresIn = int(exp)
				}
			}

			return &tokenResult{
				token:     token,
				expiresAt: time.Now().Add(time.Duration(expiresIn) * time.Second).Unix(),
			}, nil
		})
	if err != nil {
		return err
	}

	t.appToken.Store(&result.token)
	t.expiresAt.Store(result.expiresAt)
	return nil
}

func (t *twitchClient) ensureValidToken() error {
	expiresAt := time.Unix(t.expiresAt.Load(), 0)
	if t.appToken.Load() == nil || time.Now().Add(30*time.Second).After(expiresAt) {
		return t.generateTwitchAppToken()
	}
	return nil
}

func (t *twitchClient) GetTwitchUsers(userIds []string) (map[string]domain.TwitchUserResponse, error) {
	if len(userIds) == 0 {
		return make(map[string]domain.TwitchUserResponse), nil
	}

	if err := t.ensureValidToken(); err != nil {
		return nil, err
	}

	appToken := *t.appToken.Load()
	mapIdToUser, err := createTwitchRequest("GET", fmt.Sprintf("%s?%s", domain.GetTwitchUsersUrl, url.Values{"id": userIds}.Encode()), map[string]string{
		domain.TwitchClientIdHeader:      t.clientId,
		domain.TwitchAuthorizationHeader: "Bearer " + appToken,
	}, nil,
		func(res *http.Response) (*map[string]domain.TwitchUserResponse, error) {
			var data domain.TwitchUsersResponse
			if err := json.NewDecoder(res.Body).Decode(&data); err != nil {
				return nil, err
			}

			mapIdToUser := make(map[string]domain.TwitchUserResponse)
			for _, user := range data.Data {
				mapIdToUser[user.ID] = user
			}
			return &mapIdToUser, nil
		})
	if err != nil {
		return nil, err
	}
	return *mapIdToUser, nil
}

func (t *twitchClient) GetStreams(userIds []string) (map[string]domain.TwitchStreamResponse, error) {
	if len(userIds) == 0 {
		return make(map[string]domain.TwitchStreamResponse), nil
	}

	if err := t.ensureValidToken(); err != nil {
		return nil, err
	}

	appToken := *t.appToken.Load()
	mapIdToStream, err := createTwitchRequest("GET", fmt.Sprintf("%s?%s", domain.GetTwitchStreamsUrl, url.Values{"user_id": userIds}.Encode()), map[string]string{
		domain.TwitchClientIdHeader:      t.clientId,
		domain.TwitchAuthorizationHeader: "Bearer " + appToken,
	}, nil,
		func(res *http.Response) (*map[string]domain.TwitchStreamResponse, error) {
			var data domain.TwitchStreamsResponse
			if err := json.NewDecoder(res.Body).Decode(&data); err != nil {
				return nil, err
			}

			mapIdToStream := make(map[string]domain.TwitchStreamResponse)
			for _, stream := range data.Data {
				mapIdToStream[stream.UserID] = stream
			}
			return &mapIdToStream, nil
		})
	if err != nil {
		return nil, err
	}
	return *mapIdToStream, nil
}

type tokenResult struct {
	token     string
	expiresAt int64
}

func createTwitchRequest[T any](method string, rawURL string, headers map[string]string, bodyFactory func() io.Reader, extractBody func(*http.Response) (*T, error)) (*T, error) {
	return retry.DoWithData(func() (*T, error) {
		var body io.Reader
		if bodyFactory != nil {
			body = bodyFactory()
		}

		req, err := http.NewRequest(method, rawURL, body)
		if err != nil {
			return nil, err
		}

		for key, value := range headers {
			req.Header.Add(key, value)
		}

		res, err := http.DefaultClient.Do(req)
		if err != nil {
			return nil, err
		}
		defer func() {
			_ = res.Body.Close()
		}()

		if res.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("twitch request failed with status code %d", res.StatusCode)
		}

		data, err := extractBody(res)
		if err != nil {
			return nil, err
		}
		return data, nil
	}, retry.Attempts(domain.RetryMaxAttempts), retry.Delay(domain.RetryDelay))
}
