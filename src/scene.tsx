import * as Mixer from '@mcph/miix-std';
import { h } from 'preact';

import { PreactScene } from './alchemy/preact';

/**
 * Default "stub" scene.
 */
@Mixer.Scene({ default: true })
export class DefaultScene extends PreactScene<{}> {
  public render() {
    // tslint:disable-next-line
    const Layout = this.getLayoutEngine();
    return (
      <div class={`mixer-default-scene scene-${this.scene.props.sceneID}`}>
        <Layout scene={this.scene} settings={this.state.settings} />
      </div>
    );
  }
}
