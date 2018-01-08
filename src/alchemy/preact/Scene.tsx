import * as Mixer from '@mcph/miix-std';
import { Component } from 'preact';

import { MScene } from '../State';
import { untilUnmount } from '../Toolbox';
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
    Mixer.display
      .settings()
      .pipe(untilUnmount(this))
      .subscribe(settings => {
        this.setState(Object.assign({}, this.state, { settings }));
      });
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
    if (this.scene.get('containers')) {
      return FlexLayout;
    }

    return FixedGridLayout;
  }
}
