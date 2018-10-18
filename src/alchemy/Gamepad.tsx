export const enum Button {
  A,
  B,
  X,
  Y,
  LeftBumper,
  RightBumper,
  LeftTrigger,
  RightTrigger,
  Back,
  Start,
  LeftStickPress,
  RightStickPress,
  DPadUp,
  DPadDown,
  DPadLeft,
  DPadRight,
}

export type JoystickListener = (x: number, y: number) => void;

/**
 * The JoystickState holds state for one gamepad joystick, along with the
 * function currently listening to it (if any).
 */
class JoystickState {
  /**
   * The "dead zone" in joysticks.
   */
  public static deadZoneSquared = 0.2 ** 2;

  private listeners: JoystickListener[] = [];
  private inDeadZone = true;

  /**
   * Moves the joystick, and notifies listeners.
   */
  public setXY(x: number, y: number) {
    if (this.listeners.length === 0) {
      return;
    }

    const dead = x * x + y * y < JoystickState.deadZoneSquared;
    if (!dead) {
      this.listeners.forEach(fn => fn(x, y));
      this.inDeadZone = false;
      return;
    }

    if (!this.inDeadZone) {
      this.inDeadZone = true;
      this.listeners.forEach(fn => fn(0, 0));
    }
  }

  /**
   * addListener adds a listener to be notified when this joystick is moved.
   */
  public addListener(listener: JoystickListener) {
    if (this.listeners.some(l => l !== listener)) {
      return;
    }

    this.listeners.push(listener);
  }

  /**
   * removeListener removes a previously added listener.
   */
  public removeListener(listener: JoystickListener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }
}

export type ButtonListener = (active: boolean) => void;

/**
 * ButtonState stores and dispatch listeners for a gamepad button. See the docs
 * on the Gamepad class for more info about the mechanic.
 */
class ButtonState {
  /**
   * How far a button has to be pressed to count as an interactive key press.
   * This is for controller left/right triggers, which count as a buttons.
   */
  public static buttonThreshold = 0.5;

  private pressed = false;
  private listeners: ButtonListener[] = [];
  private toProcess: ButtonListener[] = [];

  /**
   * Signals that the button is depressed the given amount (0 to 1).
   */
  public press(amount: number) {
    const pressed = amount > ButtonState.buttonThreshold;
    if (pressed === this.pressed) {
      return;
    }

    this.pressed = pressed;
    for (let i = 0; i < this.listeners.length; i++) {
      this.listeners[i](pressed);
    }

    for (let i = 0; i < this.toProcess.length; i++) {
      this.addListener(this.toProcess[i]);
    }

    this.toProcess = [];
  }

  /**
   * addListener adds a listener to be notified when this
   * gamepad input is pressed.
   */
  public addListener(listener: ButtonListener) {
    // If the button is pressed, wait to add the listener. This prevents
    // unmatched mouseup's and "dangling" mousedowns if a specific listener
    // game in in a previous non-specific group.
    if (this.pressed) {
      this.toProcess.push(listener);
    } else if (!this.listeners.some(l => l === listener)) {
      this.listeners.push(listener);
    }
  }

  /**
   * removeListener removes a previously added listener.
   */
  public removeListener(listener: ButtonListener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }
}

/**
 * Gamepad handles translating input from xbox controllers to buttons and
 * joysticks. A significant chunk of Mixer users watch streams on their xbox,
 * so this should be something you design for!
 *
 * By default, the gamepad can automatically bind to and "translate" input
 * to key codes (this is configured in src/index.ts) as well as translating
 * gamepad joysticks to Joystick inputs.
 *
 * Generally the idea is to auto-fill if the control designer didn't add
 * support for gamepads on their own, but to drop down and do what they say
 * if we see things are manually registered:
 *  - For joysticks, automatically bind to an available joystick if any. BUT,
 *    if a joystick index is explicitly specified, we always register the
 *    joystick on that axis.
 *  - For buttons, we'll dispatch key codes automatically EXCEPT if there's at
 *    least one control explicitly listening for that gamepad button. If so,
 *    we only send input to those buttons who explcitly asked for it.
 */
class Gamepad {
  /**
   * Maximum index of joysticks to query.
   */
  public static maxJoystickIndex = 1;

  /**
   * Maximum index of buttons to query.
   */
  public static maxButtonIndex = 15;

  private joystickStates: JoystickState[] = [];
  private buttonStates: ButtonState[] = [];
  private raf: number;

  constructor() {
    for (let i = 0; i <= Gamepad.maxJoystickIndex; i++) {
      this.joystickStates.push(new JoystickState());
    }
    for (let i = 0; i <= Gamepad.maxButtonIndex; i++) {
      this.buttonStates.push(new ButtonState());
    }
  }

  /**
   * registerButtonListener attaches a listener for a gamepad button.
   */
  public registerButtonListener(button: number, listener: ButtonListener) {
    this.buttonStates[button].addListener(listener);
    this.ensurePolling();
  }

  /**
   * registerButtonListener attaches a listener for a gamepad button.
   */
  public unregisterButtonListener(listener: (active: boolean) => void) {
    for (let i = 0; i <= Gamepad.maxButtonIndex; i++) {
      this.buttonStates[i].removeListener(listener);
    }
  }

  /**
   * Registers the function as a listener for a gamepad joystick.
   */
  public registerJoystickListener(index: number, listener: JoystickListener) {
    this.joystickStates[index].addListener(listener);
    this.ensurePolling();
  }

  /**
   * Unregisters the joystick listener.
   */
  public unregisterJoystickListener(listener: JoystickListener) {
    for (let i = 0; i <= Gamepad.maxJoystickIndex; i++) {
      this.joystickStates[i].removeListener(listener);
    }
  }

  private getGamepad() {
    const gamepads = typeof navigator.getGamepads === 'function' && navigator.getGamepads();
    return gamepads && gamepads[0];
  }

  private ensurePolling() {
    if (!this.raf && this.getGamepad()) {
      this.poll();
    }
  }

  private poll() {
    const pad = this.getGamepad();
    if (!pad) {
      this.raf = null;
      return;
    }

    for (let i = 0; i <= Gamepad.maxJoystickIndex; i++) {
      this.joystickStates[i].setXY(pad.axes[i * 2 + 0], pad.axes[i * 2 + 1]);
    }

    for (let i = 0; i <= Gamepad.maxButtonIndex; i++) {
      this.buttonStates[i].press(pad.buttons[i].value);
    }

    this.raf = requestAnimationFrame(() => this.poll());
  }
}

export const gamepad = new Gamepad();
