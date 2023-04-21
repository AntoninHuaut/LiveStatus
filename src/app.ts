import dayjs from 'dayjs';
import relativeTime from 'dayjs_relativeTime';

import config from '../config.ts';
import { startGlobalRunnable } from './GlobalRunnable.ts';
import { initI18n } from './utils/I18nManager.ts';

dayjs.extend(relativeTime);

await initI18n();
startGlobalRunnable(config);
