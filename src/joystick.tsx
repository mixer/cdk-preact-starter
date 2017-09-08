import * as Mixer from '@mcph/miix-std';
import { Component, h } from 'preact';

import { gamepad } from './alchemy/Gamepad';
import { PreactControl } from './alchemy/preact/index';
import { css, RuleSet } from './alchemy/Style';

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
   * Size of the button.
   */
  @Mixer.Input() public dimensions: Mixer.IDimensions;

  /**
   * Angle of the "halo" around the Joystick. Often used to show what the
   * overall viewers are doing. The angle is given in radians.
   */
  @Mixer.Input() public angle: number;

  /**
   * Intensity of the halo around the button.
   */
  @Mixer.Input() public intensity: number;

  /**
   * Whether input is disabled on the button.
   */
  @Mixer.Input() public disabled: boolean;

  /**
   * Gamepad joystick number to bind to. On Xbox, `0` is the left stick and
   * `1` is the right stick. The joystick will bind automatically if this
   * isn't set.
   */
  @Mixer.Input() public gamepadJoystick: number;

  private size: ISizes;
  private joystick: HTMLElement;
  private handle: HTMLElement;
  private gamepad = gamepad;

  public componentDidMount() {
    this.registerGamepadJoysticks();
  }

  public componentWillReceiveProps() {
    this.registerGamepadJoysticks();
  }

  public componentWillUnmount() {
    this.gamepad.unregisterJoystickListener(this.gamepadJoystickMove);
    this.windowMouseUp();
  }

  public render() {
    const rules = RuleSet.fromDimensions(this.dimensions).concat(this.props.style);

    return (
      <div
        role="button"
        class="mixer-joystick"
        disabled={this.props.disabled}
        onMouseDown={this.mousedown}
        style={rules.compile()}
        ref={this.setJoystick}
      >
        <div class="arrows top" />
        <div class="arrows left" />
        <div class="handle" ref={this.setHandle} />
        <Halo angle={this.angle} intensity={this.intensity} />
      </div>
    );
  }

  protected registerGamepadJoysticks() {
    if (this.disabled) {
      this.gamepad.unregisterJoystickListener(this.gamepadJoystickMove);
      return;
    }

    this.gamepad.registerJoystickListener({
      boundIndex: this.gamepadJoystick,
      listener: this.gamepadJoystickMove,
    });
  }

  protected setJoystick = (element: HTMLElement) => {
    this.joystick = element;
  };

  protected setHandle = (element: HTMLElement) => {
    this.handle = element;
  };

  protected mousedown = (ev: MouseEvent) => {
    ev.preventDefault();
    if (this.disabled) {
      return;
    }

    this.calculateSizes();
    this.windowMouseMove(ev);
    this.handle.style.transition = 'none';
    window.addEventListener('mousemove', this.windowMouseMove);
    window.addEventListener('mouseup', this.windowMouseUp);
  };

  protected windowMouseMove = (ev: MouseEvent) => {
    const radius = this.size.joystick.width / 2;
    const [x, y] = capMagnitude(
      (ev.pageX - (this.size.joystick.left + radius) - this.size.dragOffset[0]) / radius,
      (ev.pageY - (this.size.joystick.top + radius) - this.size.dragOffset[1]) / radius,
    );

    this.moveXY(x, y);
  };

  protected windowMouseUp = () => {
    this.handle.style.transition = 'transform 300ms';
    this.handle.style.transform = 'translate(0px, 0px)';

    window.removeEventListener('mousemove', this.windowMouseMove);
    window.removeEventListener('mouseup', this.windowMouseUp);
    setTimeout(() => (this.handle.style.transition = 'none'), 300);
  };

  protected moveXY(x: number, y: number) {
    if (!this.size) {
      this.calculateSizes();
    }

    const radius = this.size.joystick.width / 2;
    this.handle.style.transform = `translate(${x * radius}px, ${y * radius}px)`;
  }

  protected calculateSizes(ev?: MouseEvent) {
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

  protected gamepadJoystickMove = (x: number, y: number) => {
    this.moveXY(x, y);
  };
}
