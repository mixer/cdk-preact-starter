import * as Mixer from '@mcph/miix-std';
import { Component, h } from 'preact';

import { gamepad } from '../../alchemy/Gamepad';
import { PreactControl } from '../../alchemy/preact/index';
import { blockRule, classes, css } from '../../alchemy/Style';

import './button.scss';

function prettyTime(secs: number): string {
  const seconds: number = Math.floor(secs) % 60;
  const minutes: number = Math.floor(secs / 60) % 60;
  const hours: number = Math.floor(secs / 3600) % 60;
  const days: number = Math.floor(secs / 86400) % 60;
  let sTime: string = `${seconds}s`;

  if (days) {
    sTime = `${days}d ${hours}h`;
  } else if (hours) {
    sTime = `${hours}h ${minutes}m`;
  } else if (minutes) {
    sTime = `${minutes}m ${sTime}`;
  }

  return sTime;
}

/**
 * SparkPill is the component that shows the spark cost above a button.
 */
export class SparkPill extends Component<{ cost: number; available: number }, {}> {
  public render() {
    if (!this.props.cost) {
      return;
    }

    return (
      <div
        class={classes({
          mixerSparkPill: true,
          unaffordable: this.props.cost > this.props.available,
        })}
      >
        {this.props.cost}
      </div>
    );
  }
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
 * When the cooldown is active, Cooldown shows the
 * cooldown timer and text on the button.
 */
export class CoolDown extends Component<
  { cooldown: number; onCooldownEnd: Function },
  { ttl: number }
> {
  public componentDidMount() {
    this.handleCooldown(this.props.cooldown);
  }

  public componentWillReceiveProps(nextProps: { cooldown: number }) {
    this.handleCooldown(nextProps.cooldown);
  }

  public componentWillUnmount() {
    this.cancel();
  }

  public render() {
    return (
      <div class={classes({ mixerCooldown: true, cActive: this.state.ttl >= 0 })}>
        <div>{prettyTime(this.state.ttl + 1)}</div>
      </div>
    );
  }

  private cancel: () => void = () => undefined;

  private setCountdown(delta: number) {
    // Make sure to set the timeout/interval on a leading edge of the
    // second. This keeps the timeout from "flickering" and make sure it
    // counts perfectly down to 1. (Intervals will fire later, but never
    // earlier, than the specified time.)
    let remaining = Math.floor(delta / 1000);
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (remaining < 0) {
          clearInterval(interval);
        }
        this.updateTtl(remaining--);
      }, 1000);
      this.updateTtl(remaining--);
      this.cancel = () => clearInterval(interval);
    }, delta % 1000);
    this.updateTtl(remaining--);
    this.cancel = () => clearTimeout(timeout);
  }

  private handleCooldown(cooldown: number) {
    this.cancel();
    Mixer.clock.remoteToLocal(cooldown).then(date => {
      const delta = date - Date.now();
      if (delta < 0) {
        return;
      }

      this.setCountdown(delta);
    });
  }

  private updateTtl(ttl: number) {
    if (ttl !== this.state.ttl) {
      this.setState(
        {
          ...this.state,
          ttl,
        },
        () => {
          if (this.state.ttl === -1) {
            this.props.onCooldownEnd();
          }
        },
      );
    }
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
          class={classes({ mixerButton: true, active: this.state.active })}
          disabled={this.disabled || this.state.cooldown}
          role="button"
          onMouseDown={this.mousedown}
          onMouseUp={this.mouseup}
          onMouseLeave={this.mouseleave}
        >
          <div class={classes({ mixerButtonContent: true, cooldown: this.state.cooldown })}>
            {this.text}
          </div>
          <SparkPill cost={this.cost} available={this.state.availableSparks} />
          <CoolDown cooldown={this.cooldown} onCooldownEnd={this.endCooldown} />
          <ProgressBar value={this.progress} />
          {this.tooltip ? <div class="mixer-button-tooltip">{this.tooltip}</div> : undefined}
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
      this.setState({ ...this.state, active: true, keysPressed: newKeysPressed });
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
      this.setState({ ...this.state, active: false, keysPressed: newKeysPressed });
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

  private renderCustomStyleBlock = () => {
    const { controlID } = this.props;
    return (
      <style>
        {// Custom border color for the button.
        blockRule(controlID, '.mixer-button', {
          borderColor: this.borderColor,
          backgroundColor: this.backgroundColor,
          backgroundImage: this.backgroundImage ? `url(${this.backgroundImage})` : null,
        })}
        {// Custom border color on hover for the button.
        blockRule(controlID, '.mixer-button:hover', {
          borderColor: this.focusColor,
        })}
        {// Custom border color on focus for the button.
        blockRule(controlID, '.mixer-button:focus', {
          borderColor: this.focusColor,
        })}
        {// Custom border color on active for the button.
        blockRule(controlID, '.mixer-button:active', {
          borderColor: this.focusColor,
        })}
        {// Custom border color on active for the button.
        blockRule(controlID, '.mixer-button.active', {
          borderColor: this.focusColor,
        })}
        {// Custom text size for the button.
        blockRule(controlID, '.mixer-button-content', {
          fontSize: this.textSize,
          color: this.textColor,
        })}
        {// Custom accent color for the progress bar of the button.
        blockRule(controlID, '.mixer-progress-bar > div', {
          background: this.accentColor,
        })}
        {// Custom accent color for the cooldown spinner of the button.
        blockRule(controlID, '.mixer-cooldown > div::before', {
          borderLeftColor: this.accentColor,
        })}
      </style>
    );
  };
}
