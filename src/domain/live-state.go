package domain

import (
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const (
	StreamImageWidth  = 1920
	StreamImageHeight = 1080

	baseGameUrl         = "https://static-cdn.jtvnw.net/ttv-boxart"
	GameThumbnailWidth  = 288
	GameThumbnailHeight = 384

	ChannelUpdate = "channel.update"
	StreamOnline  = "stream.online"
	StreamOffline = "stream.offline"
)

var (
	SubscriptionList = []string{ChannelUpdate, StreamOnline, StreamOffline}
)

type LiveState struct {
	TriggerFunction func(LiveState) error
	TwitchId        string
	TwitchName      string
	OnlineState     OnlineState
}

type OnlineState struct {
	IsLive            bool
	GameName          string
	Title             string
	ViewerCount       int
	StartedAt         time.Time
	StreamImageUrl    string
	StreamImageBase64 string
	GameImageUrl      string
}

func (l *LiveState) IsOnline() bool {
	return l.OnlineState.IsLive
}

func (l *LiveState) LiveUrl() string {
	return fmt.Sprintf("https://twitch.tv/%s", url.PathEscape(l.TwitchName))
}

func (l *LiveState) GetStreamVariables(timestampStyle string) map[string]string {
	return map[string]string{
		"%streamer%":  l.TwitchName,
		"%title%":     l.OnlineState.Title,
		"%game%":      l.OnlineState.GameName,
		"%startedAt%": fmt.Sprintf("<t:%s:%s>", strconv.FormatInt(l.OnlineState.StartedAt.Unix(), 10), timestampStyle),
	}
}

func (l *LiveState) SetLiveState(twResponse *TwitchStreamResponse) error {
	l.OnlineState.IsLive = twResponse != nil && twResponse.Type == twitchTypeLive

	if l.IsOnline() && twResponse != nil {
		err := l.updateOnlineState(twResponse.GameName, twResponse.Title, twResponse.ViewerCount, twResponse.StartedAt, twResponse.ThumbnailUrl, twResponse.GameId)
		if err != nil {
			return err
		}
	}

	if l.TriggerFunction != nil {
		return l.TriggerFunction(*l)
	}

	return nil
}

func (l *LiveState) updateOnlineState(gameName string, title string, viewerCount int, startedAt time.Time, streamImageUrl string, gameId string) error {
	streamImageUrl = strings.Replace(strings.Replace(streamImageUrl,
		"{width}", fmt.Sprintf("%d", StreamImageWidth), 1),
		"{height}", fmt.Sprintf("%d", StreamImageHeight), 1,
	)
	streamImgBase64, err := getBlobImg(streamImageUrl)
	if err != nil {
		return err
	}

	gameImageUrl, err := getGameImageUrl(gameId)
	if err != nil {
		return err
	}

	l.OnlineState.GameName = gameName
	l.OnlineState.Title = title
	l.OnlineState.ViewerCount = viewerCount
	l.OnlineState.StartedAt = startedAt
	l.OnlineState.StreamImageUrl = streamImageUrl
	l.OnlineState.StreamImageBase64 = *streamImgBase64
	l.OnlineState.GameImageUrl = *gameImageUrl

	return nil
}

func getGameImageUrl(gameId string) (*string, error) {
	igdbImgUrl := fmt.Sprintf("%s/%s_IGDB-%dx%d.jpg", baseGameUrl, url.PathEscape(gameId), GameThumbnailWidth, GameThumbnailHeight)
	twitchImgUrl := fmt.Sprintf("%s/%s-%dx%d.jpg", baseGameUrl, url.PathEscape(gameId), GameThumbnailWidth, GameThumbnailHeight)

	req, err := http.NewRequest("GET", igdbImgUrl, nil)
	if err != nil {
		return nil, err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	if resp.StatusCode == http.StatusOK {
		return &igdbImgUrl, nil
	} else {
		return &twitchImgUrl, nil
	}
}

func getBlobImg(url string) (*string, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	base64String := base64.StdEncoding.EncodeToString(body)
	dataURL := fmt.Sprintf("data:image/jpeg;base64,%s", base64String)
	return &dataURL, nil
}
