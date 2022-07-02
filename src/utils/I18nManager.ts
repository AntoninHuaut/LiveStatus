import config from "../../config.ts";
import Logger from "./Logger.ts";
import { dayjs, loadDayjsLocale } from "../deps.ts";

type OptionsType = Record<string, string | number | boolean>;

export default class I18nManager {
  private static instance: I18nManager;
  private messages: Record<string, any> = {};

  private constructor() {
    // Singleton
  }

  public async load() {
    let locale = config.i18n;
    try {
      await this.loadMessages(locale);
    } catch (err) {
      Logger.error(`[I18nManager::load] ${err.stack}`);
      locale = "en";

      await this.loadMessages(locale);
    }
    await this.setDayjsLocale(locale);
  }

  private async loadMessages(locale: string) {
    Logger.info(`Loading messages for the locale: ${locale}`);
    this.messages =
      (await import(`../../resource/i18n/messages_${locale}.json`, {
        assert: { type: "json" },
      })).default;
  }

  private async setDayjsLocale(locale: string) {
    Logger.info(`Loading dayjs for the locale: ${locale}`);
    const dayjsLang = await loadDayjsLocale(locale);
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

  public static getInstance() {
    if (!I18nManager.instance) {
      I18nManager.instance = new I18nManager();
    }

    return I18nManager.instance;
  }
}
