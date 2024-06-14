package twitch

import (
	"LiveStatus/src/domain"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

type Client interface {
	GenerateTwitchAppToken() (*string, error)
	GetTwitchUsers(userIds []string) (map[string]domain.TwitchUserResponse, error)
	GetStreams(userIds []string) (map[string]domain.TwitchStreamResponse, error)
}

func NewClient(clientId string, clientSecret string) Client {
	return &client{clientId: clientId, clientSecret: clientSecret}
}

type client struct {
	clientId     string
	clientSecret string
	appToken     *string
}

func (t *client) GenerateTwitchAppToken() (*string, error) {
	form := url.Values{}
	form.Add("client_id", t.clientId)
	form.Add("client_secret", t.clientSecret)
	form.Add("grant_type", "client_credentials")

	appToken, err := createTwitchRequest("POST", "", nil, domain.GetTwitchAppTokenUrl, strings.NewReader(form.Encode()),
		func(res *http.Response) (*string, error) {
			var data map[string]any
			err := json.NewDecoder(res.Body).Decode(&data)
			if err != nil {
				return nil, err
			}

			if tokenRaw, ok := data["access_token"]; ok {
				if token, parseOk := tokenRaw.(string); parseOk {
					return &token, nil
				}
			}

			return nil, errors.New("missing or invalid access token in twitch response")
		})
	if err != nil {
		return nil, err
	}

	t.appToken = appToken
	return appToken, nil
}

func (t *client) GetTwitchUsers(userIds []string) (map[string]domain.TwitchUserResponse, error) {
	if len(userIds) == 0 {
		return make(map[string]domain.TwitchUserResponse), nil
	}

	mapIdToUser, err := createTwitchRequest("GET", t.clientId, t.appToken, fmt.Sprintf("%s?%s", domain.GetTwitchUsersUrl, url.Values{"id": userIds}.Encode()), nil,
		func(res *http.Response) (*map[string]domain.TwitchUserResponse, error) {
			var data domain.TwitchUsersResponse
			err := json.NewDecoder(res.Body).Decode(&data)
			if err != nil {
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

func (t *client) GetStreams(userIds []string) (map[string]domain.TwitchStreamResponse, error) {
	if len(userIds) == 0 {
		return make(map[string]domain.TwitchStreamResponse), nil
	}

	mapIdToStream, err := createTwitchRequest("GET", t.clientId, t.appToken, fmt.Sprintf("%s?%s", domain.GetTwitchStreamsUrl, url.Values{"user_id": userIds}.Encode()), nil,
		func(res *http.Response) (*map[string]domain.TwitchStreamResponse, error) {
			var data domain.TwitchStreamsResponse
			err := json.NewDecoder(res.Body).Decode(&data)
			if err != nil {
				return nil, err
			}

			mapIdToStream := make(map[string]domain.TwitchStreamResponse)
			for _, user := range data.Data {
				mapIdToStream[user.UserID] = user
			}

			return &mapIdToStream, nil
		})
	if err != nil {
		return nil, err
	}
	return *mapIdToStream, nil
}

func createTwitchRequest[T any](method string, clientId string, token *string, url string, requestBody io.Reader, extractBody func(*http.Response) (*T, error)) (*T, error) {
	req, err := http.NewRequest(method, url, requestBody)
	if err != nil {
		return nil, err
	}

	if clientId != "" && token != nil {
		req.Header.Add("Client-Id", clientId)
		req.Header.Add("Authorization", "Bearer "+*token)
	}

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	data, err := extractBody(res)
	if err != nil {
		return nil, err
	}

	return data, nil
}
