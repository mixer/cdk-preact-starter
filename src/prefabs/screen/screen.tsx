/*******************
 * Screen
 * *****************/
import * as Mixer from '@mcph/miix-std';
import { h } from 'preact';
import { PreactControl } from '../../alchemy/preact';

interface IPlayer {
  x: number;
  y: number;
  height: number;
  width: number;
}

interface IScreenState {
  player: IPlayer;
  isMoving: boolean;
}

@Mixer.Control({ kind: 'screen' })
export class Screen extends PreactControl<any, IScreenState> {
  @Mixer.Input() public sendOnMove: boolean = false;

  @Mixer.Input() public sendMoveOnMouseDown: boolean = true;

  @Mixer.Input() public moveDebounce: number = 50;

  private screenElement: HTMLDivElement;
  private debounceMove: any;

  constructor(props: any) {
    super(props);
    this.state = {
      player: {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
      },
    };
  }

  public componentWillMount() {
    Mixer.display.position().subscribe(this.handleVideoResize);
  }

  public render() {
    const { controlID } = this.props;
    const { player: { top, left, width, height } } = this.state;
    return (
      <div
        ref={this.setReference}
        role="button"
        key={`control-${controlID}`}
        class="mixer-screen-container"
        name={`control-${controlID}`}
        onMouseMove={this.mousemove}
        onMouseEnter={this.mousemove}
        onMouseLeave={this.mouseup}
        onMouseDown={this.mousedown}
        onMouseUp={this.mouseup}
        onTouchStart={this.touchstart}
        onTouchMove={this.touchmove}
        onTouchEnd={this.touchend}
        onTouchCancel={this.touchend}
        style={{
          position: 'absolute',
          top,
          left,
          width,
          height,
        }}
      />
    );
  }

  protected handleVideoResize = (position: any) => {
    const player = position.connectedPlayer;
    this.setState({
      ...this.state,
      player,
    });
  };

  protected setReference = (div: HTMLDivElement) => {
    this.screenElement = div;
  };

  private touchstart = (evt: TouchEvent) => {
    this.setMouseDown(true);
    this.sendTouchCoords('mousedown', evt);
  };

  private touchmove = (evt: TouchEvent) => {
    this.sendTouchCoords('mousemove', evt);
  };

  private touchend = (evt: TouchEvent) => {
    this.setMouseDown(false);
    this.sendTouchCoords('mouseup', evt);
  };

  private mousemove = (evt: MouseEvent) => {
    if (!this.sendMoveOnMouseDown || this.state.isMoving) {
      clearTimeout(this.debounceMove);
      this.debounceMove = setTimeout(() => {
        this.sendMouseCoords('mousemove', evt);
      }, this.moveDebounce);
    }
  };

  private mousedown = (evt: MouseEvent) => {
    this.setMouseDown(true);
    this.sendMouseCoords('mousedown', evt);
  };

  private mouseup = (evt: MouseEvent) => {
    this.setMouseDown(false);
    this.sendMouseCoords('mouseup', evt);
  };

  private sendTouchCoords = (event: string, evt: TouchEvent) => {
    const height = this.screenElement.clientHeight;
    const width = this.screenElement.clientWidth;
    let x;
    let y;
    if (event === 'mouseup') {
      x = width - evt.changedTouches[0].pageX;
      y = (height - evt.changedTouches[0].pageY) / height;
    } else {
      x = width - evt.targetTouches[0].pageX;
      y = (height - evt.targetTouches[0].pageY) / height;
    }
    this.sendCoords(event, x, y);
  };

  private sendMouseCoords = (event: string, evt: MouseEvent) => {
    const height = this.screenElement.clientHeight;
    const width = this.screenElement.clientWidth;
    const relX = evt.offsetX / width;
    const relY = (height - evt.offsetY) / height;
    this.sendCoords(event, relX, relY);
  };

  private sendCoords = (event: string, x: number, y: number) => {
    this.control.giveInput({ event, x, y });
  };

  private setMouseDown = (isDown: boolean) => {
    this.setState({
      ...this.state,
      isMoving: isDown
    });
  };
}
