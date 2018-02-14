import * as Mixer from '@mcph/miix-std';
import { h } from 'preact';

import { PreactControl } from '../../alchemy/preact/index';

import './controller.scss';

/**
 * Controller control.
 */
@Mixer.Control({ kind: 'controller' })
export class Controller extends PreactControl<{}> {
  private static _GAMEPAD_A_BUTTON_INDEX: number = 0;
  private static _GAMEPAD_B_BUTTON_INDEX: number = 1;
  private static _GAMEPAD_X_BUTTON_INDEX: number = 2;
  private static _GAMEPAD_Y_BUTTON_INDEX: number = 3;
  private static _GAMEPAD_SHOULDER_LEFT_BUTTON_INDEX: number = 4;
  private static _GAMEPAD_SHOULDER_RIGHT_BUTTON_INDEX: number = 5;
  private static _GAMEPAD_TRIGGER_LEFT_BUTTON_INDEX: number = 6;
  private static _GAMEPAD_TRIGGER_RIGHT_BUTTON_INDEX: number = 7;
  private static _GAMEPAD_VIEW_BUTTON_INDEX: number = 8;
  private static _GAMEPAD_MENU_BUTTON_INDEX: number = 9;
  private static _GAMEPAD_THUMBSTICK_LEFT_BUTTON_INDEX: number = 10;
  private static _GAMEPAD_THUMBSTICK_RIGHT_BUTTON_INDEX: number = 11;
  private static _GAMEPAD_DPAD_UP_BUTTON_INDEX: number = 12;
  private static _GAMEPAD_DPAD_DOWN_BUTTON_INDEX: number = 13;
  private static _GAMEPAD_DPAD_LEFT_BUTTON_INDEX: number = 14;
  private static _GAMEPAD_DPAD_RIGHT_BUTTON_INDEX: number = 15;

  // No units because the joystick is an SVG so it can
  // be resized and units are relative to overall size.
  private static _MAX_GAMEPAD_JOYSTICK_MOVEMENT: number = 26;

  private static buttonNames: string[] = [
      "gamepadA",
      "gamepadB",
      "gamepadX",
      "gamepadY",
      "gamepadShoulderLeft",
      "gamepadShoulderRight",
      "gamepadTriggerLeft",
      "gamepadTriggerRight",
      "gamepadView",
      "gamepadMenu",
      "gamepadThumbstickLeft",
      "gamepadThumbstickRight",
      "gamepadDPadUp",
      "gamepadDPadDown",
      "gamepadDPadLeft",
      "gamepadDPadRight"
  ];

  // These names are the strings that the Xbox client is looking for.
  private static buttonControlIDs: string[] = [
      "A",
      "B",
      "X",
      "Y",
      "LB",
      "RB",
      "LT",
      "RT",
      "View",
      "Menu",
      "LStick",
      "RStick",
      "DPadUp",
      "DPadDown",
      "DPadLeft",
      "DPadRight",
      "LTrigger",
      "RTrigger"
  ];

  /*
     * Size of the controller.
     */
    @Mixer.Input() public dimensions: Mixer.IDimensions;

    // Button values are typically 0 or 1, except in the case of the trigger buttons
    // which can be fractions depending on how far the user has pressed the button.
    private lastButtonState: number[] = [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
    ];

    private lastJoystickLeftState: any = {
        x: 0,
        y: 0
    };

    private lastJoystickRightState: any = {
        x: 0,
        y: 0
    };

    private _stopInput: boolean;
    private _draggingLeftStick: boolean = false;
    private _initialXDragLeftStick: number = 0;
    private _initialYDragLeftStick: number = 0;
    private _leftThumbstickHandle: HTMLElement;

    private _draggingRightStick: boolean = false;
    private _initialXDragRightStick: number = 0;
    private _initialYDragRightStick: number = 0;
    private _rightThumbstickHandle: HTMLElement;

    private _mousedownLeftTrigger = false;
    private _draggingLeftTrigger = false;
    private _initialYForDragLeftTrigger = 0; // 1 dimensional dragging - we only care about Y

    private _mousedownRightTrigger: boolean = false;
    private _draggingRightTrigger = false;
    private _initialYForDragRightTrigger: number = 0; // 1 dimensional dragging - we only care about Y

    private _sliderHeight: number = 60;
    private _sliderTopOffset: number;
    private _sliderCreated: boolean = false;

    private _pressAndHoldRightStickTimerCookie: any = null;
    private _rightStickPossibleHoldStart: boolean = false;
    private _holdingDownRightStick: boolean = false;
    private _initialRightStickXPosition: number = 0;
    private _initialRightStickYPosition: number = 0;

    private _pressAndHoldLeftStickTimerCookie: any = null;
    private _PRESS_AND_HOLD_TIMEOUT: number = 500;
    private _leftStickPossibleHoldStart: boolean = false;
    private _holdingDownLeftStick: boolean = false;
    private _initialLeftStickXPosition: number = 0;
    private _initialLeftStickYPosition: number = 0;
    private thumbstickDefaultCoordinates: any = {x: 0, y: 0};
    private _deltaMovementForCancelHoldingTimer: number = 1;

    private _gamepadTriggerLeftButton: HTMLElement;
    private _gamepadTriggerRightButton: HTMLElement;
    private _verticalMarginsForSlider: number = 20;

    private _handleLeftTriggerMoveBound: EventListener;
    private _handleRightTriggerMoveBound: EventListener;
    private _handleDocumentPointerUpBound: EventListener;
    private _handleKeyDownBound: EventListener;
    private _handleKeyboardModeClickBound: EventListener;
    private _handleContextMenuBound: EventListener;

    private _deltaForDragging: number = 1;
    private _keyboardMode: boolean = false;

    public componentDidMount() {
        this._initialize();
    }

    public componentWillUnmount() {
        this._uninitialize();
    }

    // tslint:disable-next-line:max-func-body-length
    public render() {
        let element: JSX.Element;

        const viewerTakeControlElement: JSX.Element =
        <div>
            <h1>Crowd control</h1>
            <p>Crowd control allows you to play with the broadcaster. Use the <b>Take Control</b> button to play!</p>
            <button>Take control</button>
        </div>

        const gamepadElement: JSX.Element =
        <div
            class="mixer-controller"
            onMouseDown={this._mousedown}
            onMouseUp={this._mouseup}
            role="button">
            <div class="mixer-content">
                <div class="controller-container">
                    <div class="button-row">
                        <div class="left-bumpers">
                          <div id="gamepadTriggerLeft" class="left-trigger key" tabIndex={0}>
                            <img src="./static/controller/lt.svg" alt="btn" />
                          </div>
                          <div id="gamepadShoulderLeft" class="left-bumper key" tabIndex={0}>
                              <img src="./static/controller/lb.svg" alt="btn" />
                          </div>
                        </div>
                        <div class="right-bumpers">
                          <div id="gamepadShoulderRight" class="right-bumper key" tabIndex={0}>
                              <img src="./static/controller/rb.svg" alt="btn" />
                          </div>
                          <div id="gamepadTriggerRight" class="right-trigger key" tabIndex={0}>
                              <img src="./static/controller/rt.png" alt="btn" />
                          </div>
                        </div>
                    </div>
                    <div class="button-row">
                        <div id="joystickLeft" class="joystick left thumbstick">
                          <div id="joystickLeft-handle" class="gamepad-hoverable" tabIndex={0}></div>
                        </div>
                        <div>
                          <div class="buttons">
                              <div id="gamepadY" class="button y" tabIndex={0}>
                                  <img src="./static/controller/y.svg" alt="btn" />
                              </div>
                              <div id="gamepadX" class="button x" tabIndex={0}>
                                  <img src="./static/controller/x.svg" alt="btn" />
                              </div>
                              <div id="gamepadB" class="button b" tabIndex={0}>
                                  <img src="./static/controller/b.svg" alt="btn" />
                              </div>
                              <div id="gamepadA" class="button a" tabIndex={0}>
                                  <img src="./static/controller/a.svg" alt="btn" />
                              </div>
                          </div>
                        </div>
                    </div>
                    <div class="button-row">
                        <div class="dpad-container">
                            <div id="gamepadDPadUp" class="d-pad up" tabIndex={0}>
                                <img src="./static/controller/d-pad_alt_up.svg" alt="btn" />
                            </div>
                            <div id="gamepadDPadLeft" class="d-pad left" tabIndex={0}>
                                <img src="./static/controller/d-pad_alt_left.svg" alt="btn" />
                            </div>
                            <div id="gamepadDPadRight" class="d-pad right" tabIndex={0}>
                                <img src="./static/controller/d-pad_alt_right.svg" alt="btn" />
                            </div>
                            <div id="gamepadDPadDown" class="d-pad down" tabIndex={0}>
                                <img src="./static/controller/d-pad_alt_down.svg" alt="btn" />
                            </div>
                        </div>
                        <div id="joystickRight" class="joystick right thumbstick">
                            <div id="joystickRight-handle" class="gamepad-hoverable" tabIndex={0}></div>
                        </div>
                    </div>
                    <div class="button-row">
                        <div id="gamepadView" class="view key" tabIndex={0}>
                            <img src="./static/controller/view.svg" alt="btn" />
                        </div>
                        <div id="gamepadMenu" class="menu key" tabIndex={0}>
                            <img src="./static/controller/app-menu.svg" alt="btn" />
                        </div>
                    </div>
                </div>

            </div>
        </div>

        // TODO: Base this off the participant.
        const inCrowdControlMode = true;
        if (inCrowdControlMode) {
            element = gamepadElement;
        } else {
            element = viewerTakeControlElement;
        }

        return (
            element
        );
    }

    protected _mousedown = () => {
        this.control.giveInput({ event: 'mousedown' });
    };

    protected _mouseup = () => {
        this.control.giveInput({ event: 'mouseup' });
    };

    private _runGamepadInputLoop = () => {
        if (this._stopInput) {
            return;
        }

        const gamepads = navigator.getGamepads();
        // TODO: Have UI indicate a gamepad isn't connected.
        // We only support 1 gamepad's input at a time, so if there are more than 1 connected,
        // we choose the first one.
        if (gamepads.length > 0) {
            const gamepad = gamepads[0];
            if (gamepad) {
                // Send update message for each button only if it has changed.
                const gamepadButtons = gamepad.buttons;
                // tslint:disable-next-line:one-variable-per-declaration
                for (let i = 0, len = gamepadButtons.length; i < len; i++) {
                    if (this.lastButtonState[i] !== gamepadButtons[i].value) {
                        const eventName = gamepadButtons[i].pressed ? "mousedown" : "mouseup";
                        this._sendGiveInputButtonMessage(
                          Controller.buttonNames[i],
                          eventName,
                          Controller.buttonControlIDs[i],
                          gamepadButtons[i].value
                        );
                        this.lastButtonState[i] = gamepadButtons[i].value;
                    }
                }
                // Send update message for each joystick, only if the values have changed.
                const joystickLeftX = gamepad.axes[0];
                const joystickLeftY = gamepad.axes[1];
                if (this.lastJoystickLeftState.x !== joystickLeftX ||
                    this.lastJoystickLeftState.y !== joystickLeftY) {
                    this._sendGiveInputJoystickMessage("LStick", joystickLeftX, joystickLeftY);
                    this.lastJoystickLeftState.x = joystickLeftX;
                    this.lastJoystickLeftState.y = joystickLeftY;
                }
                const joystickRightX = gamepad.axes[2];
                const joystickRightY = gamepad.axes[3];
                if (this.lastJoystickRightState.x !== joystickRightX ||
                    this.lastJoystickRightState.y !== joystickRightY) {
                    this._sendGiveInputJoystickMessage("RStick", joystickRightX, joystickRightY);
                    this.lastJoystickRightState.x = joystickRightX;
                    this.lastJoystickRightState.y = joystickRightY;
                }
            }
        }

        // Schedule the next one
        requestAnimationFrame(this._runGamepadInputLoop.bind(this));
    };

    private _sendGiveInputButtonMessage = (button: string, eventName: string, controlID: string = '', value: number = 0) => {
        this._sendGiveInputMessage({
            event: eventName,
            button: button,
            controlID: controlID,
            value: value
        });
    };

    private _sendGiveInputJoystickMessage = (joystickControlID: string, newX: number, newY: number) => {
        this._sendGiveInputMessage({
            event: "move",
            x: newX,
            y: newY,
            controlID: joystickControlID
        });
    };

    private _sendGiveInputMessage = (message: any) => {
        this.control.giveInput({
            event: "controller",
            param: message
        });
    };

    private _uninitialize = () => {
        this._stopInput = true;
        window.removeEventListener("pointermove", this._handleLeftTriggerMoveBound);
        window.removeEventListener("pointermove", this._handleRightTriggerMoveBound);
        window.removeEventListener("pointerup", this._handleDocumentPointerUpBound);

        // Attach event listeners
        window.removeEventListener("keydown", this._handleKeyDownBound);

        // Mouse clicks
        window.removeEventListener("click", this._handleKeyboardModeClickBound);
        window.removeEventListener("contextmenu", this._handleContextMenuBound);
    };

    // tslint:disable-next-line:max-func-body-length
    private _initialize = () => {
        // Hook up input handlers
        const gamepadAButton = document.getElementById("gamepadA");
        const gamepadBButton = document.getElementById("gamepadB");
        const gamepadXButton = document.getElementById("gamepadX");
        const gamepadYButton = document.getElementById("gamepadY");
        const gamepadMenuButton = document.getElementById("gamepadMenu");
        const gamepadViewButton = document.getElementById("gamepadView");
        const gamepadDPadUpButton = document.getElementById("gamepadDPadUp");
        const gamepadDPadDownButton = document.getElementById("gamepadDPadDown");
        const gamepadDPadLeftButton = document.getElementById("gamepadDPadLeft");
        const gamepadDPadRightButton = document.getElementById("gamepadDPadRight");
        const gamepadShoulderLeftButton = document.getElementById("gamepadShoulderLeft");
        const gamepadShoulderRightButton = document.getElementById("gamepadShoulderRight");
        const gamepadJoystickLeft = document.getElementById("joystickLeft");
        const gamepadJoystickRight = document.getElementById("joystickRight");
        this._leftThumbstickHandle = document.getElementById("joystickLeft-handle");
        this._rightThumbstickHandle = document.getElementById("joystickRight-handle");
        this._gamepadTriggerLeftButton = document.getElementById("gamepadTriggerLeft");
        this._gamepadTriggerRightButton = document.getElementById("gamepadTriggerRight");

        // tslint:disable-next-line:no-var-self
        const self = this;
        function handleGamepadButtonInput(buttonIndex: number, mouseDown: boolean) {
          const eventName = mouseDown ? "mousedown" : "mouseup";
            self._sendGiveInputButtonMessage(
                Controller.buttonNames[buttonIndex],
                eventName,
                Controller.buttonControlIDs[buttonIndex],
                1
            );
        }

        gamepadAButton.addEventListener("pointerdown", () => {
          handleGamepadButtonInput(Controller._GAMEPAD_A_BUTTON_INDEX, true);
        }, false);

        gamepadBButton.addEventListener("pointerdown", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_B_BUTTON_INDEX, true);
        }, false);

        gamepadXButton.addEventListener("pointerdown", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_X_BUTTON_INDEX, true);
        }, false);

        gamepadYButton.addEventListener("pointerdown", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_Y_BUTTON_INDEX, true);
        }, false);

        gamepadMenuButton.addEventListener("pointerdown", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_MENU_BUTTON_INDEX, true);
        }, false);

        gamepadViewButton.addEventListener("pointerdown", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_VIEW_BUTTON_INDEX, true);
        }, false);

        gamepadDPadUpButton.addEventListener("pointerdown", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_DPAD_UP_BUTTON_INDEX, true);
        }, false);

        gamepadDPadDownButton.addEventListener("pointerdown", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_DPAD_DOWN_BUTTON_INDEX, true);
        }, false);

        gamepadDPadLeftButton.addEventListener("pointerdown", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_DPAD_LEFT_BUTTON_INDEX, true);
        }, false);

        gamepadDPadRightButton.addEventListener("pointerdown", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_DPAD_RIGHT_BUTTON_INDEX, true);
        }, false);

        gamepadShoulderLeftButton.addEventListener("pointerdown", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_SHOULDER_LEFT_BUTTON_INDEX, true);
        }, false);

        gamepadShoulderRightButton.addEventListener("pointerdown", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_SHOULDER_RIGHT_BUTTON_INDEX, true);
        }, false);

        this._gamepadTriggerLeftButton.addEventListener("pointerdown", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_TRIGGER_LEFT_BUTTON_INDEX, true);
        }, false);

        this._gamepadTriggerRightButton.addEventListener("pointerdown", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_TRIGGER_RIGHT_BUTTON_INDEX, true);
        }, false);

        gamepadAButton.addEventListener("pointerup", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_A_BUTTON_INDEX, false);
        }, false);

        gamepadBButton.addEventListener("pointerup", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_B_BUTTON_INDEX, false);
        }, false);

        gamepadXButton.addEventListener("pointerup", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_X_BUTTON_INDEX, false);
        }, false);

        gamepadYButton.addEventListener("pointerup", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_Y_BUTTON_INDEX, false);
        }, false);

        gamepadMenuButton.addEventListener("pointerup", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_MENU_BUTTON_INDEX, false);
        }, false);

        gamepadViewButton.addEventListener("pointerup", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_VIEW_BUTTON_INDEX, false);
        }, false);

        gamepadDPadUpButton.addEventListener("pointerup", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_DPAD_UP_BUTTON_INDEX, false);
        }, false);

        gamepadDPadDownButton.addEventListener("pointerup", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_DPAD_DOWN_BUTTON_INDEX, false);
        }, false);

        gamepadDPadLeftButton.addEventListener("pointerup", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_DPAD_LEFT_BUTTON_INDEX, false);
        }, false);

        gamepadDPadRightButton.addEventListener("pointerup", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_DPAD_RIGHT_BUTTON_INDEX, false);
        }, false);

        gamepadShoulderLeftButton.addEventListener("pointerup", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_SHOULDER_LEFT_BUTTON_INDEX, false);
        }, false);
        gamepadShoulderRightButton.addEventListener("pointerup", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_SHOULDER_RIGHT_BUTTON_INDEX, false);
        }, false);

        this._gamepadTriggerLeftButton.addEventListener("pointerup", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_TRIGGER_LEFT_BUTTON_INDEX, false);
        }, false);

        this._gamepadTriggerRightButton.addEventListener("pointerup", () => {
            handleGamepadButtonInput(Controller._GAMEPAD_TRIGGER_RIGHT_BUTTON_INDEX, false);
        }, false);

        this._leftThumbstickHandle.addEventListener("pointermove", this._moveLeftThumbstickHandle.bind(this), false);
        this._leftThumbstickHandle.addEventListener("pointerdown", this._startDragLeftThumbStick.bind(this), false);
        this._leftThumbstickHandle.addEventListener("pointerup", this._endDragLeftThumbStick.bind(this), false);

        this._rightThumbstickHandle.addEventListener("pointermove", this._moveRightThumbstickHandle.bind(this), false);
        this._rightThumbstickHandle.addEventListener("pointerdown", this._startDragRightThumbStick.bind(this), false);
        this._rightThumbstickHandle.addEventListener("pointerup", this._endDragRightThumbStick.bind(this), false);

        this._gamepadTriggerLeftButton.addEventListener("pointerdown", this._handleLeftTriggerPointerDown.bind(this), false);
        this._gamepadTriggerRightButton.addEventListener("pointerdown", this._handleRightTriggerPointerDown.bind(this), false);

        // Press and hold logic
        gamepadJoystickLeft.addEventListener("pointerdown", this._handleJoystickLeftPointerDown.bind(this));
        gamepadJoystickLeft.addEventListener("pointermove", this._handleJoystickLeftPointerMove.bind(this));
        gamepadJoystickLeft.addEventListener("pointerup", this._handleJoystickLeftPointerUp.bind(this));

        gamepadJoystickRight.addEventListener("pointerdown", this._handleJoystickRightPointerDown.bind(this));
        gamepadJoystickRight.addEventListener("pointermove", this._handleJoystickRightPointerMove.bind(this));
        gamepadJoystickRight.addEventListener("pointerup", this._handleJoystickRightPointerUp.bind(this));

        this._handleLeftTriggerMoveBound = this._handleLeftTriggerMove.bind(this);
        this._handleRightTriggerMoveBound = this._handleRightTriggerMove.bind(this);
        this._handleDocumentPointerUpBound = this._handleDocumentPointerUp.bind(this);
        this._handleKeyDownBound = this._handleKeyDown.bind(this);
        this._handleKeyboardModeClickBound = this._handleKeyboardModeClick.bind(this);
        this._handleContextMenuBound = this._handleContextMenu.bind(this);

        window.addEventListener("pointermove", this._handleLeftTriggerMoveBound, false);
        window.addEventListener("pointermove", this._handleRightTriggerMoveBound, false);
        window.addEventListener("pointerup", this._handleDocumentPointerUpBound, false);

        // Attach event listeners
        window.addEventListener("keydown", this._handleKeyDownBound, false);

        // Mouse clicks
        window.addEventListener("click", this._handleKeyboardModeClickBound, false);
        window.addEventListener("contextmenu", this._handleContextMenuBound, false);

        this._runGamepadInputLoop();
    };

    private _handleLeftTriggerPointerDown = (ev: PointerEvent) => {
        this._initialYForDragLeftTrigger = ev.y;
        this._mousedownLeftTrigger = true;
    };

    private _handleRightTriggerPointerDown = (ev: PointerEvent) => {
        this._initialYForDragRightTrigger = ev.y;
        this._mousedownRightTrigger = true;
    };

    private _handleRightTriggerMove = (ev: PointerEvent) => {
        if (!this._draggingRightTrigger &&
            this._mousedownRightTrigger &&
            Math.abs(this._initialYForDragRightTrigger - ev.y) > this._deltaForDragging) {
            this._draggingRightTrigger = true;
        }

        if (this._draggingRightTrigger) {
            const triggerRect = this._gamepadTriggerRightButton.getBoundingClientRect();
            if (!this._sliderCreated) {
                // Create a custom slider visual
                const slider = document.createElement("div");
                slider.id = "interactiveCCCC-verticalslider";
                // tslint:disable-next-line:no-inner-html
                slider.innerHTML = '<div id="interactiveCCCC-mark"></div>';
                document.body.appendChild(slider);

                // Position adjacent to the trigger.
                this._sliderHeight = (triggerRect.bottom - triggerRect.top) - (this._verticalMarginsForSlider * 2);
                this._sliderTopOffset = (triggerRect.top + this._verticalMarginsForSlider);
                slider.style.position = "fixed";
                slider.style.top = `${this._sliderTopOffset}px`;
                slider.style.left = `${triggerRect.left + triggerRect.width / 2}px`;
                slider.style.height = `${this._sliderHeight}px`;
                this._sliderCreated = true;
            }

            // Now match up the mark position with the mouse
            const mark = document.getElementById("interactiveCCCC-mark");
            mark.style.top = `${ev.y}px`;

            const dragAmount = this._sliderTopOffset / this._sliderHeight;
            this._sendGiveInputButtonMessage("RTrigger", "mousedown", Controller.buttonControlIDs[17], dragAmount);
        }
    };

    private _handleDocumentPointerUp = (ev: PointerEvent) => {
        this._draggingLeftTrigger = false;
        this._mousedownLeftTrigger = false;

        this._draggingRightTrigger = false;
        this._mousedownRightTrigger = false;

        const slider = document.getElementById("interactiveCCCC-verticalslider");
        if (slider) {
            slider.parentNode.removeChild(slider);
        }
        this._sliderCreated = false;
    };

    private _handleJoystickLeftPointerDown = (ev: PointerEvent) => {
        this._leftStickPossibleHoldStart = true;
        this._initialLeftStickXPosition = ev.x;
        this._initialLeftStickYPosition = ev.y;
        this._pressAndHoldLeftStickTimerCookie = setTimeout(() => {
            if (this._leftStickPossibleHoldStart) {
                this._holdingDownLeftStick = true;
                this._sendGiveInputButtonMessage(
                    Controller.buttonNames[Controller._GAMEPAD_THUMBSTICK_LEFT_BUTTON_INDEX],
                    "mousedown"
                );
            }
        }, this._PRESS_AND_HOLD_TIMEOUT);
    };

    private _handleJoystickLeftPointerMove = (ev: PointerEvent) => {
        if (this._leftStickPossibleHoldStart &&
            Math.abs(this._initialLeftStickXPosition - ev.x) > this._deltaMovementForCancelHoldingTimer ||
            Math.abs(this._initialLeftStickYPosition - ev.y) > this._deltaMovementForCancelHoldingTimer) {
              this._leftStickPossibleHoldStart = false;
            clearTimeout(this._pressAndHoldLeftStickTimerCookie);
        }
    };

    private _handleJoystickLeftPointerUp = (ev: PointerEvent) => {
        if (this._holdingDownLeftStick) {
            this._sendGiveInputButtonMessage(
                Controller.buttonNames[Controller._GAMEPAD_THUMBSTICK_LEFT_BUTTON_INDEX],
                "mouseup",
                Controller.buttonControlIDs[Controller._GAMEPAD_THUMBSTICK_LEFT_BUTTON_INDEX],
                0
            );
        }
        this._leftStickPossibleHoldStart = false;
        this._holdingDownLeftStick = false;
    };

    private _handleJoystickRightPointerDown = (ev: PointerEvent) => {
        this._rightStickPossibleHoldStart = true;
        this._initialRightStickXPosition = ev.x;
        this._initialRightStickYPosition = ev.y;
        this._pressAndHoldRightStickTimerCookie = setTimeout(() => {
            if (this._rightStickPossibleHoldStart) {
                this._holdingDownRightStick = true;
                this._sendGiveInputButtonMessage(
                    Controller.buttonNames[Controller._GAMEPAD_THUMBSTICK_RIGHT_BUTTON_INDEX],
                    "mousedown"
                );
            }
        }, this._PRESS_AND_HOLD_TIMEOUT);
    };

    private _handleJoystickRightPointerMove = (ev: PointerEvent) => {
        if (this._rightStickPossibleHoldStart &&
            Math.abs(this._initialRightStickXPosition - ev.x) > this._deltaMovementForCancelHoldingTimer ||
            Math.abs(this._initialRightStickYPosition - ev.y) > this._deltaMovementForCancelHoldingTimer) {
            this._rightStickPossibleHoldStart = false;
            clearTimeout(this._pressAndHoldRightStickTimerCookie);
        }
    };

    private _handleJoystickRightPointerUp = () => {
        if (this._holdingDownRightStick) {
            this._sendGiveInputButtonMessage(
                Controller.buttonNames[Controller._GAMEPAD_THUMBSTICK_RIGHT_BUTTON_INDEX],
                "mouseup",
                Controller.buttonControlIDs[Controller._GAMEPAD_THUMBSTICK_RIGHT_BUTTON_INDEX],
                0
            );
        }
        this._rightStickPossibleHoldStart = false;
        this._holdingDownRightStick = false;
    };

    // Keyboard mode
    private _handleKeyboardModeClick = () => {
        if (!this._keyboardMode) {
            return;
        }
        this._sendGiveInputButtonMessage(
            Controller.buttonNames[Controller._GAMEPAD_A_BUTTON_INDEX],
            "mousedown",
            Controller.buttonControlIDs[Controller._GAMEPAD_A_BUTTON_INDEX],
            1
        );
    }

    private _handleContextMenu = (ev: Event) => {
        if (!this._keyboardMode) {
            return;
        }
        ev.preventDefault();
        this._sendGiveInputButtonMessage(
            Controller.buttonNames[Controller._GAMEPAD_TRIGGER_LEFT_BUTTON_INDEX],
            "mousedown",
            Controller.buttonControlIDs[Controller._GAMEPAD_TRIGGER_LEFT_BUTTON_INDEX],
            1
        );
        this._sendGiveInputButtonMessage(
            Controller.buttonNames[Controller._GAMEPAD_TRIGGER_LEFT_BUTTON_INDEX],
            "mouseup",
            Controller.buttonControlIDs[Controller._GAMEPAD_TRIGGER_LEFT_BUTTON_INDEX],
            1
        );
        return false;
    };

    private _handleLeftTriggerMove = (e: PointerEvent) => {
        if (!this._draggingLeftTrigger &&
            this._mousedownLeftTrigger &&
            Math.abs(this._initialYForDragLeftTrigger - e.y) > this._deltaForDragging) {
            this._draggingLeftTrigger = true;
        }

        if (this._draggingLeftTrigger) {
            const triggerRect = this._gamepadTriggerLeftButton.getBoundingClientRect();
            if (!this._sliderCreated) {
                // Create a custom slider visual
                const slider = document.createElement("div");
                slider.id = "interactiveCCCC-verticalslider";
                // tslint:disable-next-line:no-inner-html
                slider.innerHTML = '<div id="interactiveCCCC-mark"></div>';
                document.body.appendChild(slider);

                // Position adjacent to the trigger.
                // TODO: Cache this.
                this._sliderHeight = (triggerRect.bottom - triggerRect.top) - (this._verticalMarginsForSlider * 2);
                slider.style.position = "fixed";
                slider.style.top = `${triggerRect.top + this._verticalMarginsForSlider}px`;
                slider.style.left = `${triggerRect.left + triggerRect.width / 2}px`;
                slider.style.height = `${this._sliderHeight}px`;
                this._sliderCreated = true;
            }

            // Now match up the mark position with the mouse
            const mark = document.getElementById("interactiveCCCC-mark");
            mark.style.top = `${e.y}px`;

            const dragAmount = (e.y - triggerRect.top) / this._sliderHeight;
            this._sendGiveInputButtonMessage("LTrigger", "mousedown", Controller.buttonControlIDs[16], dragAmount);

        }
    };

    private _moveHandleImpl = (ev: PointerEvent, handle: HTMLElement) => {
        const leftThumbStick = handle === this._leftThumbstickHandle
        if ((leftThumbStick && !this._draggingLeftStick) ||
            (!leftThumbStick && !this._draggingRightStick)) {
            return;
        }

        let deltaX = 0;
        let deltaY = 0;
        if (leftThumbStick) {
            deltaX = ev.x - this._initialXDragLeftStick;
            deltaY = ev.y - this._initialYDragLeftStick;
        } else {
            deltaX = ev.x - this._initialXDragRightStick;
            deltaY = ev.y - this._initialYDragRightStick;
        }

        // Clamp movement to the circle
        if (deltaX > Controller._MAX_GAMEPAD_JOYSTICK_MOVEMENT) {
            deltaX = Controller._MAX_GAMEPAD_JOYSTICK_MOVEMENT;
        } else if (deltaX <= -1 * Controller._MAX_GAMEPAD_JOYSTICK_MOVEMENT) {
            deltaX = -1 * Controller._MAX_GAMEPAD_JOYSTICK_MOVEMENT;
        }
        if (deltaY > Controller._MAX_GAMEPAD_JOYSTICK_MOVEMENT) {
            deltaY = Controller._MAX_GAMEPAD_JOYSTICK_MOVEMENT;
        } else if (deltaY <= -1 * Controller._MAX_GAMEPAD_JOYSTICK_MOVEMENT) {
            deltaY = -1 * Controller._MAX_GAMEPAD_JOYSTICK_MOVEMENT;
        }

        handle.setAttribute("cx", deltaX.toString());
        handle.setAttribute("cy", deltaY.toString());

        handle.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

        const normalizedX = deltaX / Controller._MAX_GAMEPAD_JOYSTICK_MOVEMENT;
        const normalizedY = deltaY / Controller._MAX_GAMEPAD_JOYSTICK_MOVEMENT;

        const stickControlName = leftThumbStick ? "LStick" : "RStick";
        this._sendGiveInputJoystickMessage(stickControlName, normalizedX, normalizedY);
    };

    private _moveLeftThumbstickHandle = (ev: PointerEvent) => {
        this._moveHandleImpl(ev, this._leftThumbstickHandle);
    };

    private _moveRightThumbstickHandle = (ev: PointerEvent) => {
        this._moveHandleImpl(ev, this._rightThumbstickHandle);
    };

    private _endDragLeftThumbStick = () => {
        this._endDragImpl(this._leftThumbstickHandle);
    };

    private _endDragRightThumbStick = () => {
        this._endDragImpl(this._rightThumbstickHandle);
    };

    private _endDragImpl = (handle: HTMLElement) => {
        const leftStick = handle === this._leftThumbstickHandle;
        if ((leftStick && !this._draggingLeftStick) ||
            (!leftStick && !this._draggingRightStick)) {
            return;
        }

        if (leftStick) {
            this._draggingLeftStick = false;
        } else {
            this._draggingRightStick = false;
        }

        handle.setAttribute("cx", "0");
        handle.setAttribute("cy", "0");

        handle.style.transform = `translate(${this.thumbstickDefaultCoordinates.x}px, ${this.thumbstickDefaultCoordinates.y}px)`;

        // Send a 0, 0 update message when drag is finished
        const stickControlName = leftStick ? "LStick" : "RStick";
        this._sendGiveInputJoystickMessage(stickControlName, 0, 0);
    };

    private _startDragLeftThumbStick = (ev: PointerEvent) => {
        this._startDragImpl(ev, true);
    };

    private _startDragRightThumbStick = (ev: PointerEvent) => {
        this._startDragImpl(ev, false);
    };

    private _startDragImpl = (ev: PointerEvent, leftStick: boolean) => {
        if (leftStick) {
            this._draggingLeftStick = true;
            this._initialXDragLeftStick = ev.x;
            this._initialYDragLeftStick = ev.y;
        } else {
            this._draggingRightStick = true;
            this._initialXDragRightStick = ev.x;
            this._initialYDragRightStick = ev.y;
        }

        this._leftThumbstickHandle.addEventListener("pointermove", this._moveLeftThumbstickHandle.bind(this), false);
    }

    // Code to handle keyboard support
    //    "gamepadA" - spacebar (32)
    //    "gamepadB" - f (70)
    //    "gamepadX" - e (69)
    //    "gamepadY" - r (82)
    //    "gamepadShoulderLeft" - q (81)
    //    "gamepadShoulderRight" - shift (16)
    //    "gamepadTriggerLeft" - right click *
    //    "gamepadTriggerRight" - click *
    //    "gamepadView" - Alt (18)
    //    "gamepadMenu - Esc (27)
    //    "gamepadThumbstickLeft" - wasd / ctrl (87, 65, 83, 68) / 17
    //    "gamepadThumbstickRight" - mouse / c (67)
    //    "gamepadDPadUp" - arrow up (38)
    //    "gamepadDPadDown" - arrow down (40)
    //    "gamepadDPadLeft" - arrow left (37)
    //    "gamepadDPadRight" - arrow right (39)

    /* tslint:disable */
    private _handleKeyDown = (ev: KeyboardEvent) => {
        if (!this._keyboardMode) {
            return;
        }

        var buttonName = "";
        var buttonControlIDs = "";
        var leftJoystickX = -1;
        var leftJoystickY = -1;
        var rightJoystickX = -1;
        var rightJoystickY = -1;
        switch (ev.keyCode) {
            case 32: // spacebar --> A
                buttonName = Controller.buttonNames[Controller._GAMEPAD_A_BUTTON_INDEX];
                buttonName = Controller.buttonControlIDs[Controller._GAMEPAD_A_BUTTON_INDEX];
                break;
            case 70: // f --> B
                buttonName = Controller.buttonNames[Controller._GAMEPAD_B_BUTTON_INDEX];
                buttonName = Controller.buttonControlIDs[Controller._GAMEPAD_B_BUTTON_INDEX];
                break;
            case 69: // e --> X
                buttonName = Controller.buttonNames[Controller._GAMEPAD_X_BUTTON_INDEX];
                buttonName = Controller.buttonControlIDs[Controller._GAMEPAD_X_BUTTON_INDEX];
                break;
            case 82: // r --> Y
                buttonName = Controller.buttonNames[Controller._GAMEPAD_Y_BUTTON_INDEX];
                buttonName = Controller.buttonControlIDs[Controller._GAMEPAD_Y_BUTTON_INDEX];
                break;
            case 81: // q --> gamepadShoulderLeft
                buttonName = Controller.buttonNames[Controller._GAMEPAD_SHOULDER_LEFT_BUTTON_INDEX];
                buttonName = Controller.buttonControlIDs[Controller._GAMEPAD_SHOULDER_LEFT_BUTTON_INDEX];
                break;
            case 16: // q --> gamepadShoulderRight
                buttonName = Controller.buttonNames[Controller._GAMEPAD_SHOULDER_RIGHT_BUTTON_INDEX];
                buttonName = Controller.buttonControlIDs[Controller._GAMEPAD_SHOULDER_RIGHT_BUTTON_INDEX];
                break;
            case 18: // Alt --> gamepadView
                buttonName = Controller.buttonNames[Controller._GAMEPAD_VIEW_BUTTON_INDEX];
                buttonName = Controller.buttonControlIDs[Controller._GAMEPAD_VIEW_BUTTON_INDEX];
                break;
            case 27: // Esc --> gamepadMenu
                buttonName = Controller.buttonNames[Controller._GAMEPAD_MENU_BUTTON_INDEX];
                buttonName = Controller.buttonControlIDs[Controller._GAMEPAD_MENU_BUTTON_INDEX];
                break;
            case 87: // w --> gamepadThumbstickLeft (up)
                leftJoystickY = 1;
                break;
            case 65: // a --> gamepadThumbstickLeft (left)
                leftJoystickX = -1;
                break;
            case 83: // s --> gamepadThumbstickLeft (down)
                leftJoystickY = -1;
                break;
            case 68: // d --> gamepadThumbstickLeft (right)
                leftJoystickX = 1;
                break;
            case 17: // ctrl --> LeftThumbstick click
                buttonName = Controller.buttonNames[Controller._GAMEPAD_THUMBSTICK_LEFT_BUTTON_INDEX];
                buttonName = Controller.buttonControlIDs[Controller._GAMEPAD_THUMBSTICK_LEFT_BUTTON_INDEX];
                break;
            case 67: // c --> RightThumbstick click
                buttonName = Controller.buttonNames[Controller._GAMEPAD_THUMBSTICK_RIGHT_BUTTON_INDEX];
                buttonName = Controller.buttonControlIDs[Controller._GAMEPAD_THUMBSTICK_RIGHT_BUTTON_INDEX];
                break;
            case 38: // arrow up --> RightThumbstick (up)
                rightJoystickY = 1;
                break;
            case 40: // arrow down -->  RightThumbstick (down)
                rightJoystickY = -1;
                break;
            case 37: // arrow left -->  RightThumbstick (left)
                rightJoystickX = -1;
                break;
            case 39: // arrow right -->  RightThumbstick (right)
                rightJoystickX = 1;
                break;
            case 104: // numpad8 --> gamepadDPadUp
                buttonName = Controller.buttonNames[Controller._GAMEPAD_DPAD_UP_BUTTON_INDEX];
                buttonName = buttonControlIDs[Controller._GAMEPAD_DPAD_UP_BUTTON_INDEX];
                break;
            case 98: // numpad2 --> gamepadDPadDown
                buttonName = Controller.buttonNames[Controller._GAMEPAD_DPAD_DOWN_BUTTON_INDEX];
                buttonName = Controller.buttonControlIDs[Controller._GAMEPAD_DPAD_DOWN_BUTTON_INDEX];
                break;
            case 100: // numpad4 --> gamepadDPadLeft
                buttonName = Controller.buttonNames[Controller._GAMEPAD_DPAD_LEFT_BUTTON_INDEX];
                buttonName = Controller.buttonControlIDs[Controller._GAMEPAD_DPAD_LEFT_BUTTON_INDEX];
                break;
            case 102: // numpad6 --> gamepadDPadRight
                buttonName = Controller.buttonNames[Controller._GAMEPAD_DPAD_RIGHT_BUTTON_INDEX];
                buttonName = Controller.buttonControlIDs[Controller._GAMEPAD_DPAD_RIGHT_BUTTON_INDEX];
                break;
            default:
                // No-op
                break;
        };
        if (buttonName &&
            buttonControlIDs) {
            this._sendGiveInputButtonMessage(buttonName, "mousedown", buttonControlIDs, 1);
        }
        if (leftJoystickX !== -1 &&
            leftJoystickY !== -1) {
            this._sendGiveInputJoystickMessage("LStick", leftJoystickX, leftJoystickY);
        }
        if (rightJoystickX !== -1 &&
          rightJoystickY !== -1) {
          this._sendGiveInputJoystickMessage("RStick", rightJoystickX, rightJoystickY);
      }
    };
    /* tslint:enable */
// tslint:disable-next-line:max-file-line-count
}
