import * as Mixer from '@mcph/miix-std';
import { h } from 'preact';

import { PreactScene } from '../../alchemy/preact';

import './scene.scss';

/**
 * This is the basic Interactie scene. Your scene will contain many controls,
 * inside the <Layout>. You can add custom scene-wide styling and behaviors,
 * like background images, here.
 */
@Mixer.Scene({ default: true })
export class DefaultScene extends PreactScene<{}> {
  public render() {
    //tslint:disable-next-line
    const FixedGridLayout = this.getFixedGridLayoutEngine();
    //tslint:disable-next-line
    const FlexLayout = this.getFlexLayoutEngine();
    const scene = this.scene;
    const renders = [];

    // If a flex-based control exist or a container exists that
    // requires a FlexLayout, we'll render it.
    if (FlexLayout) {
      renders.push(
        <FlexLayout
          key={`mixer-default-scene scene-${this.scene.props.sceneID}`}
          scene={scene}
          settings={this.state.settings}
          containers={this.state.containers}
        />,
      );
    }

    // If controls exist that require the FixedGridLayout, we will render it.
    if (FixedGridLayout) {
      renders.push(
        <FixedGridLayout
          key={`mixer-default-scene scene-${this.scene.props.sceneID}`}
          scene={scene}
          settings={this.state.settings}
        />,
      );
    }
    return (
      <div class={`mixer-default-scene scene-${this.scene.props.sceneID}`}>
        {renders}
      </div>
    );
  }
}
