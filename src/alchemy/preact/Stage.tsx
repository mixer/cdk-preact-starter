import * as Mixer from '@mcph/miix-std';
import { Component, h } from 'preact';

import { MScene, State } from '../State';
import { ResourceHolder } from './Helpers';
import { ReadyOverlayComponent } from './ReadyOverlay';
import { PreactScene } from './Scene';

/**
 * PreactStage is the bootstrap component for the interactive integration.
 * You may swap this out or customize it if you want, but it shouldn't
 * generally be necessary.
 */
export class PreactStage extends Component<
  { registry: Mixer.Registry },
  { scene: MScene; isReady: boolean; world: any }
> {
  private interactive: State;

  public componentWillMount() {
    const i = (this.interactive = new State(this.props.registry));

    i.participant.on('update', ev => this.updateScene(i.participant.group.sceneID));
    i.participant.on('groupUpdate', ev => this.updateScene(ev.sceneID));
    i.world.subscribe(world => this.setState({ ...this.state, world }));
    i.isReady.subscribe(isReady => this.setState({ ...this.state, isReady }));
  }

  public render() {
    if (!this.interactive || !this.state.isReady) {
      return <ReadyOverlayComponent config={this.state.world.readyOverlay} />;
    }

    if (!this.state.scene) {
      return;
    }

    const platform = 'xbox' || Mixer.display.getSettings().platform;

    return <div class={`stage platform-${platform}`}>{this.getSceneComponent(this.state.scene)}</div>;
  }

  /**
   * Updates the displayed scene to match the ID.
   */
  protected updateScene(id: string) {
    if (!this.state.scene || this.state.scene.props.sceneID !== id) {
      this.setState({ ...this.state, scene: this.interactive.scenes[id] });
    }
  }

  /**
   * Returns the renderable component for the scene.
   */
  protected getSceneComponent(scene: MScene) {
    const ctor = scene.descriptor().ctor as typeof PreactScene;
    return <ResourceHolder resource={scene} component={ctor} />;
  }
}
