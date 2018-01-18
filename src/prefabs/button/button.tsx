import * as Mixer from '@mcph/miix-std';
import { Component, h } from 'preact';

import { gamepad } from '../../alchemy/Gamepad';
import { PreactControl } from '../../alchemy/preact/index';
import { classes, css } from '../../alchemy/Style';

import './button.scss';

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
export class CoolDown extends Component<{ cooldown: number }, { ttl: number }> {
  public componentWillReceiveProps(nextProps: { cooldown: number }) {
    this.cancel();

    Mixer.clock.remoteToLocal(nextProps.cooldown).then(date => {
      const delta = date - Date.now();
      if (delta < 0) {
        return;
      }

      this.setCountdown(delta);
    });
  }

  public componentWillUnmount() {
    this.cancel();
  }

  public render() {
    return (
      <div class={classes({ mixerCooldown: true, active: this.state.ttl > 0 })}>
        <div>{this.state.ttl + 1}s</div>
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
        if (remaining === 0) {
          clearInterval(interval);
        }
        this.setState({ ...this.state, ttl: remaining-- });
      }, 1000);
      this.setState({ ...this.state, ttl: remaining-- });
      this.cancel = () => clearInterval(interval);
    }, delta % 1000);
    this.cancel = () => clearTimeout(timeout);
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
export class Button extends PreactControl<{ availableSparks: number; active: boolean }> {
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
   * Gamepad button index to bind to.
   */
  @Mixer.Input() public gamepadButton: number;

  private gamepad = gamepad;

  public componentWillMount() {
    this.updateAvailableSparks();
    this.control.state.participant.on('update', this.updateAvailableSparks);
    this.registerGamepadButton();
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
  }

  public componentWillReceiveProps() {
    this.registerGamepadButton();
  }

  public componentWillUnmount() {
    this.control.state.participant.removeListener('update', this.updateAvailableSparks);
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
  }

  public render() {
    return (
      <div
        tabIndex={0}
        class={classes({ mixerButton: true, active: this.state.active })}
        disabled={this.disabled}
        role="button"
        onMouseDown={this.mousedown}
        onMouseUp={this.mouseup}
      >
        <div class="mixer-content">{this.text}</div>
        <SparkPill cost={this.cost} available={this.state.availableSparks} />
        <CoolDown cooldown={this.cooldown} />
        <ProgressBar value={this.progress} />
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
    this.control.giveInput({ event: 'mousedown' });
    this.setState({ ...this.state, active: true });
  };

  protected mouseup = () => {
    this.control.giveInput({ event: 'mouseup' });
    this.setState({ ...this.state, active: false });
  };

  protected gamepadButtonPress = (pressed: boolean) => {
    if (pressed) {
      this.mousedown();
    } else {
      this.mouseup();
    }
  };

  protected keyDown = (ev: KeyboardEvent) => {
    if (ev.keyCode === this.keyCode) {
      this.control.giveInput({ event: 'keydown' })
      this.setState({ ...this.state, active: true })
    }
  };

  protected keyUp = (ev: KeyboardEvent) => {
    if (ev.keyCode === this.keyCode) {
      this.control.giveInput({ event: 'keyup' })
      this.setState({ ...this.state, active: false })
    }
  };

  private updateAvailableSparks = () => {
    this.setState({
      ...this.state,
      availableSparks: this.control.state.participant.props.sparks,
    });
  };
}
