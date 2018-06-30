import * as Mixer from '@mixer/cdk-std';
import { Component } from 'preact';

import { MScene } from '../State';
import { untilUnmount } from '../Toolbox';
import { FixedGridLayout, FlexLayout } from './Layout';

export type SceneProps<S> = { resource: MScene<S & Mixer.IScene> } & S & Mixer.IScene;

interface ISceneState {
  settings: Mixer.ISettings;
  containers: Mixer.Layout.IContainer[];
}

/**
 * PreactScene is the base scene. You can extend and override this scene.
 */
export abstract class PreactScene<T, S = {}> extends Component<SceneProps<S>, T & ISceneState> {
  protected scene: MScene<S & Mixer.IScene>;

  constructor(props: SceneProps<S>) {
    super(props);
    this.scene = props.resource;
    this.setState({
      ...(this.state as ISceneState),
      containers: props.containers,
    });
  }

  public componentWillMount() {
    Mixer.display
      .settings()
      .pipe(untilUnmount(this))
      .subscribe((settings: Mixer.ISettings) => {
        this.setState({
          ...(this.state as ISceneState),
          settings,
        });
      });
  }

  public componentWillReceiveProps(nextProps: SceneProps<S>) {
    this.scene = nextProps.resource;
  }

  /**
   * Returns the layout engines that these controls are using.
   */
  protected getFixedGridLayoutEngine() {
    if (this.props.controls.find(control => control.kind !== 'screen')) {
      return FixedGridLayout;
    }
    return null;
  }

  protected getFlexLayoutEngine() {
    if (this.props.containers) {
      return FlexLayout;
    }
    return null;
  }
}
