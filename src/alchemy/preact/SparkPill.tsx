import { Component, h } from 'preact';
import { classes } from '../../alchemy/Style';

/**
 * SparkPill is the component that shows the spark cost above a button.
 */
export class SparkPill extends Component<
  { cost: number; available: number; backgroundImage: string },
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
      styles.color = 'white';
      styles.textShadow =
        '2px 0 0 black, -2px 0 0 black, 0 2px 0 black, 0 -2px 0 black, 1px 1px black,' +
        ' -1px -1px 0 black, 1px -1px 0 black, -1px 1px 0 black';
    }
    return (
      <div
        class={classes({
          mixerSparkPill: true,
          hasBg: !!this.props.backgroundImage,
          unaffordable: this.props.cost > this.props.available,
        })}
        style={styles}
        role="status"
        aria-label={`${this.props.cost} Sparks`}
      >
        {this.props.cost}{' '}
        <div role="status" style={{ 'text-indent': '-10000px' }}>
          Sparks
        </div>
      </div>
    );
  }
}
