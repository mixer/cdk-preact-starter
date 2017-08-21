import { Component } from 'preact';
import * as Mixer from 'miix/std';

import { MControl } from '../State';
import { RuleSet } from '../Style';

type ControlProps<C> = { resource: MControl<C & Mixer.IControl>, style?: RuleSet } & C & Mixer.IControl;

/**
 * PreactControl is the "primitve" control that you can extend to implement
 * your own control types. Make sure to decorate your extensions with @Control
 * to register them! Check out our built-in Joystick and Button types for
 * some examples.
 */
export abstract class PreactControl<T = {}, C = {}> extends Component<ControlProps<C>, T> {
    protected control: MControl<C & Mixer.IControl>;

    constructor(props: ControlProps<C>) {
        super(props);
        this.control = props.resource;
        this.control.state.registry.getInputs(this).forEach(input => {
            Object.defineProperty(this, input.propertyName, {
                get: () => this.control.get(input.propertyName as keyof C),
            });
        });
    }

    /**
     * @override
     */
    public componentWillReceiveProps(nextProps: ControlProps<C>) {
        this.control = nextProps.resource;
    }
}
