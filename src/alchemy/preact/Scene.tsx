import * as Mixer from '@mcph/miix-std';
import { bind } from 'decko';
import { Component, h } from 'preact';

import { MScene } from '../State';
import { FixedGridLayout, FlexLayout } from './Layout';

function getLayoutEngine() {
  if (Mixer.packageConfig.display.mode === 'flex') {
    return FlexLayout;
  }

  return FixedGridLayout;
}

type SceneProps<S> = { resource: MScene<S & Mixer.IScene> } & S & Mixer.IScene;

/**
 * PreactScene is the base scene. You can extend and override this scene.
 */
@Mixer.Scene({ default: true })
export class PreactScene<T, S = {}> extends Component<
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

  public render() {
    // tslint:disable-next-line
    const Layout = getLayoutEngine();
    return (
      <div class={`scene scene-${this.scene.props.sceneID}`}>
        <Layout scene={this.scene} settings={this.state.settings} />
      </div>
    );
  }

  @bind
  private updateSettings() {
    this.setState(Object.assign({}, this.state, { settings: Mixer.display.getSettings() }));
  }
}
