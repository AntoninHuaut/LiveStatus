interface MessageImage {
    url: string;
    height: number;
    width: number;
}

interface MessageThumbnail {
    url: string;
    height: number;
    width: number;
}

interface MessageField {
    name: string;
    value: string;
    inline: boolean;
}

export interface MessageEmbed {
    title: string;
    description?: string;
    url: string;
    type: string;
    color: number;
    image?: MessageImage;
    thumbnail?: MessageThumbnail;
    fields: MessageField[];
    footer?: MessageFooter;
}

interface MessageFooter {
    text: string;
    icon_url?: string;
    proxy_icon_url?: string;
}

interface MessageComponent {
    type: number;
}

interface MessageButton extends MessageComponent {
    label: string;
    style: number;
    url: string;
}

interface MessageActionRow extends MessageComponent {
    components?: MessageButton[];
}

export interface MessageBody {
    content?: string;
    components?: MessageActionRow[];
    embeds: MessageEmbed[];
}

interface EventMetadata {
    location: string;
}

export interface EventBody {
    channel_id: null;
    name: string;
    entity_metadata: EventMetadata;
    scheduled_start_time?: Date;
    scheduled_end_time: Date;
    description: string;
    privacy_level: number;
    entity_type: number;
    image: string;
}

export interface DiscordIdsCacheModel {
    messageId: string;
    eventId: string;
}
