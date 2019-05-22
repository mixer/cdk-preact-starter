import * as Mixer from '@mixer/cdk-std';
import { Component, h } from 'preact';
import { classes } from '../../alchemy/Style';

function prettyTime(secs: number): string {
  const seconds: number = Math.floor(secs) % 60;
  const minutes: number = Math.floor(secs / 60) % 60;
  const hours: number = Math.floor(secs / 3600) % 24;
  const days: number = Math.floor(secs / 86400);
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
 * When the cooldown is active, Cooldown shows the
 * cooldown timer and text on the button.
 */
export class CoolDown extends Component<
  {
    cooldown: number;
    onCooldownEnd: Function;
    progress?: number;
    hideTime?: boolean;
  },
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
      <div
        key={`cooldown=${this.props.cooldown}`}
        class={classes({
          mixerCooldown: true,
          cActive: this.state.ttl >= 0,
          progress: !!this.props.progress,
        })}
        role="status"
      >
        <div
          class={classes({
            hidden: this.props.hideTime,
          })}
        >
          <div class="time">{prettyTime(this.state.ttl + 1)}</div>
        </div>
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
        this.updateTtl(-1);
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
