export interface IApplicationCommand {
    id: string;
    application_id: string;
    name: string;
    type: number;
    description: string;
    options: IApplicationCommandOption[];
}

export interface ICreateApplicationCommand {
    name: string;
    type: number;
    description?: string;
    options?: IApplicationCommandOption[];
}

export interface IEditApplicationCommand {
    name: string;
    description?: string;
    options?: IApplicationCommandOption[];
}

export interface IApplicationCommandOption {
    type: IApplicationCommandOptionType;
    name: string;
    description: string;
    default?: boolean;
    required?: boolean;
    choices?: IApplicationCommandOptionChoice[];
    options?: IApplicationCommandOption[];
    min_value?: number;
    max_value?: number;
    min_length?: number;
    max_length?: number;
    autocomplete?: boolean;
}

export enum IApplicationCommandOptionType {
    SUB_COMMAND = 1,
    SUB_COMMAND_GROUP = 2,
    STRING = 3,
    INTEGER = 4,
    BOOLEAN = 5,
    USER = 6,
    CHANNEL = 7,
    ROLE = 8,
    MENTIONABLE = 9,
    NUMBER = 10,
    ATTACHMENT = 11,
}

export interface IApplicationCommandOptionChoice {
    name: string;
    value: string | number;
}
