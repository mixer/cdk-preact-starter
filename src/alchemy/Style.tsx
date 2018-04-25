import { display, Layout } from '@mixer/cdk-std';

/**
 * Returns the name translated from camelCase to kebab-case.
 */
function toKebabCase(str: string): string {
  // yum!
  return str.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
}

// The rules are from https://github.com/rofrischmann/unitless-css-property.
// They are made available under the following license:
//
// The MIT License (MIT)
//
// Copyright (c) 2016 Robin Frischmann
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
const unitlessRules = {
  'border-image-outset': true,
  'border-image-slice': true,
  'border-image-width': true,
  'font-weight': true,
  'line-height': true,
  opacity: true,
  orphans: true,
  'tab-size': true,
  widows: true,
  'z-index': true,
  zoom: true,

  // SVG-related properties
  'fill-opacity': true,
  'stop-opacity': true,
  'stroke-dashoffset': true,
  'stroke-opacity': true,
  'stroke-width': true,

  // Prefixed
  'animation-iteration-count': true,
  'box-flex': true,
  'box-flex-group': true,
  'box-ordinal-group': true,
  'column-count': true,
  flex: true,
  'flex-grow': true,
  'flex-positive': true,
  'flex-shrink': true,
  'flex-negative': true,
  'flex-order': true,
  'grid-row': true,
  'grid-column': true,
  order: true,
  'line-clamp': true,
};

/**
 * Returns whether the rule's value, if a number, can be presented as unitless
 * without a `px` suffix.
 */
function isUnitless(rule: string): boolean {
  if (unitlessRules.hasOwnProperty(rule)) {
    return true;
  }

  const unprefixed = /^[a-z]\-(.+)$/.exec(rule);
  return unprefixed && unitlessRules.hasOwnProperty(unprefixed[1]);
}

/**
 * IQueryMatcher matches mediaquery-like strings. This includes plain
 * CSS media-queries as well as user-defined extensions.
 */
interface IQueryMatcher {
  /**
   * Returns whether the state matches the given query in this moment.
   */
  matches(): boolean;

  /**
   * Watches for changes in the state. Returns a function to use to
   * unsubscribe from the watch.
   */
  watch(fn: (matches: boolean) => void): () => void;
}

/**
 * PlacesVideoMatcher handles queries like `(places-video: true)`.
 */
class PlacesVideoMatcher implements IQueryMatcher {
  /**
   * Pattern used for matching the placesVideo media queries.
   */
  private static pattern = /^\(places-video: *(true|false)\)$/;

  constructor(private readonly query: string) {}

  /**
   * Returns whether the matcher can handle th given patterns.
   */
  public static test(pattern: string): boolean {
    return this.pattern.test(pattern);
  }

  /**
   * @override
   */
  public matches(): boolean {
    const settings = display.getSettings();
    const places = settings && settings.placesVideo;
    const matches = PlacesVideoMatcher.pattern.exec(this.query);
    const expected = matches && matches[1] === 'true';
    return expected === places;
  }

  /**
   * @override
   */
  public watch(fn: (matches: boolean) => void): () => void {
    const subscription = display.settings().subscribe(() => fn(this.matches()));
    return () => subscription.unsubscribe();
  }
}

/**
 * MediaQueryMatcher is a QueryMatcher for browser media queries.
 */
class MediaQueryMatcher implements IQueryMatcher {
  constructor(private readonly query: string) {}

  /**
   * Returns whether the matcher can handle th given patterns.
   */
  public static test(pattern: string): boolean {
    return true;
  }

  /**
   * @override
   */
  public matches(): boolean {
    return matchMedia(this.query).matches;
  }

  /**
   * @override
   */
  public watch(fn: (matches: boolean) => void): () => void {
    const query = matchMedia(this.query);
    const handler = (result: MediaQueryList) => fn(result.matches);
    query.addListener(handler);
    return () => query.removeListener(handler);
  }
}

/**
 * RuleSet is a set of CSS rules.
 */
export class RuleSet {
  private observerMap = new Map<Function, () => void>();
  private lastRules: { [key: string]: Layout.Style };
  private queryMatchers = [PlacesVideoMatcher, MediaQueryMatcher];

  constructor(private readonly rules: Layout.StyleRules) {}

  /**
   * Compiles the set of CSS rules into an inline style. Breakpoints will
   * be evaluated based on the instant size of the display.
   */
  public compile(): string {
    const output: string[] = [];
    this.lastRules = {};
    Object.keys(this.rules).forEach(name => {
      const value = this.rules[name];
      if (value == null) {
        return;
      }

      if (typeof value !== 'object') {
        // simple rules are easy
        output.push(this.compileAndAddRule(name, value));
        return;
      }

      if (!this.getMatcherFor(name).matches()) {
        // key is a media query, abort if no match
        return;
      }

      Object.keys(value).forEach(nested => {
        output.push(this.compileAndAddRule(nested, value[nested]));
      });
    });

    return output.join(';');
  }

  /**
   * Returns a new rule set by joining this one to another. The others'
   * rules will override this set's rules if they conflict.
   */
  public concat(...others: RuleSet[]): RuleSet {
    const composed = { ...this.rules };
    for (let i = 0; i < others.length; i++) {
      if (others[i]) {
        Object.assign(composed, others[i].rules);
      }
    }

    return new RuleSet(composed);
  }

  /**
   * Returns if the element the ruleset applies to is _definitely_ hidden.
   * It might not be visible even if this returns false, but if this returns
   * return then it is definitely not visible.
   */
  public isHidden(): boolean {
    return (
      String(this.rules.display).toLowerCase() === 'none' ||
      String(this.rules.visibility).toLowerCase() === 'hidden'
    );
  }

  /**
   * Watches for changes in the rules that happen when the window changes
   * and breakpoints are hit. The callback fires with the new,compiled rules.
   */
  public observe(callback: (rules: string) => void): void {
    const queries = this.getMediaQueries().map(query => this.getMatcherFor(query));
    const wrapped = () => callback(this.compile());
    const unsubscribers = queries.map(q => q.watch(wrapped));
    this.observerMap.set(callback, () => unsubscribers.forEach(fn => fn()));
  }

  /**
   * Removes a previously added observer.
   */
  public unobserve(callback?: (rules: string) => void) {
    if (!callback) {
      this.observerMap.forEach(fn => fn());
      return;
    }

    const unsubscribe = this.observerMap.get(callback);
    if (unsubscribe) {
      unsubscribe();
      this.observerMap.delete(callback);
    }
  }

  /**
   * Returns the query matcher for the given media query.
   */
  private getMatcherFor(query: string): IQueryMatcher {
    const matcherCls = this.queryMatchers.find(m => m.test(query));
    return new matcherCls(query);
  }

  /**
   * Compiles a single property:value pair, and adds it to the working ruleset.
   */
  private compileAndAddRule(name: string, value: Layout.Style) {
    const parsedName = toKebabCase(name);
    const parsedValue = typeof value === 'number' && !isUnitless(parsedName) ? `${value}px` : value;
    this.lastRules[name] = value;

    return `${parsedName}:${parsedValue}`;
  }

  /**
   * Returns a list of media queries this ruleset has.
   */
  private getMediaQueries(): string[] {
    return Object.keys(this.rules).filter(key => typeof this.rules[key] === 'object');
  }
}

/**
 * Compiles the set of CSS styles into an inline string.
 */
export function css(styles: Layout.StyleRules): string {
  return new RuleSet(styles).compile();
}

/**
 * classes is called with a map of class names to true/false whether those
 * classes are enabled. It returns a concatenated list of classes. Class
 * names that were in camelCase will be automatically converted to kebab-case.
 */
export function classes(map: { [cls: string]: boolean }): string {
  return Object.keys(map)
    .filter(key => map[key])
    .map(toKebabCase)
    .join(' ');
}

export function blockRule(controlID: string, selector: string, styles: any, platform?: string): string {
  let s = `\n\t[name="control-${controlID}"] ${selector} {\n`;

  if (platform) {
    s = `.platform-${platform} ${s}`;
  }

  Object.keys(styles).forEach(name => {
    const value = styles[name];
    if (value == null) {
      return;
    }
    s += `\t\t${toKebabCase(name)}: ${value};\n`;
  });

  s += `\t}\n\n`;
  return s;
}
