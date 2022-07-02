import config from "../../config.ts";
import Logger from "./Logger.ts";
import dayjs from "https://cdn.skypack.dev/dayjs@v1.11.3";
import relativeTime from "https://cdn.skypack.dev/dayjs@v1.11.3/plugin/relativeTime";

export { dayjs };
type OptionsType = Record<string, string | number | boolean>;

export default class I18nManager {
  private static instance: I18nManager;
  private messages: Record<string, any> = {};

  private constructor() {
    // Singleton
  }

  public async load() {
    let language = config.i18n;
    try {
      await this.loadMessages(language);
    } catch (err) {
      Logger.error(`[I18nManager::load] ${err.stack}`);
      language = "en";

      await this.loadMessages(language);
    }
    await this.loadDayjs(language);
  }

  private async loadMessages(language: string) {
    Logger.info(`Loading messages for the locale: ${language}`);
    this.messages =
      (await import(`../../resource/i18n/messages_${language}.json`, {
        assert: { type: "json" },
      })).default;
  }

  private async loadDayjs(language: string) {
    Logger.info(`Loading dayjs for the locale: ${language}`);
    dayjs.extend(relativeTime);
    const dayjsLang = await import(
      `https://cdn.skypack.dev/dayjs@v1.10.8/locale/${language}`
    );
    dayjs.locale(dayjsLang.default);
  }

  public get(key: string, options: OptionsType) {
    let i18nKey = this.messages;
    try {
      const keySplit = key.split(".");
      for (const itKey of keySplit) {
        i18nKey = i18nKey[itKey];
      }
    } catch (err) {
      Logger.error(`[I18nManager::get] ${err.stack}`);
      return;
    }

    if (typeof i18nKey === "object") {
      i18nKey = JSON.parse(JSON.stringify(i18nKey)); // Clone object
    }

    return this.translate(i18nKey, options);
  }

  private translate(i18nTrans: any, options: OptionsType) {
    if (Array.isArray(i18nTrans)) {
      return i18nTrans.map((item) => {
        Object.keys(item).forEach((subItem) =>
          item[subItem] = this.translate(item[subItem], options)
        );
        return item;
      });
    } else {
      if (typeof i18nTrans !== "string") return i18nTrans;

      if (options != null) {
        for (const optEntry of Object.entries(options)) {
          i18nTrans = i18nTrans.replaceAll(optEntry[0], optEntry[1].toString());
        }
      }

      return i18nTrans;
    }
  }

  get dayjs() {
    return dayjs;
  }

  public static getInstance() {
    if (!I18nManager.instance) {
      I18nManager.instance = new I18nManager();
    }

    return I18nManager.instance;
  }
}
