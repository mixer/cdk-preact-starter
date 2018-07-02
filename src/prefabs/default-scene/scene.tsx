import * as Mixer from '@mixer/cdk-std';
import { Component, h } from 'preact';

import { PreactScene } from '../../alchemy/preact';
import { ResourceHolder } from '../../alchemy/preact/Helpers';
import { Screen } from '../screen/screen';

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

    const screenControl = this.props.controls.find(control => control.kind === 'screen');
    if (screenControl) {
      renders.push(
        <ResourceHolder
          key={`resource-${screenControl.controlID}`}
          resource={this.scene.controls[screenControl.controlID]}
          component={Screen as typeof Component}
        />,
      );

      if (FixedGridLayout) {
        console.warn(
          'A screen control must exist alone in a scene.' +
            ' Other controls have been detected, but have been ignored in the render process.',
        );
      }
    } else {
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
      } else if (FixedGridLayout) {
        renders.push(
          <FixedGridLayout
            key={`mixer-default-scene scene-${this.scene.props.sceneID}`}
            scene={scene}
            settings={this.state.settings}
          />,
        );
      }
    }

    return <div class={`mixer-default-scene scene-${this.scene.props.sceneID}`}>{renders}</div>;
  }
}
