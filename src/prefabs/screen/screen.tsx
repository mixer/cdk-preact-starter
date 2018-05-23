import * as Mixer from '@mixer/cdk-std';
import { h } from 'preact';

import { PreactControl } from '../../alchemy/preact';
import { classes } from '../../alchemy/Style';

import './screen.scss';

interface IPlayer {
  x: number;
  y: number;
  height: number;
  width: number;
}

interface IScreenState {
  player: IPlayer;
  isDown: boolean;
}

@Mixer.Control({ kind: 'screen' })
export class Screen extends PreactControl<any, IScreenState> {
  private static MIN_JOYSTICK_X_CLAMP: number = 0.2;
  private static MIN_JOYSTICK_Y_CLAMP: number = 0.2;
  private static buttonNames: string[] = [
    'gamepadA',
    'gamepadB',
    'gamepadX',
    'gamepadY',
    'gamepadShoulderLeft',
    'gamepadShoulderRight',
    'gamepadTriggerLeft',
    'gamepadTriggerRight',
    'gamepadView',
    'gamepadMenu',
    'gamepadThumbstickLeft',
    'gamepadThumbstickRight',
    'gamepadDPadUp',
    'gamepadDPadDown',
    'gamepadDPadLeft',
    'gamepadDPadRight',
  ];

  @Mixer.Input() public sendMoveEvents: string = 'mousedown';

  @Mixer.Input() public moveThrottle: number = 50;

  private isXbox: boolean;

  private screenElement: HTMLDivElement;
  private rippleElement: HTMLDivElement;
  private debounceMove: any;
  private xboxMinThrottle: number = 50;

  private cursorSpeed = 8;
  private cursorOffset = { y: 75, x: 5 };
  private lastPosition = { x: 0, y: 0 };

  private lastGamepadState: any = [];

  // Button values are typically 0 or 1, except in the case of the trigger buttons
  // which can be fractions depending on how far the user has pressed the button.
  private lastButtonState: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

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
    this.isXbox = (window as any).mixer.display.settingsSubj.value.platform === 'xbox';

    if (this.isXbox) {
      this.runGamepadInputLoop();
    }
  }

  public render() {
    const { controlID } = this.props;
    const {
      player: { top, left, width, height },
    } = this.state;
    return (
      <div>
        {this.isXbox && <div id="xbox-cursor" style={this.state.cursorPosition} />}
        <div
          ref={this.setRippleRef}
          class={classes({
            mixerClickVisual: true,
            mixerClickVisualEffectSubtle: true,
            mixerClickVisualClick: this.state.clicked,
          })}
        />
        <div
          ref={this.setScreenRef}
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
      </div>
    );
  }

  protected handleVideoResize = (position: any) => {
    const player = position.connectedPlayer;
    this.setState({
      ...this.state,
      player,
    });
  };

  protected setScreenRef = (div: HTMLDivElement) => {
    this.screenElement = div;
  };

  protected setRippleRef = (div: HTMLDivElement) => {
    this.rippleElement = div;
  };

  private runGamepadInputLoop = () => {
    const gamepads = navigator.getGamepads();
    for (let gi = 0; gi < gamepads.length; gi++) {
      const gamepad = gamepads[gi];

      if (gamepad) {
        if (!this.lastGamepadState.find((gp: any) => gp.gamepad === gamepad.id)) {
          this.lastGamepadState.push({
            gamepad: gamepad.id,
            rightX: 0,
            rightY: 0,
            leftX: 0,
            leftY: 0,
          });
        }

        const lastState = this.lastGamepadState.find((gp: any) => gp.gamepad === gamepad.id);
        // // Send update message for each button only if it has changed.
        const gamepadButtons = gamepad.buttons;
        // tslint:disable-next-line:one-variable-per-declaration
        for (let i = 0, len = gamepadButtons.length; i < len; i++) {
          if (this.lastButtonState[i] !== gamepadButtons[i].value) {
            const eventName = gamepadButtons[i].pressed ? 'mousedown' : 'mouseup';

            if (Screen.buttonNames[i] === 'gamepadA') {
              this.sendGamepadA(eventName);
            }

            this.lastButtonState[i] = gamepadButtons[i].value;
          }
        }

        const joystickLeftX =
          Math.abs(gamepad.axes[0]) <= Screen.MIN_JOYSTICK_X_CLAMP ? 0 : gamepad.axes[0];
        const joystickLeftY =
          Math.abs(gamepad.axes[1]) <= Screen.MIN_JOYSTICK_Y_CLAMP ? 0 : gamepad.axes[1];

        this.sendJoystickCoords(joystickLeftX, joystickLeftY);
        lastState.leftX = joystickLeftX;
        lastState.leftY = joystickLeftY;
      }
    }

    // Schedule the next one
    requestAnimationFrame(this.runGamepadInputLoop.bind(this));
  };

  private sendGamepadA(state: string) {
    state === 'mousedown' ? this.setMouseDown(true) : this.setMouseDown(false);
    const { relX, relY } = this.getXboxCursorCoordinates();
    this.sendCoords(state, relX, relY);
  }

  private sendJoystickCoords(x: number, y: number) {
    if (x === 0 && y === 0) {
      return;
    }

    this.setClampedPosition(x, y);

    this.setState({
      ...this.state,
      cursorPosition: `top: ${this.lastPosition.y}px; left: ${this.lastPosition.x}px;`,
    });

    const { relX, relY } = this.getXboxCursorCoordinates();

    clearTimeout(this.debounceMove);
    this.debounceMove = setTimeout(() => {
      this.sendCoords('move', relX, relY);
    }, this.xboxMinThrottle);
  }

  private setClampedPosition(x: number, y: number) {
    // First, recalc with speed modifier
    this.lastPosition.y += y + y * this.cursorSpeed;
    this.lastPosition.x += x + x * this.cursorSpeed;

    // Clamp positions to min/max
    // tslint:disable:max-line-length
    this.lastPosition.x =
      Math.abs(this.lastPosition.x) > this.screenElement.clientWidth - this.cursorOffset.x
        ? this.screenElement.clientWidth - this.cursorOffset.x
        : this.lastPosition.x;
    this.lastPosition.x = this.lastPosition.x < 0 ? 0 : this.lastPosition.x;
    this.lastPosition.y =
      Math.abs(this.lastPosition.y) > this.screenElement.clientHeight - this.cursorOffset.y
        ? this.screenElement.clientHeight - this.cursorOffset.y
        : this.lastPosition.y;
    this.lastPosition.y = this.lastPosition.y < 0 ? 0 : this.lastPosition.y;
  }

  private getXboxCursorCoordinates() {
    const height = this.screenElement.clientHeight;
    const width = this.screenElement.clientWidth;
    const relX = this.lastPosition.x / width;
    const relY = (height - this.lastPosition.y) / height;

    return { relX, relY };
  }

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
    if (
      this.sendMoveEvents === 'always' ||
      (this.sendMoveEvents === 'mousedown' && this.state.isDown)
    ) {
      clearTimeout(this.debounceMove);
      this.debounceMove = setTimeout(() => {
        this.sendMouseCoords('move', evt);
      }, this.moveThrottle);
    }
  };

  private mousedown = (evt: MouseEvent) => {
    this.setMouseDown(true);
    this.sendMouseCoords('mousedown', evt);
    this.applyRipple(evt);
  };

  private mouseup = (evt: MouseEvent) => {
    if (this.state.isDown) {
      this.setMouseDown(false);
      this.sendMouseCoords('mouseup', evt);
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
      isDown: isDown,
    });
  };

  private applyRipple = (evt: MouseEvent) => {
    this.setState({
      ...this.state,
      clicked: true,
    });

    this.rippleElement.style.left = `${evt.clientX - 24}px`;
    this.rippleElement.style.top = `${evt.clientY - 24}px`;

    setTimeout(() => this.setState({ ...this.state, clicked: false }), 300);
  };
}
