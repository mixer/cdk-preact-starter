import * as Mixer from '@mixer/cdk-std';
import { Component, h } from 'preact';

import { gamepad } from '../../alchemy/Gamepad';
import { CoolDown, PreactControl, SparkPill } from '../../alchemy/preact/index';
import { blockRule, classes, css } from '../../alchemy/Style';

import './button.scss';

function sanitizeCSS(styles: string) {
  let scrubbedStyle = styles;
  if (!scrubbedStyle) {
    return;
  }
  const index = scrubbedStyle.indexOf(';');
  if (index >= 0) {
    scrubbedStyle = scrubbedStyle.substr(0, index);
  }
  return scrubbedStyle;
}

/**
 * ProgressBar is the bar underneat the buttons that appears when the progress
 * is greater than 0.
 */
export class ProgressBar extends Component<{ value: number }, {}> {
  public render() {
    const width = (this.props.value || 0) - 1;
    return (
      <div
        class={classes({
          mixerProgressBar: true,
          enabled: !!this.props.value,
        })}
      >
        <div
          style={css({
            transform: `translateX(${width * 100}%)`,
          })}
        />
      </div>
    );
  }
}

/**
 * A button is the default Interactive button control! It has a couple of parts:
 *  - A cooldown with a countdown timer can be displayed over the button
 *  - Buttons can cost a certain number of sparks, and the cost is displayed
 *    over the controls.
 *  - A progress bar can be displayed underneath the button.
 *  - Buttons can be disabled.
 */
@Mixer.Control({ kind: 'button' })
export class Button extends PreactControl<{
  availableSparks: number;
  active: boolean;
  cooldown: boolean;
  keysPressed: number[];
}> {
  /**
   * Content to display on the button.
   */
  @Mixer.Input() public text: string;

  /**
   * The button's spark code.
   */
  @Mixer.Input() public cost: number;

  /**
   * A progress bar to display below the video, from 0 to 1. Setting the
   * progress to 0 will hide the progress bar.
   */
  @Mixer.Input() public progress: number;

  /**
   * A unix milliseconds timestamp until which this button should be
   * in a "cooldown" state.
   */
  @Mixer.Input() public cooldown: number;

  /**
   * Whether input is disabled on the button.
   */
  @Mixer.Input() public disabled: boolean;

  /**
   * JavaScript keycode to bind to. When that key is pressed, this button will
   * be automatically triggered.
   */
  @Mixer.Input() public keyCode: number;

  /**
   * Optional tooltip to display on the button.
   */
  @Mixer.Input() public tooltip: string;

  /**
   * Gamepad button index to bind to.
   */
  @Mixer.Input() public gamepadButton: number;

  /**
   * Background color of the button.
   */
  @Mixer.Input({ kind: Mixer.InputKind.Color })
  public backgroundColor: string;

  /**
   * Background image of the button.
   */
  @Mixer.Input({ kind: Mixer.InputKind.Url })
  public backgroundImage: string;

  /**
   * Text color for the button.
   */
  @Mixer.Input({ kind: Mixer.InputKind.Color })
  public textColor: string;

  /**
   * Text size for the button.
   */
  @Mixer.Input() public textSize: string;
  /**
   * Border color of the button.
   */
  @Mixer.Input({ kind: Mixer.InputKind.Color })
  public borderColor: string;

  /**
   * Focus color for when hovering over the button.
   */
  @Mixer.Input({ kind: Mixer.InputKind.Color })
  public focusColor: string;

  /**
   * Accent color used on the cooldown spin, and progress bar of button.
   */
  @Mixer.Input({ kind: Mixer.InputKind.Color })
  public accentColor: string;

  private gamepad = gamepad;

  public componentWillMount() {
    this.updateAvailableSparks();
    this.control.state.participant.on('update', this.updateAvailableSparks);
    this.registerGamepadButton();
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    this.setState({
      ...this.state,
      keysPressed: [],
      cooldown: this.cooldown - Date.now() > 0,
    });
  }

  public componentWillReceiveProps() {
    this.registerGamepadButton();
    this.setState({
      ...this.state,
      cooldown: this.cooldown - Date.now() > 0,
    });
  }

  public componentWillUnmount() {
    this.control.state.participant.removeListener('update', this.updateAvailableSparks);
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
  }

  public render() {
    const { controlID } = this.props;
    return (
      <div key={`control-${controlID}`} name={`control-${controlID}`}>
        {this.renderCustomStyleBlock()}
        <div
          tabIndex={0}
          class={classes({
            mixerButton: true,
            active: this.state.active,
            compact: this.isCompactHeight(),
          })}
          disabled={this.disabled || this.state.cooldown}
          role="button"
          onMouseDown={this.mousedown}
          onMouseUp={this.mouseup}
          onMouseLeave={this.mouseleave}
          title={this.tooltip || ''}
          data-tippy-arrow
        >
          <div class="state" />
          <div
            class={classes({
              mixerButtonContent: true,
              cooldown: this.state.cooldown,
            })}
          >
            <div class="mixer-button-text">{this.text}</div>
            <SparkPill cost={this.cost} available={this.state.availableSparks} />
          </div>
          <CoolDown
            cooldown={this.cooldown}
            onCooldownEnd={this.endCooldown}
            progress={this.progress}
            hideTime={this.isCompactWidth()}
          />
          <ProgressBar value={this.progress} />
        </div>
      </div>
    );
  }

  protected registerGamepadButton() {
    if (this.disabled) {
      this.gamepad.unregisterButtonListener(this.gamepadButtonPress);
    } else if (typeof this.gamepadButton === 'number') {
      this.gamepad.registerButtonListener(this.gamepadButton, this.gamepadButtonPress);
    }
  }

  protected mousedown = () => {
    if (!this.disabled && !this.state.cooldown) {
      this.control.giveInput({ event: 'mousedown' });
      this.setState({ ...this.state, active: true });
    }
  };

  protected mouseup = () => {
    if (!this.disabled && !this.state.cooldown) {
      this.control.giveInput({ event: 'mouseup' });
      this.setState({ ...this.state, active: false });
    }
  };

  protected mouseleave = () => {
    if (this.state.active) {
      this.mouseup();
    }
  };

  protected gamepadButtonPress = (pressed: boolean) => {
    if (pressed) {
      this.mousedown();
    } else {
      this.mouseup();
    }
  };

  protected keyDown = (ev: KeyboardEvent) => {
    if (
      !this.disabled &&
      !this.state.cooldown &&
      ev.keyCode === this.keyCode &&
      this.state.keysPressed.indexOf(ev.keyCode) < 0
    ) {
      this.control.giveInput({ event: 'keydown' });
      const newKeysPressed = [...this.state.keysPressed, ev.keyCode];
      this.setState({
        ...this.state,
        active: true,
        keysPressed: newKeysPressed,
      });
    }
  };

  protected keyUp = (ev: KeyboardEvent) => {
    if (
      !this.disabled &&
      !this.state.cooldown &&
      ev.keyCode === this.keyCode &&
      this.state.keysPressed.indexOf(ev.keyCode) >= 0
    ) {
      const newKeysPressed = this.state.keysPressed.filter(i => i !== ev.keyCode);
      this.control.giveInput({ event: 'keyup' });
      this.setState({
        ...this.state,
        active: false,
        keysPressed: newKeysPressed,
      });
    }
  };

  private endCooldown = () => {
    this.setState({
      ...this.state,
      cooldown: false,
    });
  };

  private updateAvailableSparks = () => {
    this.setState({
      ...this.state,
      availableSparks: this.control.state.participant.props.sparks,
    });
  };

  private isCompactHeight = (): boolean => {
    const grid = Mixer.Layout.gridLayouts[this.props.resource.grid].size;
    const gridPlacement = this.props.position.find(gplace => gplace.size === grid);
    return !(!gridPlacement || gridPlacement.height >= 6);
  };

  private isCompactWidth = (): boolean => {
    const grid = Mixer.Layout.gridLayouts[this.props.resource.grid].size;
    const gridPlacement = this.props.position.find(gplace => gplace.size === grid);
    return !(!gridPlacement || gridPlacement.width >= 8);
  };

  private renderCustomStyleBlock = () => {
    const { controlID } = this.props;
    return (
      <style>
        {// Custom border color for the button.
        blockRule(controlID, '.mixer-button', {
          border: this.borderColor ? `2px solid ${sanitizeCSS(this.borderColor)}` : null,
          backgroundColor: sanitizeCSS(this.backgroundColor),
          backgroundImage: this.backgroundImage ? `url(${this.backgroundImage})` : null,
        })}
        {// Custom border color on hover for the button.
        blockRule(controlID, '.mixer-button:hover', {
          borderColor: sanitizeCSS(this.focusColor),
        })}
        {// Custom border color on focus for the button.
        blockRule(
          controlID,
          ' .mixer-button:focus',
          {
            borderColor: sanitizeCSS(this.focusColor),
          },
          'xbox',
        )}
        {// Custom border color on active for the button.
        blockRule(controlID, '.mixer-button:active', {
          borderColor: sanitizeCSS(this.focusColor),
        })}
        {// Custom border color on active for the button.
        blockRule(controlID, '.mixer-button.active', {
          borderColor: sanitizeCSS(this.focusColor),
        })}
        {// Custom text size for the button.
        blockRule(controlID, '.mixer-button-content .mixer-button-text', {
          fontSize: sanitizeCSS(this.textSize),
          color: sanitizeCSS(this.textColor),
        })}
        {// Custom accent color for the progress bar of the button.
        blockRule(controlID, '.mixer-progress-bar > div', {
          background: sanitizeCSS(this.accentColor),
        })}
        {// Custom accent color for the cooldown spinner of the button.
        blockRule(controlID, '.mixer-cooldown > div::before', {
          borderLeftColor: sanitizeCSS(this.accentColor),
        })}
      </style>
    );
  };
}
