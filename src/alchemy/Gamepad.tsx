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

export interface IJoystickListener {
  boundIndex: number;
  listener(x: number, y: number): void;
}

/**
 * The JoystickState holds state for one gamepad joystick, along with the
 * function currently listening to it (if any).
 */
class JoystickState {
  /**
   * The "dead zone" in joysticks.
   */
  public static deadZoneSquared = 0.2 ** 2;

  public listener: IJoystickListener | undefined;
  private inDeadZone = true;

  public setXY(x: number, y: number) {
    if (!this.listener) {
      return;
    }

    const dead = x * x + y * y < JoystickState.deadZoneSquared;
    if (!dead) {
      this.listener.listener(x, y);
      this.inDeadZone = false;
      return;
    }

    if (!this.inDeadZone) {
      this.inDeadZone = true;
      this.listener.listener(0, 0);
    }
  }
}

export interface IButtonListener {
  boundButton: number;
  keyCode: number;
  listener(active: boolean): void;
}

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
  private listeners: IButtonListener[] = [];
  private toProcess: IButtonListener[] = [];

  /**
   * Signals that the button is depressed the given amount (0 to 1).
   */
  public press(amount: number) {
    const pressed = amount > ButtonState.buttonThreshold;
    if (pressed === this.pressed) {
      return;
    }

    this.pressed = pressed;
    let sawSpecific = false;
    for (let i = 0; i < this.listeners.length; i++) {
      const listener = this.listeners[i];
      const isSpecific = typeof listener.boundButton === 'number';
      if (sawSpecific && !isSpecific) {
        break;
      }

      sawSpecific = isSpecific;
      listener.listener(pressed);
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
  public addListener(listener: IButtonListener) {
    // If the button is pressed, wait to add the listener. This prevents
    // unmatched mouseup's and "dangling" mousedowns if a specific listener
    // game in in a previous non-specific group.
    if (this.pressed) {
      this.toProcess.push(listener);
    }

    this.listeners = this.listeners.filter(l => l.listener !== listener.listener);
    if (typeof listener.boundButton === 'number') {
      this.listeners.unshift(listener);
    } else {
      this.listeners.push(listener);
    }
  }

  /**
   * removeListener removes a previously added listener.
   */
  public removeListener(listener: (active: boolean) => void) {
    this.listeners = this.listeners.filter(l => l.listener !== listener);
    this.toProcess = this.toProcess.filter(l => l.listener !== listener);
  }
}

function toCharCode(s: string) {
  const char = s.toLowerCase().charCodeAt(0);
  if (char >= 97 && char < 123) {
    return char - 32; // ascii letters
  }
  if (char >= 48 && char < 58) {
    return char + 48; // numbers
  }

  return char;
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

  private joystickState: JoystickState[] = [];
  private joystickListenerQueue: IJoystickListener[] = [];
  private joystickAutobindEnabled: boolean;
  private buttonStates: { [index: number]: ButtonState } = {};
  private buttonAutoKeycode: { [keyCode: number]: number[] } = {};
  private raf: number;

  constructor() {
    for (let i = 0; i <= Gamepad.maxJoystickIndex; i++) {
      this.joystickState.push(new JoystickState());
    }
    for (let i = 0; i <= Gamepad.maxButtonIndex; i++) {
      this.buttonStates[i] = new ButtonState();
    }
  }

  /**
   * bindJoysticks sets whether we should automatically bind gamepad joysticks
   * to Interactive joysticks.
   */
  public bindJoysticks(enabled: boolean): this {
    this.joystickAutobindEnabled = enabled;
    return this;
  }

  /**
   * bindButtons sets up bindings so that the given gamepad inputs
   * automatically trigger key presses for buttons bound to the keycode.
   */
  public bindButtons(mapping: { [button: number]: string | number }) {
    Object.keys(mapping).forEach((button: keyof typeof mapping) => {
      const raw = mapping[button];
      const keyCode = typeof raw === 'number' ? raw : toCharCode(raw);

      if (this.buttonAutoKeycode[keyCode]) {
        this.buttonAutoKeycode[keyCode].push(button);
      } else {
        this.buttonAutoKeycode[keyCode] = [button];
      }
    });
  }

  /**
   * registerButtonListener attaches a listener for a gamepad button.
   */
  public registerButtonListener(listener: IButtonListener) {
    if (listener.boundButton) {
      this.buttonStates[listener.boundButton].addListener(listener);
    }
    if (this.buttonAutoKeycode[listener.keyCode]) {
      this.buttonAutoKeycode[listener.keyCode].forEach(button => {
        this.buttonStates[button].addListener(listener);
      });
    }

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
  public registerJoystickListener(listener: IJoystickListener) {
    // The general idea here is that we can have several listeners, with some
    // explicitly bound to an index. If the new listener is bound, overwrite
    // any existing listener and move it to the array of inactive listeners.
    // Otherwise, only bind it if no one is already listening to a joystick.

    if (listener.boundIndex) {
      const state = this.joystickState[listener.boundIndex];
      if (state.listener.listener === listener.listener) {
        return;
      }

      if (state) {
        this.joystickListenerQueue.unshift(state.listener);
      }

      state.listener = listener;
      this.ensurePolling();
      return;
    }

    if (!this.joystickAutobindEnabled) {
      return;
    }

    for (let i = 0; i <= Gamepad.maxJoystickIndex; i++) {
      const existing = this.joystickState[i].listener;
      if (!existing) {
        this.joystickState[i].listener = listener;
        this.ensurePolling();
        return;
      } else if (existing.listener === listener.listener) {
        return;
      }
    }

    if (!this.joystickListenerQueue.some(j => j.listener === listener.listener)) {
      this.joystickListenerQueue.push(listener);
    }
  }

  /**
   * Unregisters the joystick listener.
   */
  public unregisterJoystickListener(fn: (x: number, y: number) => void) {
    // Check through the active listeners; if we're unbinding one of them,
    // try to "promote" the next best listener from the queue. Otherwise just
    // filter the given listener out of the queue.

    for (let i = 0; i <= Gamepad.maxJoystickIndex; i++) {
      const state = this.joystickState[i];
      if (state.listener && state.listener.listener !== fn) {
        continue;
      }

      let nextUp = this.joystickListenerQueue.findIndex(l => l.boundIndex === i);
      if (nextUp === -1) {
        nextUp = this.joystickListenerQueue.findIndex(l => l.boundIndex === undefined);
      }
      if (nextUp === -1) {
        state.listener = undefined;
      } else {
        state.listener = this.joystickListenerQueue[nextUp];
        this.joystickListenerQueue.splice(nextUp, 1);
      }

      return;
    }

    this.joystickListenerQueue = this.joystickListenerQueue.filter(l => l.listener !== fn);
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
      this.joystickState[i].setXY(pad.axes[i * 2 + 0], pad.axes[i * 2 + 1]);
    }

    for (let i = 0; i < Gamepad.maxButtonIndex; i++) {
      this.buttonStates[i].press(pad.buttons[i].value);
    }

    this.raf = requestAnimationFrame(() => this.poll());
  }
}

export const gamepad = new Gamepad();
