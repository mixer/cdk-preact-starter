import { Component, h } from 'preact';
import { classes } from '../../alchemy/Style';

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
