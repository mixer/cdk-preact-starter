import { Control, Input, PreactControl, PreactScene, PreactStage, Scene } from './alchemy';
import { h, render } from 'preact';

@Control({ kind: 'button' })
export class Button extends PreactControl<{ pressed: boolean }> {
    @Input()
    public text: string;

    public render() {
        return <button onMouseDown={this.mousedown} onMouseUp={this.mouseup}>{this.text}</button>
    }

    protected mousedown() {
        this.control.giveInput({ event: 'mousedown' })
    }

    protected mouseup() {
        this.control.giveInput({ event: 'mousedown' })
    }
}

render(<PreactStage/>, document.querySelector('#app'));


