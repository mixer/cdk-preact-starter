import * as Mixer from '@mcph/miix-std';
import { Component } from 'preact';
import { log } from '../Log';

import { MControl } from '../State';

type ControlProps<C> = { resource: MControl<C & Mixer.IControl> } & C & Mixer.IControl;

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
        get: () => this.control.get(input.propertyName as keyof C, input.defaultValue),
        set: value => {
          // Define a setter and warn if people use it. For default values,
          // TypeScript will try setting them, so don't warn then.
          if (value !== input.defaultValue) {
            log.warn(
              `Tried to set ${input}, but you cannot set inputs from the frontend. Use your ` +
                `game client instead, or store temporary data in your component's Preact state.`,
            );
          }
        },
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
