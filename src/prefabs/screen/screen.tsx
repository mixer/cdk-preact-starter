/*******************
 * Screen
 * *****************/
import * as Mixer from '@mcph/miix-std';
import { h } from 'preact';
import { PreactControl } from '../../alchemy/preact';

@Mixer.Control({ kind: 'screen' })
export class Screen extends PreactControl {

  @Mixer.Input() public sendOnMove: boolean = false;

  @Mixer.Input() public moveDebounce: number = 200;

  private screenElement: HTMLDivElement;
  private debounceMove: any;

  public render() {
    const { controlID } = this.props;
    return (
      <div
        ref={this.setReference}
        role="button"
        key={`control-${controlID}`}
        class="mixer-screen-container"
        name={`control-${controlID}`}
        onMouseMove={this.mousemove}
        onMouseEnter={this.mousemove}
        onMouseLeave={this.mousemove}
        onMouseDown={this.mousedown}
        onMouseUp={this.mouseup}
        style={{
          position: 'absolute',
          height: '100px',
          width: '100px',
          border: '2px solid red'
        }}
        >
      </div>
    );
  }

  protected setReference = (div: HTMLDivElement) => {
    this.screenElement = div;
  };

  private mousemove = (evt: MouseEvent) => {
    clearTimeout(this.debounceMove);
    this.debounceMove = setTimeout(() => {
      this.sendCoords('mousemove', evt);
    }, this.moveDebounce);
  }

  private mousedown = (evt: MouseEvent) => {
    this.sendCoords('mousedown', evt);
  }

  private mouseup = (evt: MouseEvent) => {
    this.sendCoords('mouseup', evt);
  }

  private sendCoords = (event: string, evt: MouseEvent) => {
    const height = this.screenElement.clientHeight;
    const width = this.screenElement.clientWidth;
    const relX = 2 * (evt.offsetX - 0) / width + -1;
    const relY = 2 * (evt.offsetY - 0) / height + -1;
    const x = relX.toFixed(2);
    const y = relY.toFixed(2);
    console.log('event', event, 'x:', x, 'y:', y);
    this.control.giveInput({ event, x, y });
  }
}
