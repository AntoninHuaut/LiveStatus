import dayjs from 'dayjs';
import relativeTime from 'dayjs_relativeTime';
import { parse } from 'encoding/jsonc.ts';

import { startRunnable } from './runnable.ts';
import { IConfig } from './type/IConfig.ts';
import { initI18n } from './util/i18nManager.ts';
import * as Logger from './util/logger.ts';

dayjs.extend(relativeTime);

export const config: IConfig = parse(Deno.readTextFileSync('./config.jsonc')) as unknown as IConfig;

if (config) {
    await initI18n();
    await startRunnable();
} else {
    Logger.error('Config file is not valid');
}
