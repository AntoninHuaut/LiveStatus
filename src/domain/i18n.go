package domain

const (
	I18nDirectory   = "i18n"
	I18nDefaultLang = "en"
)

type I18nMessages struct {
	Discord struct {
		Event       DiscordEventI18n       `yaml:"event"`
		LiveCommand DiscordLiveCommandI18n `yaml:"liveCommand"`
		Embed       DiscordEmbedI18n       `yaml:"embed"`
	} `yaml:"discord"`
}

type DiscordEventI18n struct {
	Title       string `yaml:"title"`
	Description string `yaml:"description"`
}

type DiscordLiveCommandI18n struct {
	Description string `yaml:"description"`
	Option      struct {
		Name        string `yaml:"name"`
		Description string `yaml:"description"`
	} `yaml:"option"`
	StreamerNotFound string `yaml:"streamerNotFound"`
	AppError         string `yaml:"appError"`
}

type DiscordEmbedI18n struct {
	Online struct {
		Title       string         `yaml:"title"`
		Description string         `yaml:"description"`
		Button      DiscordButton  `yaml:"button"`
		Fields      []DiscordField `yaml:"fields"`
	} `yaml:"online"`
	Offline struct {
		Title       string         `yaml:"title"`
		Description string         `yaml:"description"`
		Button      DiscordButton  `yaml:"button"`
		Fields      []DiscordField `yaml:"fields"`
	} `yaml:"offline"`
}

type DiscordField struct {
	Name   string `yaml:"name"`
	Value  string `yaml:"value"`
	Inline bool   `yaml:"inline"`
}

type DiscordButton struct {
	Emoji string `yaml:"emoji"`
	Label string `yaml:"label"`
}
