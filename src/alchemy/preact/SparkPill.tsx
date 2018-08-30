import { Component, h } from 'preact';
import { classes } from '../../alchemy/Style';

/**
 * SparkPill is the component that shows the spark cost above a button.
 */
export class SparkPill extends Component<
  { cost: number; available: number; backgroundImage: string; backgroundColor: string },
  {}
> {
  public render() {
    if (!this.props.cost) {
      return;
    }
    const styles: any = {
      backgroundColor: null,
    };

    if (this.props.backgroundImage) {
      styles.backgroundColor = this.props.backgroundColor || 'rgb(41, 47, 72)';
    }
    return (
      <div
        class={classes({
          mixerSparkPill: true,
          hasBg: !!this.props.backgroundImage,
          unaffordable: this.props.cost > this.props.available,
        })}
        style={styles}
      >
        {this.props.cost}
      </div>
    );
  }
}
