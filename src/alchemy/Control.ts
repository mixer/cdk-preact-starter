import { Component } from 'preact';

/**
 * Dimensions exist on every Interactive control and define its display.
 */
export interface IDimensions {
    /**
     * x position (percent from 0 to 100)
     */
    x: number;

    /**
     * y position (percent from 0 to 100)
     */
    y: number;

    /**
     * control width (percent from 0 to 100)
     */
    width: number;

    /**
     * control height (percent from 0 to 100)
     */
    height: number;
}

/**
 * IControlOptions are passed to the @Control decorator to describe how
 * the control is rendered.
 */
export interface IControlOptions {
    /**
     * The kind of the control that this class should render. The default
     * kinds are "button" and "joystick".
     */
    kind: string;
}

/**
 * ISceneOptions can be passed into the @Scene decorator.
 */
export interface ISceneOptions {
    /**
     * Whether to use this scene as the handler for all scenes.
     *
     * You can override scenes by their `id` to use a different scene for a
     * certain sceneID. In cases where there isn't a specific class for a
     * sceneID, the default will be used.
     *
     * ```
     * @Scene({ default: true })
     * class MyAwesomeScene {
     *   // ...
     * }
     * ```
     */
    default?: true;

    /**
     * When specified, registers this class to handle a specific scene ID.
     * For instance, if you wanted the scene IOD `lobby` and `arena` to be
     * implemented with two different classes, you could do that with
     * something like the following:
     *
     * ```
     * @Scene({ id: 'lobby' })
     * class Lobbby {
     *   // ...
     * }
     *
     * @Scene({ id: 'arena' })
     * class Arena {
     *   // ...
     * }
     * ```
     */
    id?: string;
}

/**
 * IInputOptions are passed into the @Input decorator.
 */
export interface IInputOptions {
    /**
     * Alias of the property as sent to the Interactive game client and sent
     * on the wire. Defaults to the property's name.
     */
    alias?: string;

    /**
     * `lock` can be passed into inputs for the control dimensions (IDimensions)
     * to define bounds for how it can be manipulated in the Interactive editor.
     *  - `aspectRatio` locks a control's aspect ratio (width / height)
     *  - `width` locks with width percentage
     *  - `height` locks the height percentage
     */
    lock?: (
        { property: 'aspectRatio', minimum: number, maximum: number } |
        { property: 'width', minimum?: number, maximum?: number } |
        { property: 'height',  minimum?: number, maximum?: number }
    )[];
}

export interface ISceneDescriptor extends ISceneOptions {
    ctor: Function;
}


export interface IInputDescriptor extends IInputOptions {
    propertyName: string;
}


export interface IControlDescriptor extends IControlOptions {
    ctor: Function;
    inputs: IInputDescriptor[];
}

export const sceneRegistry: ISceneDescriptor[] = [];

/**
 * Scene is a decorator you can use to designate a class as a Scene. See
 * documentation on {@link ISceneOptions} for more info.
 */
export function Scene(options: ISceneOptions = { default: true }) {
    return (ctor: Function) => {
        const existingId = options.id && sceneRegistry.find(s => s.id === options.id);
        if (existingId) {
            throw new Error(
                `Duplicate scene IDs registered! Both ${existingId.ctor.name} and ` +
                `${ctor.name} registered themselves for scene ID ${options.id}`
            );
        }

        const existingDefault = options.default && sceneRegistry.findIndex(s => s.default);
        const descriptor: ISceneDescriptor = { ...options, ctor };
        if (existingDefault !== -1) {
            sceneRegistry[existingDefault] = descriptor;
        } else {
            sceneRegistry.push(descriptor);
        }
    };
}

export const controlRegistry: IControlDescriptor[] = [];

/**
 * Scene is a decorator you can use to designate a class as a Scene. See
 * documentation on {@link IControlOptions} for more info.
 */
export function Control(options: IControlOptions) {
    return (ctor: Function) => {
        const existing = controlRegistry.find(c => c.kind === options.kind);
        if (existing) {
            throw new Error(
                `Duplicate controls registered! Both ${existing.ctor.name} and ` +
                `${ctor.name} registered themselves for control kind ${options.kind}`
            );
        }

        controlRegistry.push({ ...options, ctor, inputs: [] });
    };
}

function registerInput(options: IInputOptions, target: object, propertyName: string) {
    const control = controlRegistry.find(c => target instanceof c.ctor);
    if (!control) {
        throw new Error(
            `Tried to register input ${target.constructor.name}.${propertyName}` +
            `but ${target.constructor.name} isn't a control! Did you forget ` +
            `a @Control() decorator?`
        );
    }

    control.inputs.push({
        alias: propertyName,
        ...options,
        propertyName,
    });
}

/**
 * Creates setters for the property on the target so that the target's
 * state is updated whenever the property is set. This is used so that
 * @Input() can work automagically in a Preact environment.
 */
function createPreactSetters<T>(target: IMaybePreact, propertyName: string) {
    let value: T = (<any> target)[propertyName];
    Object.defineProperty(target, propertyName, {
        enumerable: true,
        get() {
            return value;
        },
        set(next: T) {
            value = next;
            target.setState({ ...target.state, propertyName: next });
        }
    })
}

interface IMaybePreact {
    setState(obj: any): void;
    state: any;
}

/**
 * @Input decorates a property on a control. It makes it configurable in the
 * Interactive studio and settable for Preact components.
 */
export function Input(options: IInputOptions = {}) {
    let registered = false;

    return (target: object, propertyName: string) => {
        if (!registered) { // only register the first time the class is instantiated
            registerInput(options, target, propertyName);
            registered = true;
        }

        if (typeof (<IMaybePreact> target).setState === 'function') {
            createPreactSetters<any>(<IMaybePreact> target, propertyName);
        }
    };
}
