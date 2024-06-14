package usecase

import (
	"LiveStatus/src/domain"
	"fmt"
	"gopkg.in/yaml.v3"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
)

type I18n interface {
	GetMessages(lang string) domain.I18nMessages
	Format(str string, streamVariables map[string]string) string
}

func NewI18n() (I18n, error) {
	lang := &i18n{
		messages: make(map[string]domain.I18nMessages),
	}
	if err := lang.initI18n(); err != nil {
		return nil, err
	}

	return lang, nil
}

type i18n struct {
	messages map[string]domain.I18nMessages // lang as key
}

func (i *i18n) initI18n() error {
	files, err := os.ReadDir(domain.I18nDirectory)
	if err != nil {
		log.Fatal(err)
	}

	for _, file := range files {
		if file.IsDir() {
			continue
		}

		if err := i.loadMessages(file.Name()); err != nil {
			return err
		}
	}

	return nil
}

func (i *i18n) loadMessages(fileName string) error {
	file, err := os.Open(fmt.Sprintf("%s/%s", domain.I18nDirectory, fileName))
	if err != nil {
		return err
	}

	all, err := io.ReadAll(file)
	if err != nil {
		return err
	}

	var i18nMessages domain.I18nMessages
	if err := yaml.Unmarshal(all, &i18nMessages); err != nil {
		return err
	}

	i.messages[strings.TrimSuffix(fileName, filepath.Ext(fileName))] = i18nMessages
	return nil
}

func (i *i18n) Format(str string, variables map[string]string) string {
	for key, value := range variables {
		str = strings.ReplaceAll(str, key, value)
	}
	return str
}

func (i *i18n) GetMessages(lang string) domain.I18nMessages {
	if message, ok := i.messages[lang]; ok {
		return message
	}
	if message, ok := i.messages[domain.I18nDefaultLang]; ok {
		return message
	}
	return domain.I18nMessages{}
}
