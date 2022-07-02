import { Colors } from "../deps.ts";
import config from "../../config.ts";

enum LogLevel {
  INFO = "INFO ",
  DEBUG = "DEBUG",
  ERROR = "ERROR",
}

export default class Logger {
  private static log(finalMsg: string) {
    if (!config.logger.logFile?.trim()) return;

    Deno.writeTextFileSync(config.logger.logFile, finalMsg + "\n", {
      append: true,
    });
  }

  public static debug(msg: string) {
    if (!config.logger.debugLevel) return;

    const toLog = Logger.format(LogLevel.DEBUG, msg);
    console.debug(Colors.gray(toLog));
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
