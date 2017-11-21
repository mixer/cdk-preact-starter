import * as Mixer from '@mcph/miix-std';
import { EventEmitter } from 'eventemitter3';
import IntlMessageFormat from 'intl-messageformat';

import { log } from './Log';

/**
 * Locales is the wrapper/loader for your translations. This is a "lower level"
 * class, if you're using Preact check out the Translate component in the
 * "preact" folder!
 */
export class Locales extends EventEmitter {
  /**
   * fallbackLanguage is the language to load if we can't find a language
   * matching the user's locale.
   */
  public static fallbackLanguage = 'en-US';

  private loadedLocale: string;
  private localesPromise: Promise<{ [key: string]: IntlMessageFormat }> = Promise.resolve({});

  /**
   * bindListeners attaches listeners for the language settings, and loads
   * the currently language if any.
   */
  public bindListeners(): this {
    this.loadLocaleFromSettings(Mixer.display.getSettings());
    Mixer.display.on('settings', s => this.loadLocaleFromSettings(s));
    return this;
  }

  /**
   * translate returns a translation of the given key, interpolated with
   * the parameters. Attempts to interpolate the key itself if a
   * localized string does not exist.
   */
  public translate(key: string, params: any): Promise<string> {
    return this.localesPromise.then(strings => {
      return strings[key]
        ? strings[key].format(params)
        : new IntlMessageFormat(key, navigator.language).format(params);
    });
  }

  /**
   * loadLocale attempts to load the most specific locale for the given
   * name. The general algorithm is to split the possible and the loaded
   * locales by non-alphanum characters and to get the longest prefix.
   */
  public loadLocale(locale: string): Promise<void> {
    if (this.loadedLocale === locale) {
      return;
    }
    this.loadedLocale = locale;

    if (Mixer.locales.length === 0) {
      this.localesPromise = Promise.resolve({});
      return;
    }

    const current = splitLocale(locale.toLowerCase());

    let bestIndex = -1;
    let bestCommon = 0;
    Mixer.locales.map(splitLocale).forEach((available, i) => {
      let common = 0;
      for (; common < available.length && common < current.length; common++) {
        if (available[i] !== current[i]) {
          break;
        }
      }

      if (common > bestCommon) {
        bestIndex = i;
        bestCommon = i;
      }
    });

    // Found something? Great, use that! :)
    if (bestIndex > -1) {
      return this.loadRemoteLocaleJSON(Mixer.locales[bestIndex]);
    }

    // Fall back if we can
    if (locale !== Locales.fallbackLanguage) {
      return this.loadLocale(Locales.fallbackLanguage);
    }

    // Otherwise just grab the first language. Better than nothing.
    return this.loadRemoteLocaleJSON(Mixer.locales[0]);
  }

  private loadLocaleFromSettings(settings: Mixer.ISettings) {
    if (!settings || !settings.language) {
      return;
    }

    this.loadLocale(settings.language)
      .then(() => {
        this.emit('update');
      })
      .catch(err => {
        log.error(`Error loading locale data for ${settings.language}`, err);
      });
  }

  private loadRemoteLocaleJSON(locale: string) {
    this.localesPromise = fetch(`./locales/${locale}.json`).then(res => {
      const output: { [key: string]: IntlMessageFormat } = Object.create(null);
      if (res.status !== 200) {
        log.error('Could not load locale data. Got status:', res.status);
        return output;
      }

      return res.json().then(body => {
        Object.keys(body).forEach(key => {
          output[key] = new IntlMessageFormat(body[key], locale);
        });

        return output;
      });
    });

    return this.localesPromise.then(() => undefined);
  }
}

function splitLocale(locale: string): string[] {
  return locale.toLowerCase().split(/[^a-z0-9]+/g);
}
