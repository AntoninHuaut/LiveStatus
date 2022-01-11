import * as Colors from "https://deno.land/std/fmt/colors.ts";

enum LogLevel {
    INFO = "INFO ",
    DEBUG = "DEBUG",
    ERROR = "ERROR"
}

export default class Logger {

    private static readonly DEBUG: boolean = false;
    private static readonly LOG_FILE: string = "app.log";

    private static log(finalMsg: string) {
        Deno.writeTextFileSync(Logger.LOG_FILE, finalMsg + "\n", { append: true });
    }

    public static debug(msg: string) {
        if (!Logger.DEBUG) return;

        const toLog = Logger.format(LogLevel.DEBUG, msg);
        console.info(Colors.gray(toLog));
        Logger.log(toLog);
    }

    public static info(msg: string) {
        const toLog = Logger.format(LogLevel.INFO, msg);
        console.info(Colors.yellow(toLog));
        Logger.log(toLog);
    }

    public static error(msg: string) {
        const toLog = Logger.format(LogLevel.ERROR, msg);
        console.error(Colors.red(toLog));
        Logger.log(toLog);
    }

    private static format(logLevel: LogLevel, msg: string) {
        return `${logLevel} [${new Date().toLocaleString()}]: ${msg}`;
    }
}