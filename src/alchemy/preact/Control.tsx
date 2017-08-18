import { Component } from 'preact';
import * as Mixer from 'miix/std';

import { MControl } from '../State';
import { RuleSet } from './Style';

/**
 * PreactControl is the "primitve" control that you can extend to implement
 * your own control types. Make sure to decorate your extensions with @Control
 * to register them! Check out our built-in Joystick and Button types for
 * some examples.
 */
export abstract class PreactControl<T, C extends Mixer.IControl = Mixer.IControl>
    extends Component<{ control: MControl; style?: RuleSet }, T & C> {

    protected readonly control: MControl<C>;
    private controlUpdateListener = (ev: C) => {
        this.setState(Object.assign({}, this.state, ev));
    };

    constructor(props: { control: MControl<C>; style?: RuleSet }) {
        super(props);
        this.control = props.control;

        this.control.state.registry.getInputs(this).forEach(input => {
            Object.defineProperty(this, input.propertyName, {
                get: () => (this.props as any)[input.propertyName],
            });
        });
    }

    /**
     * @override
     */
    public componentWillMount() {
        this.setState(this.control.toObject());
        this.control.on('update', this.controlUpdateListener);
    }

    /**
     * @override
     */
    public componentWillUnmount() {
        this.control.removeListener('update', this.controlUpdateListener);
    }
}
