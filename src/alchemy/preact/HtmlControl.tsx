import { h } from 'preact';
import { log } from '../Log';

import { PreactControl } from './Control';

/**
 * regex for moving CDATA tags around scripts for our insertion.
 */
const cdataRe = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;

/**
 * The HtmlControl can be extended to allow you insert snippets or HTML
 * elements directly into the page. It has a getHtml() function that you
 * must implement, along with helper functions to load files or URLs.
 *
 * For example, to place a string of HTML:
 *
 * ```
 * export class GreeterControl extends HtmlControl {
 *   public componentDidMount() {
 *     this.insert('<h1>Hello world!</h1>');
 *   }
 * }
 * ```
 *
 * You can also load external HTML pages. If you're loading off an external
 * domain, make sure that the page has the necessary security headers to let
 * you request it. (See: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
 *
 * ```
 * export class GreeterControl extends HtmlControl {
 *   public componentDidMount() {
 *     this.insertUrl('https://example.com/my-greeter-control.html');
 *   }
 * }
 * ```
 *
 * Finally, you can load HTML contents straight from the disk. For example,
 * if you had a folder like:
 *
 * ```
 * src/prefabs/my-greeter-control
 * ├── greeter.html
 * └── greeter.tsx
 * ```
 *
 * You can import and include `greeter.html` from `greeter.tsx` via:
 *
 * ```
 * export class GreeterControl extends HtmlControl {
 *   public componentDidMount() {
 *     this.insertUrl(require('./greeter.html'));
 *   }
 * }
 * ```
 *
 * This is a Preact control, so you can, as usual, hook into the various
 * lifecycle methods: https://preactjs.com/guide/api-reference#lifecycle-methods
 */
export abstract class HtmlControl<T = {}> extends PreactControl<T> {
  /**
   * The ID for this control, see getId() for more information.
   */
  protected readonly id = this.getId();

  /**
   * boundElement is a list of HTML elements--scripts and style tags--appended
   * globally to the document which should be cleaned up when the control
   * is removed.
   */
  private boundElements: Element[] = [];

  public render() {
    return <div id={this.id} />;
  }

  public componentWillUnmount() {
    this.unmount();
  }

  /**
   * Returns a unique ID for this control. Your HTML contents will be put
   * inside a div with this ID, like `<div id="my-id"></div>`. You can
   * use this in business logic you may have to scope the specific control.
   * This should have some random component in case there are multiple HTML
   * controls in the scene.
   */
  protected getId(): string {
    return `html-control-${Math.random()}`;
  }

  /**
   * Loads HTML from the provided address into the control.
   * See the docs on the HtmlControl class for more information and examples.
   */
  protected insertUrl(address: string): Promise<void> {
    return fetch(address)
      .then(response => response.text())
      .then(text => this.insert(text))
      .catch(err => {
        log.error(err, 'Error loading external HTML control content from:', address);
        throw err;
      });
  }

  /**
   * insert adds the loaded template into the DOM. Internally it handles
   * extractions of scripts and styles so that the browser correctly executes
   * them.
   */
  protected insert(contents: string | Element) {
    this.unmount();

    const container = this.base;
    if (typeof contents === 'string') {
      // tslint:disable-next-line
      container.innerHTML = contents;
    } else {
      container.appendChild(contents);
    }

    const toExtract = [
      ...Array.from(container.querySelectorAll('link[rel="stylesheet"], link[type="text/css"]')),
      ...Array.from(container.getElementsByTagName('style')),
      ...Array.from(container.getElementsByTagName('script')),
    ];

    this.boundElements = toExtract.map(el => {
      if (el.parentElement) {
        el.parentElement.removeChild(el);
      }

      if (el instanceof HTMLScriptElement) {
        const script = document.createElement('script');
        script.text = el.text.replace(cdataRe, '');
        return document.head.appendChild(script);
      }

      document.head.appendChild(el);
      return el;
    });
  }

  /**
   * Removes all elements and bound document scripts associated with the
   * rendered content.
   */
  protected unmount() {
    this.boundElements.forEach(el => {
      if (el.parentElement) {
        el.parentElement.removeChild(el);
      }
    });

    while (this.base.firstChild) {
      this.base.removeChild(this.base.firstChild);
    }

    this.boundElements = [];
  }
}
