interface IMessageImage {
    url: string;
    height: number;
    width: number;
}

interface IMessageThumbnail {
    url: string;
    height: number;
    width: number;
}

interface IMessageField {
    name: string;
    value: string;
    inline: boolean;
}

export interface IMessageEmbed {
    title: string;
    description?: string;
    url: string;
    type: string;
    color: number;
    image?: IMessageImage;
    thumbnail?: IMessageThumbnail;
    fields: IMessageField[];
    footer?: IMessageFooter;
}

interface IMessageFooter {
    text: string;
    icon_url?: string;
    proxy_icon_url?: string;
}

interface IMessageComponent {
    type: number;
}

interface IMessageButton extends IMessageComponent {
    label: string;
    style: number;
    url: string;
}

interface IMessageActionRow extends IMessageComponent {
    components?: IMessageButton[];
}

export interface IMessageBody {
    content?: string;
    components?: IMessageActionRow[];
    embeds: IMessageEmbed[];
}

interface IEventMetadata {
    location: string;
}

export interface IEventBody {
    channel_id: null;
    name: string;
    entity_metadata: IEventMetadata;
    scheduled_start_time?: Date;
    scheduled_end_time: Date;
    description: string;
    privacy_level: number;
    entity_type: number;
    image: string;
}

export interface IDiscordIdsCacheModel {
    messageId: string;
    eventId: string;
}
