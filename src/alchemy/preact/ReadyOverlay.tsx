//tslint:disable-next-line
import * as Mixer from '@mixer/cdk-std';
import { Component, h } from 'preact';
import { Translate } from './Translate';

import './ReadyOverlay.scss';

import { css } from '../Style';
import { untilUnmount } from '../Toolbox';

/**
 * IReadyProperties describes an optional object set on the global scene,
 * which configures how the ReadyOverlayComponent is displayed.
 */
export interface IReadyProperties {
  message: string;
  collapsedHeight: number;
  style: { [key: string]: any };
}

const defaultReadyProperties: IReadyProperties = Object.freeze({
  message: 'Waiting for the game to be ready...',
  collapsedHeight: 100,
  style: {},
});

/**
 * The ReadyOverlayComponent is shown in place of the stage while the
 * integration is still starting up.
 */
export class ReadyOverlayComponent extends Component<
  { config?: IReadyProperties },
  { placesVideo: boolean }
> {
  public componentWillMount() {
    Mixer.display
      .settings()
      .pipe(untilUnmount(this))
      .subscribe(({ placesVideo }: { placesVideo: boolean }) => {
        this.setState({ ...this.state, placesVideo });
        this.readjustVideo(this.props.config);
      });
  }

  public componentWillReceiveProps(props: { config?: IReadyProperties }) {
    this.readjustVideo(props.config);
  }

  public render() {
    const props = this.resolveProperties(this.props.config);
    return (
      <div
        class="ready-overlay"
        style={css({
          height: this.state.placesVideo ? props.collapsedHeight : '100vh',
          ...props.style,
        })}
      >
        <Translate string={props.message} />
      </div>
    );
  }

  private readjustVideo(config: IReadyProperties) {
    const height = this.resolveProperties(config).collapsedHeight;
    if (this.state.placesVideo) {
      Mixer.display.moveVideo({
        bottom: height,
        left: 0,
        top: 0,
        right: 0,
      });
    }
  }

  private resolveProperties(config?: IReadyProperties): IReadyProperties {
    return { ...defaultReadyProperties, ...config };
  }
}
