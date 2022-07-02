export * as Colors from "https://deno.land/std@0.125.0/fmt/colors.ts";

import dayjs from "https://cdn.skypack.dev/dayjs@v1.11.3";
import relativeTime from "https://cdn.skypack.dev/dayjs@v1.11.3/plugin/relativeTime";
dayjs.extend(relativeTime);

function loadDayjsLocale(locale: string): Promise<any> {
  return import(
    `https://cdn.skypack.dev/dayjs@v1.11.3/locale/${locale}`
  );
}

export { dayjs, loadDayjsLocale };
