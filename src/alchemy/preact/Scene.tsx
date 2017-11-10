import * as Mixer from '@mcph/miix-std';
import { bind } from 'decko';
import { Component } from 'preact';

import { MScene } from '../State';
import { FixedGridLayout, FlexLayout } from './Layout';

export type SceneProps<S> = { resource: MScene<S & Mixer.IScene> } & S & Mixer.IScene;

/**
 * PreactScene is the base scene. You can extend and override this scene.
 */
export abstract class PreactScene<T, S = {}> extends Component<
  SceneProps<S>,
  T & { settings: Mixer.ISettings }
> {
  protected scene: MScene<S & Mixer.IScene>;

  constructor(props: SceneProps<S>) {
    super(props);
    this.scene = props.resource;
  }

  /**
   * @override
   */
  public componentWillMount() {
    this.updateSettings();
    Mixer.display.on('settings', this.updateSettings);
  }

  /**
   * @override
   */
  public componentWillUnmount() {
    Mixer.display.removeListener('settings', this.updateSettings);
  }

  /**
   * @override
   */
  public componentWillReceiveProps(nextProps: SceneProps<S>) {
    this.scene = nextProps.resource;
  }

  /**
   * Returns the layout engine that these controls are using.
   */
  protected getLayoutEngine() {
    if (Mixer.packageConfig.display.mode === 'flex') {
      return FlexLayout;
    }

    return FixedGridLayout;
  }

  @bind
  private updateSettings() {
    this.setState(Object.assign({}, this.state, { settings: Mixer.display.getSettings() }));
  }
}
