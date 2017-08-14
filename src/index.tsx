import { bind } from 'decko';
import { h, render } from 'preact';

import { Control, Input, Scene } from './alchemy';
import { PreactControl, PreactScene, PreactStage, classes } from './alchemy/Preact';

@Control({ kind: 'button' })
export class Button extends PreactControl<{ pressed: boolean }> {
    @Input()
    public text: string;

    public render() {
        return <button onMouseDown={this.mousedown} onMouseUp={this.mouseup}>{this.text}</button>
    }

    @bind
    protected mousedown() {
        this.control.giveInput({ event: 'mousedown' })
    }

    @bind
    protected mouseup() {
        this.control.giveInput({ event: 'mousedown' })
    }
}

render(<PreactStage/>, document.querySelector('#app'));


