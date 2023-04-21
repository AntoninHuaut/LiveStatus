import dayjs from 'dayjs';
import relativeTime from 'dayjs_relativeTime';

import config from '../config.ts';
import { startGlobalRunnable } from './GlobalRunnable.ts';
import I18nManager from './utils/I18nManager.ts';

dayjs.extend(relativeTime);

await I18nManager.getInstance().load();
startGlobalRunnable(config);
