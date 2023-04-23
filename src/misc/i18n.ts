import dayjs from 'dayjs';

import { config } from '../app.ts';
import * as Logger from './logger.ts';

type OptionsType = Record<string, string | number | boolean>;

let messages: Record<string, any> = {};

export async function initI18n() {
    let locale = config.i18n;
    try {
        await loadMessages(locale);
    } catch (err) {
        Logger.error(`[I18nManager::load] ${err.stack}`);
        locale = 'en';

        await loadMessages(locale);
    }
    await setDayjsLocale(locale);
}

async function loadMessages(locale: string) {
    Logger.info(`Loading messages for the locale: ${locale}`);
    messages = (
        await import(`../../resource/i18n/messages_${locale}.json`, {
            assert: { type: 'json' },
        })
    ).default;
}

async function setDayjsLocale(locale: string) {
    Logger.info(`Loading dayjs for the locale: ${locale}`);
    const dayjsLang = await import(`https://cdn.skypack.dev/dayjs@v1.11.6/locale/${locale}`);
    dayjs.locale(dayjsLang.default);
}

export function getI18n(key: string, options: OptionsType) {
    let i18nKey = messages;
    try {
        const keySplit = key.split('.');
        for (const itKey of keySplit) {
            i18nKey = i18nKey[itKey];
        }
    } catch (err) {
        Logger.error(`[I18nManager::get] ${err.stack}`);
        return;
    }

    if (typeof i18nKey === 'object') {
        i18nKey = JSON.parse(JSON.stringify(i18nKey)); // Clone object
    }

    return translate(i18nKey, options);
}

function translate(i18nTrans: any, options: OptionsType) {
    if (Array.isArray(i18nTrans)) {
        return i18nTrans.map((item) => {
            Object.keys(item).forEach((subItem) => (item[subItem] = translate(item[subItem], options)));
            return item;
        });
    } else {
        if (typeof i18nTrans !== 'string') return i18nTrans;

        if (options != null) {
            for (const optEntry of Object.entries(options)) {
                i18nTrans = i18nTrans.replaceAll(optEntry[0], optEntry[1].toString());
            }
        }

        return i18nTrans;
    }
}
