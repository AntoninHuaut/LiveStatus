package domain

import "time"

const (
	twitchTypeLive = "live"

	GetTwitchAppTokenUrl      = "https://id.twitch.tv/oauth2/token"
	GetTwitchStreamsUrl       = "https://api.twitch.tv/helix/streams"
	GetTwitchUsersUrl         = "https://api.twitch.tv/helix/users"
	TwitchClientIdHeader      = "Client-Id"
	TwitchAuthorizationHeader = "Authorization"

	RetryMaxAttempts = 5
)

type TwitchUsersResponse struct {
	Data []TwitchUserResponse `json:"data"`
}

type TwitchUserResponse struct {
	ID              string `json:"id"`
	Login           string `json:"login"`
	DisplayName     string `json:"display_name"`
	Type            string `json:"type"`
	BroadcasterType string `json:"broadcaster_type"`
	Description     string `json:"description"`
	ProfileImageUrl string `json:"profile_image_url"`
	OfflineImageUrl string `json:"offline_image_url"`
	ViewCount       int    `json:"view_count"`
	Email           string `json:"email"`
	CreatedAt       string `json:"created_at"`
}

type TwitchStreamsResponse struct {
	Data []TwitchStreamResponse `json:"data"`
}

type TwitchStreamResponse struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	UserLogin    string    `json:"user_login"`
	UserName     string    `json:"user_name"`
	GameId       string    `json:"game_id"`
	GameName     string    `json:"game_name"`
	Type         string    `json:"type"`
	Title        string    `json:"title"`
	Tags         []string  `json:"tags"`
	ViewerCount  int       `json:"viewer_count"`
	StartedAt    time.Time `json:"started_at"`
	Language     string    `json:"language"`
	ThumbnailUrl string    `json:"thumbnail_url"`
	TagIds       []string  `json:"tag_ids"`
	IsMature     bool      `json:"is_mature"`
}
