import * as Mixer from '@mcph/miix-std';
import { h } from 'preact';

import { PreactScene } from '../../alchemy/preact';

/**
 * This is the basic Interactie scene. Your scene will contain many controls,
 * inside the <Layout>. You can add custom scene-wide styling and behaviors,
 * like background images, here.
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
