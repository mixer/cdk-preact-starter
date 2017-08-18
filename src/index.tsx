import { bind } from 'decko';
import { h, render } from 'preact';
import * as Mixer from 'miix/std';

import { PreactControl, PreactScene, PreactStage } from './alchemy/preact/index';

require('./style.scss');

@Mixer.Control({ kind: 'button' })
export class Button extends PreactControl<{ pressed: boolean }> {
    @Mixer.Input() public dimensions: Mixer.IDimensions;

    @Mixer.Input() public text: string;

    public render() {
        return (
            <button
                onMouseDown={this.mousedown}
                onMouseUp={this.mouseup}
                style={this.props.style.compile()}
            >
                {this.text}
            </button>
        );
    }

    @bind
    protected mousedown() {
        this.control.giveInput({ event: 'mousedown' });
    }

    @bind
    protected mouseup() {
        this.control.giveInput({ event: 'mousedown' });
    }
}

// The registry contains a list of all your custom scenes and buttons. You
// should pass them in here so that we're aware of them!
const registry = new Mixer.Registry().register(Button, PreactScene);

// Do the thing!
render(<PreactStage registry={registry} />, document.querySelector('#app'));
