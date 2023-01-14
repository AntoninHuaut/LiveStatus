import dayjs from 'https://cdn.skypack.dev/dayjs@v1.11.6';
import relativeTime from 'https://cdn.skypack.dev/dayjs@v1.11.6/plugin/relativeTime';

export * as Colors from 'https://deno.land/std@0.172.0/fmt/colors.ts';

dayjs.extend(relativeTime);

function loadDayjsLocale(locale: string): Promise<any> {
    return import(`https://cdn.skypack.dev/dayjs@v1.11.6/locale/${locale}`);
}

export { dayjs, loadDayjsLocale };
