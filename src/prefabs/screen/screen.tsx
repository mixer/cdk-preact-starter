import * as Mixer from '@mcph/miix-std';
import { h } from 'preact';

import { gamepad } from '../../alchemy/Gamepad';
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
  cursor: {
    x: number;
    y: number;
  };
}

@Mixer.Control({ kind: 'screen' })
export class Screen extends PreactControl<any, IScreenState> {
  @Mixer.Input() public sendOnMove: boolean = false;

  @Mixer.Input() public sendMoveOnMouseDown: boolean = true;

  @Mixer.Input() public moveDebounce: number = 50;

  /**
   * Gamepad button index to bind to.
   */
  @Mixer.Input() public gamepadButton: number;

  private screenElement: HTMLDivElement;
  private cursorElement: HTMLDivElement;
  private debounceMove: any;
  private gamepad = gamepad;
  private isXbox: boolean = true;

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
    this.registerGamepadButton();
    Mixer.display.position().subscribe(this.handleVideoResize);
  }

  public componentWillReceiveProps() {
    this.registerGamepadButton();
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
        onMouseLeave={this.mouseleave}
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
      >
        <div
          name="screen-cursor"
          ref={this.setCursorReference}
          style={{
            position: 'absolute',
            width: '10px',
            height: '10px',
            backgroundColor: 'red',
            borderBottomRightRadius: '100px',
          }}
        />
      </div>
    );
  }

  protected registerGamepadButton() {
    for (let i = 0; i <= 1; i++) {
      this.gamepad.registerJoystickListener(i, (x: number, y: number) => {
        console.log('x', x, 'y', y);
      });
    }
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

  protected setCursorReference = (div: HTMLDivElement) => {
    this.cursorElement = div;
  };

  private touchstart = (evt: TouchEvent) => {
    this.setMouseDown(true);
    this.sendTouchCoords('mousedown', evt);
  };

  private touchmove = (evt: TouchEvent) => {
    this.sendTouchCoords('move', evt);
  };

  private touchend = (evt: TouchEvent) => {
    this.setMouseDown(false);
    this.sendTouchCoords('mouseup', evt);
  };

  private mousemove = (evt: MouseEvent) => {
    if (!this.sendMoveOnMouseDown || this.state.isMoving) {
      this.setCursorPosition(evt);
      clearTimeout(this.debounceMove);
      this.debounceMove = setTimeout(() => {
        this.sendMouseCoords('move', evt);
      }, this.moveDebounce);
    }
  };

  private mousedown = (evt: MouseEvent) => {
    this.setMouseDown(true);
    this.sendMouseCoords('mousedown', evt);
    this.setCursorPosition(evt);
    this.showCursor(true);
  };

  private mouseup = (evt: MouseEvent) => {
    this.setMouseDown(false);
    this.sendMouseCoords('mouseup', evt);
    this.showCursor(false);
  };

  private mouseleave = (evt: MouseEvent) => {
    if (this.state.isMoving) {
      this.mouseup(evt);
    }
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
    const el = evt.target as HTMLDivElement;
    let offsetX;
    let offsetY;
    if (el.getAttribute('name') !== this.screenElement.getAttribute('name')) {
      offsetX = el.offsetLeft + evt.offsetX;
      offsetY = el.offsetTop + evt.offsetY;
    } else {
      offsetX = evt.offsetX;
      offsetY = evt.offsetY;
    }
    let relX = offsetX / width;
    let relY = (height - offsetY) / height;
    relX = this.forceRange(relX);
    relY = this.forceRange(relY);
    this.sendCoords(event, relX, relY);
  };

  private sendCoords = (event: string, x: number, y: number) => {
    this.control.giveInput({ event, x, y });
  };

  private setMouseDown = (isDown: boolean) => {
    this.setState({
      ...this.state,
      isMoving: isDown,
    });
  };

  private setCursorPosition = (evt: MouseEvent) => {
    this.setState(
      {
        ...this.state,
        cursor: {
          x: evt.pageX,
          y: evt.pageY,
        },
      },
      () => {
        const { cursor: { x, y } } = this.state;
        this.cursorElement.style.left = `${x - 10}px`;
        this.cursorElement.style.top = `${y}px`;
      },
    );
  };

  private showCursor = (flag: boolean) => {
    this.cursorElement.style.display = flag || this.isXbox ? 'block' : 'none';
  };

  private forceRange = (value: number) => {
    if (value < 0) {
      return 0;
    } else if (value > 1) {
      return 1;
    } else {
      return value;
    }
  };
}
