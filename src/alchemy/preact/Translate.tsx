import { bind } from 'decko';
import { Component, h } from 'preact';

import { Locales } from '../Locales';
import { log } from '../Log';

const locales = new Locales().bindListeners();

/**
 * Translate takes a string, and translates it! Additional interpolations for
 * the translation can be provided as further properties.
 */
export class Translate extends Component<any, { translated: string }> {
  /**
   * locales is the Locales instance that Translate components pull from.
   */
  public static readonly locales = new Locales();

  public componentDidMount() {
    locales.on('update', this.translate);
    this.translate();
  }

  public componentWillReceiveProps(props: any) {
    this.translate(props);
  }

  public componentWillUnmount() {
    locales.removeListener('update', this.translate);
  }

  public render() {
    return <span>{this.state.translated}</span>;
  }

  @bind
  private translate(props: any = this.props) {
    locales
      .translate(props.string, props)
      .then(translated => this.setState({ translated }))
      .catch(err => log.warn(`Error translating string ${props.string}`, err));
  }
}
