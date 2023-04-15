import dayjs from 'https://cdn.skypack.dev/dayjs@v1.11.6';
import relativeTime from 'https://cdn.skypack.dev/dayjs@v1.11.6/plugin/relativeTime';

export * as Colors from 'https://deno.land/std@0.178.0/fmt/colors.ts';
export * as oak from 'https://deno.land/x/oak@v12.1.0/mod.ts';
export * as nacl from 'https://deno.land/x/tweetnacl_deno_fix@1.1.2/src/sign.ts';
export { Buffer } from 'https://deno.land/x/node_buffer@1.1.0/mod.ts';

dayjs.extend(relativeTime);

function loadDayjsLocale(locale: string): Promise<any> {
    return import(`https://cdn.skypack.dev/dayjs@v1.11.6/locale/${locale}`);
}

export { dayjs, loadDayjsLocale };
