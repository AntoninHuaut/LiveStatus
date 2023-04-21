import * as Colors from 'fmt/colors.ts';

import config from '../../config.ts';

enum LogLevel {
    INFO = 'INFO ',
    DEBUG = 'DEBUG',
    ERROR = 'ERROR',
}

export function log(finalMsg: string) {
    if (!config.logger.logFile?.trim()) return;

    Deno.writeTextFileSync(config.logger.logFile, finalMsg + '\n', {
        append: true,
    });
}

export function debug(msg: string) {
    if (!config.logger.debugLevel) return;

    const toLog = format(LogLevel.DEBUG, msg);
    console.debug(Colors.gray(toLog));
    log(toLog);
}

export function info(msg: string) {
    const toLog = format(LogLevel.INFO, msg);
    console.info(Colors.yellow(toLog));
    log(toLog);
}

export function error(msg: string) {
    const toLog = format(LogLevel.ERROR, msg);
    console.error(Colors.red(toLog));
    log(toLog);
}

export function format(logLevel: LogLevel, msg: string) {
    return `${logLevel} [${new Date().toLocaleString()}]: ${msg}`;
}
