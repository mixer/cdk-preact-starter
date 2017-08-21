import { Component } from 'preact';
import { bind } from 'decko';
import { h } from 'preact';
import * as Mixer from 'miix/std';

import { classes, css, RuleSet } from './alchemy/Style';
import { PreactControl } from './alchemy/preact/index';

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
    private cancel: () => void = () => undefined;

    public componentWillReceiveProps() {
        this.cancel();

        const delta = this.props.cooldown - Date.now();
        if (delta < 0) {
            return;
        }

        this.setCountdown(delta);
    }

    public componentWillUnmount() {
        this.cancel();
    }

    public render() {
        return (
            <div class={classes({ mixerCooldown: true, active: this.state.ttl > 0 })}>
                <div>{this.state.ttl}s</div>
            </div>
        );
    }

    private setCountdown(delta: number) {
        // Make sure to set the timeout/interval on a leading edge of the
        // second. This keeps the timeout from "flickering" and make sure it
        // counts perfectly down to 1. (Intervals will fire later, but never
        // earlier, than the specified time.)
        let remaining = Math.floor(delta / 1000);
        const timeout = setTimeout(() => {
            const interval = setInterval(() => {
                this.setState({ ...this.state, ttl: remaining-- });
                if (remaining === 0) {
                    clearInterval(interval);
                }
            }, 1000);

            this.cancel = () => clearInterval(interval);
        }, delta % 1000);

        this.setState({ ...this.state, ttl: remaining-- });
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
export class Button extends PreactControl<{ availableSparks: number }> {
    /**
     * Size of the button.
     */
    @Mixer.Input() public dimensions: Mixer.IDimensions;

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

    public componentWillMount() {
        this.updateAvailableSparks();
        this.control.state.participant.on('update', this.updateAvailableSparks);
    }

    public componentWillUnmount() {
        this.control.state.participant.removeListener('update', this.updateAvailableSparks);
    }

    public render() {
        const css = RuleSet.fromDimensions(this.dimensions).concat(this.props.style);

        return (
            <div
                class="mixer-button"
                disabled={this.disabled}
                role="button"
                onMouseDown={this.mousedown}
                onMouseUp={this.mouseup}
                style={css.compile()}
            >
                <div class="mixer-content">{this.text}</div>
                <SparkPill cost={this.cost} available={this.state.availableSparks} />
                <CoolDown cooldown={this.cooldown} />
                <ProgressBar value={this.progress} />
            </div>
        );
    }

    @bind
    protected mousedown() {
        this.control.giveInput({ event: 'mousedown' });
    }

    @bind
    protected mouseup() {
        this.control.giveInput({ event: 'mouseup' });
    }

    @bind
    private updateAvailableSparks() {
        this.setState({
            ...this.state,
            availableSparks: this.control.state.participant.props.sparks,
        });
    }
}
