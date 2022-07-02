import GlobalRunnable from "./GlobalRunnable.ts";
import I18nManager from "./utils/I18nManager.ts";
import config from "../config.ts";

await I18nManager.getInstance().load();
new GlobalRunnable(config);
