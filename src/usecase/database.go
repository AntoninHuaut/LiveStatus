package usecase

import (
	"LiveStatus/src/domain"
	"fmt"
	"go.etcd.io/bbolt"
	"os"
	"path/filepath"
)

type Database interface {
	Close() error
	Open() error
	SetMessageId(twitchId string, channelId string, messageId string) error
	GetMessageId(twitchId string, channelId string) (string, error)
	SetEventId(twitchId string, guildId string, messageId string) error
	GetEventId(twitchId string, guildId string) (string, error)
}

func NewDatabase(path string) Database {
	return &database{
		path: path,
	}
}

type database struct {
	db   *bbolt.DB
	path string
}

func (d *database) Close() error {
	return d.db.Close()
}

func (d *database) Open() error {
	err := os.MkdirAll(filepath.Join(".", filepath.Dir(d.path)), os.ModePerm)
	if err != nil {
		return err
	}

	db, err := bbolt.Open(d.path, 0600, nil)
	if err != nil {
		return err
	}
	d.db = db
	return nil
}

func (d *database) SetEventId(twitchId string, guildId string, messageId string) error {
	return d.setValue(domain.DatabaseEventBucket, d.getDbKey(twitchId, guildId), messageId)
}

func (d *database) GetEventId(twitchId string, guildId string) (string, error) {
	return d.getValue(domain.DatabaseEventBucket, d.getDbKey(twitchId, guildId))
}

func (d *database) SetMessageId(twitchId string, channelId string, messageId string) error {
	return d.setValue(domain.DatabaseMessageBucket, d.getDbKey(twitchId, channelId), messageId)
}

func (d *database) GetMessageId(twitchId string, channelId string) (string, error) {
	return d.getValue(domain.DatabaseMessageBucket, d.getDbKey(twitchId, channelId))
}

func (d *database) setValue(bucketName string, key string, value string) error {
	return d.db.Update(func(tx *bbolt.Tx) error {
		bucket, err := tx.CreateBucketIfNotExists([]byte(bucketName))
		if err != nil {
			return err
		}
		return bucket.Put([]byte(key), []byte(value))
	})
}

func (d *database) getValue(bucketName string, key string) (string, error) {
	var value string
	err := d.db.View(func(tx *bbolt.Tx) error {
		bucket := tx.Bucket([]byte(bucketName))
		if bucket == nil {
			return nil
		}
		value = string(bucket.Get([]byte(key)))
		return nil
	})
	return value, err
}

func (d *database) getDbKey(twitchId string, guildOrChannelId string) string {
	return fmt.Sprintf("%s-%s", twitchId, guildOrChannelId)
}
