import { Component } from 'preact';

/**
 * IControlOptions are passed to the @Control decorator to describe how
 * the control is rendered.
 */
export interface IControlOptions {

}

export interface IInputOptions {
    /**
     * Alias of the property as sent to the Interactive game client and sent
     * on the wire. Defaults to the property's name.
     */
    alias?: string;
}

/**
 * OnDestroy is an interface that controls who want to be notified before being
 * destroyed may implement.
 *
 * Note: this is primarily for use in non-Preact based controls. Preact controls
 * can use the built-in `componentWillUnmount` lifecycle hook instead.
 */
export interface OnDestroy {
    mxOnDestroy();
}

/**
 * OnChanges is an interface that controls who want to be notified when their
 * inputs update may implement.
 *
 * Note: this is primarily for use in non-Preact based controls. Preact controls
 * can use the built-in `componentWillReceiveProps` lifecycle hook instead.
 */
export interface OnChanges {
    mxOnChanges(changes: Changes);
}

/**
 * Changes is the interface passed into the OnChanges lifecycle hook.
 */
export interface Changes {
    [key: string]: {
        previousValue: any;
        nextValue: any;
    };
}

/**
 * @private
 */
interface InputDescriptor {
    /**
     * Property name on the class
     */
    propertyName: string;

    /**
     * Name of the property on the protocol.
     */
    remoteName: string;
}

/**
 * @private
 */
interface ControlDescriptor {
    /**
     * The component class of the control.
     */
    readonly component: new (options: any) => any;

    /**
     * A list of inputs the control takes.
     */
    readonly inputs: InputDescriptor[];
}

/**
 * registry is the global control registry populated by the @Control decorator
 * whenever it decorates a class.
 */
export const registry: ControlDescriptor[] = {};

export function Control(options: IControlOptions) {
    return (constructor: Function) => {

    };
}

export function Input(options?: IInputOptions) {
    return function (target: Function, property: string) {
        const control = registry.find(d => d.component === target);
        if (!control) {
            throw new Error(
                `@Input ${target.name}.${property} was registered, but ${target.name} ` +
                `does not have a @Control decorator!`
            );
        }

        control.inputs.push({
            propertyName: property,
            remoteName: options.alias || property,
        });
    }
}