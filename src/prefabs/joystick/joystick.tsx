import * as Mixer from '@mixer/cdk-std';
import { Component, h } from 'preact';

import { gamepad } from '../../alchemy/Gamepad';
import { PreactControl } from '../../alchemy/preact/index';
import { css } from '../../alchemy/Style';
import { throttle } from '../../alchemy/Toolbox';

import './joystick.scss';

interface ISizes {
  joystick: ClientRect;
  handle: ClientRect;
  dragOffset: [number, number];
}

/**
 * capMagnitude caps the magnitude (distance) of the given x/y vector.
 */
function capMagnitude(x: number, y: number, magnitude: number = 1): [number, number] {
  const d2 = x * x + y * y;
  if (d2 < magnitude * magnitude) {
    return [x, y];
  }

  const multiplier = magnitude / Math.sqrt(d2);
  return [x * multiplier, y * multiplier];
}

/**
 * Modulo implementation where the result of always positive.
 */
function moduloPositive(a: number, b: number): number {
  return a - Math.floor(a / b) * b;
}

/**
 * Returns the shortest angle, in radians, from A to B.
 */
function shortestAngleBetween(a: number, b: number): number {
  const delta = b - a;
  return moduloPositive(delta + Math.PI, Math.PI * 2) - Math.PI;
}

export interface IHaloProps {
  angle: number;
  intensity: number;
}

/**
 * Halo is the ring outside the controls.
 */
export class Halo extends Component<IHaloProps, { transitionSpeed: number }> {
  /**
   * Number of halo rings to display.
   */
  public static rings = 3;

  /**
   * Pixels between each ring.
   */
  public static ringSpacing = 2;

  /**
   * Pixels between each ring.
   */
  public static ringWidth = 2;

  /**
   * Speed of the transition of the ring rotation, in radians per second.
   * Pi radians is equivalent to 180 degrees.
   */
  public static radialSpeed = 5;

  public componentWillReceiveProps(next: IHaloProps) {
    if (!this.props.intensity) {
      this.setState({ ...this.state, transitionSpeed: 0 });
    }

    const delta = shortestAngleBetween(next.angle, this.props.angle);
    this.setState({
      ...this.state,
      transitionSpeed: Math.abs(delta) / Halo.radialSpeed,
    });
  }

  public render() {
    const rings: JSX.Element[] = [];
    for (let i = 0; i < Halo.rings; i++) {
      const opacity =
        (i + 1) / Halo.rings * Math.max(0, Math.min(1, this.props.intensity * Halo.rings - i));
      const spacing = (i + 1) * (Halo.ringSpacing + Halo.ringWidth) * 2;
      const size = `calc(100% + ${spacing}px)`;

      rings.push(
        <div
          class="ring"
          style={css({
            opacity: String(opacity),
            width: size,
            height: size,
            marginLeft: spacing / -2,
            marginTop: (spacing + Halo.ringWidth) / -2,
          })}
        />,
      );
    }

    return (
      <div
        class="mixer-joystick-rings"
        style={css({
          transform: `rotate(${Number(this.props.angle)}rad)`,
          transition: this.state.transitionSpeed
            ? `${this.state.transitionSpeed}s transform`
            : null,
        })}
      >
        {rings}
      </div>
    );
  }
}

/**
 * Joystick is the default Interactive joystick control! It consists of the
 * main joystick itself, as well as a "halo" that can be used to show what
 * the overall audience is doing. The halo appears as a ring outside
 * the control.
 */
@Mixer.Control({
  kind: 'joystick',
  dimensions: [{ property: 'aspectRatio', minimum: 1, maximum: 1 }],
})
export class Joystick extends PreactControl {
  /**
   * Angle of the "halo" around the Joystick. Often used to show what the
   * overall viewers are doing. The angle is given in radians.
   */
  @Mixer.Input() public angle: number = 0;

  /**
   * Intensity of the halo around the button.
   */
  @Mixer.Input() public intensity: number = 0;

  /**
   * Whether input is disabled on the button.
   */
  @Mixer.Input() public disabled: boolean;

  /**
   * Gamepad joystick number to bind to. On Xbox, `0` is the left stick and
   * `1` is the right stick.
   */
  @Mixer.Input() public gamepadJoystick: number;

  /**
   * How often to send the joystick's coordinates to the server.
   */
  @Mixer.Input() public sampleRate: number = 50;

  private size: ISizes;
  private joystick: HTMLElement;
  private handle: HTMLElement;
  private gamepad = gamepad;

  private lastSampleRate: number;
  private throttledInputSender: (x: number, y: number) => void;

  public componentDidMount() {
    this.registerGamepadJoysticks();
    this.throttledInputSender = throttle(this.sampleRate, this.sendInputToInteractive);
    this.joystick.onpointerdown = ev => this.mousedown(ev);
  }

  public componentWillReceiveProps() {
    this.registerGamepadJoysticks();

    if (this.lastSampleRate !== this.sampleRate) {
      this.throttledInputSender = throttle(this.sampleRate, this.sendInputToInteractive);
    }
  }

  public componentWillUnmount() {
    this.gamepad.unregisterJoystickListener(this.moveXY);
    this.windowMouseUp();
  }

  public render() {
    return (
      <div
        role="button"
        class="mixer-joystick"
        disabled={this.props.disabled}
        ref={this.setJoystick}
      >
        <div class="arrows top" />
        <div class="arrows left" />
        <div class="handle" tabIndex={0} ref={this.setHandle} />
        <Halo angle={this.angle} intensity={this.intensity} />
      </div>
    );
  }

  /**
   * Attaches this joystick to gamepad joysticks, if it's enabled and
   * joysticks are plugged in.
   */
  protected registerGamepadJoysticks() {
    if (this.disabled) {
      this.gamepad.unregisterJoystickListener(this.moveXY);
    } else if (typeof this.gamepadJoystick === 'number') {
      this.gamepad.registerJoystickListener(this.gamepadJoystick, this.moveXY);
    }
  }

  /**
   * Sets the actual HTML element for the joystick. This is used to get
   * sizing information for moving the dot around as users drag the joystick.
   */
  protected setJoystick = (element: HTMLElement) => {
    this.joystick = element;
  };

  /**
   * Sets the HTML element for the Joystick "handle", the dot that can be
   * dragged around. This is used for getting sizing information and moving
   * it around.
   */
  protected setHandle = (element: HTMLElement) => {
    this.handle = element;
  };

  /**
   * Starts a drag on the joystick. Grabs the mouse's current position
   * relative to the handle and saves that, and attaches listeners to see
   * when the mouse moves and is released.
   */
  protected mousedown = (ev: PointerEvent) => {
    ev.preventDefault();
    if (this.disabled) {
      return;
    }

    this.calculateSizes();
    this.windowMouseMove(ev);
    this.handle.style.transition = 'none';
    window.addEventListener('pointermove', this.windowMouseMove, false);
    window.addEventListener('pointerup', this.windowMouseUp);
    window.addEventListener('pointerout', this.windowMouseOut);
    window.addEventListener('blur', this.windowMouseUp);
  };

  /**
   * Called when the mouse moves on the screen while the joystick is being
   * dragged. Does some math to get the (x, y) position to send to
   * Interactive, and calls moveXY to update the visual styling.
   */
  protected windowMouseMove = (ev: PointerEvent) => {
    ev.preventDefault();
    const radius = this.size.joystick.width / 2;
    const [x, y] = capMagnitude(
      (ev.pageX - (this.size.joystick.left + radius) - this.size.dragOffset[0]) / radius,
      (ev.pageY - (this.size.joystick.top + radius) - this.size.dragOffset[1]) / radius,
    );

    this.moveXY(x, y);
  };

  /**
   * Called when the mouse is released after dragging. Removes event listeners
   * and triggers an animation to reset the handle position.
   */
  protected windowMouseUp = () => {
    this.handle.style.transition = 'transform 300ms';
    this.handle.style.transform = 'translate(0px, 0px)';

    window.removeEventListener('pointermove', this.windowMouseMove);
    window.removeEventListener('pointerup', this.windowMouseUp);
    window.removeEventListener('pointerout', this.windowMouseOut);
    window.removeEventListener('blur', this.windowMouseUp);
    setTimeout(() => {
      if (this.handle) {
        this.handle.style.transition = 'none';
      }
    }, 300);

    this.throttledInputSender(0, 0);
  };

  protected windowMouseOut = (ev: PointerEvent) => {
    const name = (ev.target as HTMLElement).localName;
    if (name === 'body' || name === 'html') {
      this.windowMouseUp();
    }
  };

  /**
   * Called when the joystick is moved, by the mouse or the gamepad.
   */
  protected moveXY = (x: number, y: number): void => {
    if (!this.size) {
      this.calculateSizes();
    }

    const radius = this.size.joystick.width / 2;
    this.handle.style.transform = `translate(${x * radius}px, ${y * radius}px)`;
    this.throttledInputSender(x, y);
  };

  /**
   * Sends the give x/y position to Interactive. This is not called directly,
   * rather this is passed to the `throttle()` utility to which limits how
   * quickly we sample joystick input.
   */
  protected sendInputToInteractive(x: number, y: number) {
    this.control.giveInput({ event: 'move', x, y });
  }

  /**
   * Does some calculations to get the current size and position of the
   * joystick on the screen. This is used in calculations in windowMouseMove
   * to correctly position the joystick.
   */
  protected calculateSizes(ev?: PointerEvent) {
    const offset: [number, number] = [0, 0];
    const handle = this.handle.getBoundingClientRect();
    if (ev) {
      capMagnitude(
        ev.pageX - (handle.left + handle.width / 2),
        ev.pageY - (handle.top + handle.height / 2),
        handle.width / 2,
      );
    }

    this.size = {
      joystick: this.joystick.getBoundingClientRect(),
      handle,
      dragOffset: offset,
    };
  }
}
