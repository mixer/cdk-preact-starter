import * as Mixer from '@mcph/miix-std';

import { HtmlControl } from '../../alchemy/preact/HtmlControl';

/**
 * The SimpleHtmlControl simply renders HTML provided in the given string
 * or external URL.
 *
 * If you're customizing your bundle, you can also swap this to import a local
 * file, by passing it into the `url` method. This can look something like:
 *
 * ```
 *   public getHtml() {
 *     return this.url(require('./hello-world.html'));
 *   }
 * ```
 */
@Mixer.Control({ kind: 'htmlString' })
export class HtmlStringControl extends HtmlControl {
  /**
   * htmlString is a string of HTML data. Either this, or htmlUrl, should be set.
   */
  @Mixer.Input() public htmlString: string = '';

  /**
   * htmlUrl is a web page to load HTML data from.
   * Either this, or htmlString, should be set.
   */
  @Mixer.Input({ kind: Mixer.InputKind.Url })
  public htmlUrl: string = '';

  /**
   * @override
   */
  public componentDidMount() {
    this.renderHtml();
  }

  /**
   * @override
   */
  public componentDidUpdate() {
    this.renderHtml();
  }

  private renderHtml() {
    if (this.htmlUrl) {
      this.insertUrl(this.htmlUrl);
    } else {
      this.insert(this.htmlString);
    }
  }
}
