import { controlRegistry, IControlDescriptor, ISceneDescriptor, sceneRegistry } from './Control';
import { EventEmitter } from 'eventemitter3';
import { Component } from 'preact';
import * as mixer from 'mixer';

/**
 * The Registery is the system that manages the lifecycle of interactive
 * controls and scenes.
 */
export class State extends EventEmitter {
    /**
     * Map of scene IDs to Scene objects.
     */
    public readonly scenes: { [id: string]: MScene } = Object.create(null);

    /**
     * Map of group IDs to Group objects.
     */
    public readonly groups: { [id: string]: Group } = Object.create(null);

    /**
     * The current user connected to interactive. Note that
     */
    public readonly participant = new Participant();

    /**
     * Whether the game client is ready to accept input. The `ready` event will
     * fire when this changes.
     */
    public readonly isReady = false;

    constructor() {
        super();

        // scenes -------------------------------
        mixer.socket.on('onSceneCreate', ({ scenes }) => {
            scenes.forEach(s => {
                const scene = this.scenes[s.sceneID] = new MScene(this, s);
                this.emit('sceneCreate', scene);
            });
        });
        mixer.socket.on('onSceneUpdate', ({ scenes }) => {
            scenes.forEach(s => (<any> this.scenes[s.sceneID]).update(s));
        });
        mixer.socket.on('onSceneDelete', packet => {
            this.emit('sceneDelete', this.scenes[packet.sceneID], packet);
            this.scenes[packet.sceneID].emit('delete', packet);
            delete this.scenes[packet.sceneID];
        });

        // groups -------------------------------
        mixer.socket.on('onGroupCreate', ({ groups }) => {
            groups.forEach(g => {
                const group = this.groups[g.groupID] =
                    new Group(this.scenes[g.sceneID], g);
                this.emit('groupCreate', group);
            });
        });
        mixer.socket.on('onGroupUpdate', ({ groups }) => {
            groups.forEach(s => {
                (<any> this.groups[s.groupID]).update(s);
                if (this.participant.groupID === s.groupID) {
                    this.participant.emit('groupUpdate', s);
                }
            });
        });
        mixer.socket.on('onGroupDelete', packet => {
            this.emit('groupDelete', this.groups[packet.groupID], packet);
            this.groups[packet.groupID].emit('delete', packet);
            delete this.groups[packet.groupID];
        });

        // global state -------------------------
        mixer.socket.on('onParticipantUpdate', ev => {
            (<any> this.participant).update(ev.participants[0]);
        });
        mixer.socket.on('onReady', ev => {
            (<any> this).isReady = ev.isReady;
            this.emit('ready', ev.isReady);
        });
    }

    public on(event: 'groupCreate', handler: (group: Group) => void): this;
    public on(event: 'groupDelete', handler: (group: Group, ev: mixer.IGroupDelete) => void): this;
    public on(event: 'sceneCreate', handler: (scene: MScene) => void): this;
    public on(event: 'sceneDelete', handler: (scene: MScene, ev: mixer.ISceneDelete) => void): this;
    public on(event: 'ready', handler: (isReady: boolean) => void): this;
    public on(event: string, handler: (...args: any[]) => void): this {
        return super.on(event, handler);
    }

    public once(event: 'ready', handler: (isReady: boolean) => void): this;
    public once(event: string, handler: (...args: any[]) => void): this {
        return super.once(event, handler);
    }
}

/**
 * Group is a group of participants that is assigned to a specific scene.
 */
export class Group extends EventEmitter {
    /**
     * The scene this group is currently assigned to.
     */
    public readonly scene: MScene;

    /**
     * The state this group is assigned to.
     */
    public readonly state: State;

    constructor(scene: MScene, private props: mixer.IGroup) {
        super();
        this.scene = scene;
        this.state = scene.state;
    }

    /**
     * Gets a custom property from the group.
     */
    public get<T>(prop: string, defaultValue: T): T {
        const props: any = this.props;
        return props[prop] === undefined ? defaultValue : props[prop];
    }

    public on(event: 'delete', handler: (ev: mixer.ISceneDelete) => void): this;
    public on(event: 'update', handler: (ev: mixer.IScene) => void): this;
    public on(event: string, handler: (...args: any[]) => void): this {
        return super.on(event, handler);
    }

    private update(opts: mixer.IGroup) {
        this.props = opts;
        this.emit('update', opts);
    }
}

/**
 * The Participant is the current user connected to Interactive.
 *
 * Note that when the controls are first created, all its properties will
 * be empty; you'll want to wait on the first `update`, or the Scene's `ready`
 * event, before propogating anything.
 */
export class Participant extends EventEmitter {
    private props: mixer.IParticipant;

    /**
     * The State this participant belongs to.
     */
    public readonly state: State;

    /**
     * The Group this user belongs to.
     */
    public readonly group: Group;

    /**
     * The user's unique ID for this interactive session.
     */
    public readonly sessionID: string;

    /**
     * The users's ID on Mixer.
     */
    public readonly userID: number;

    /**
     * The user's Mixer username
     */
    public readonly username: string;

    /**
     * the users's level.
     */
    public readonly level: number;

    /**
     * Whether the game client has disabled this user's input.
     */
    public readonly disabled: boolean;

    /**
     * The group ID this participant belongs to.
     */
    public readonly groupID: string;

    /**
     * Gets a custom property from the participant.
     */
    public get<T>(prop: string, defaultValue: T): T {
        const props: any = this.props;
        return props[prop] === undefined ? defaultValue : props[prop];
    }

    public on(event: 'groupUpdate', handler: (ev: mixer.IGroup) => void): this;
    public on(event: 'update', handler: (ev: mixer.IParticipant) => void): this;
    public on(event: string, handler: (...args: any[]) => void): this {
        return super.on(event, handler);
    }

    private update(props: mixer.IParticipant) {
        const p: any = this;
        p.group = this.state.groups[props.groupID];
        p.disabled = props.disabled;
        p.groupID = props.groupID;
        this.props = props;
        this.emit('update', props);
    }
}

/**
 * Scene holds a group of controls. User groups can be assigned to a scene.
 */
export class MScene extends EventEmitter {
    /**
     * The scene's ID.
     */
    public readonly sceneID: string;

    /**
     * Map of control IDs to Control objects.
     */
    public readonly controls: { [id: string]: MControl } = Object.create(null);

    /**
     * The State this scene belongs to.
     */
    public readonly state: State;

    constructor(state: State, private props: mixer.IScene) {
        super();
        this.state = state;
        this.sceneID = props.sceneID;
        props.controls.forEach(c => {
            this.controls[c.controlID] = new MControl(this, c);
        });
    }

    /**
     * Returns the constructor class for this scene, the class decoratored
     * with `@Scene`.
     */
    public descriptor(): ISceneDescriptor {
        const specific = sceneRegistry.find(s => s.id === this.sceneID);
        if (specific) {
            return specific;
        }

        const generic = sceneRegistry.find(s => s.default);
        if (generic) {
            return generic;
        }

        throw new Error(
            `Could not find a specific scene for ${this.sceneID}, and no default ` +
            `scene was registered. Did you forget to add @Scene({ id: '${this.sceneID}' }) ` +
            `to one of your classes?`
        );
    }

    /**
     * Gets a custom property from the scene.
     */
    public get<T>(prop: string, defaultValue: T): T {
        const props: any = this.props;
        return props[prop] === undefined ? defaultValue : props[prop];
    }

    public on(event: 'delete', handler: (ev: mixer.ISceneDelete) => void): this;
    public on(event: 'update', handler: (ev: mixer.IScene) => void): this;
    public on(event: string, handler: (...args: any[]) => void): this {
        return super.on(event, handler);
    }

    private update(opts: mixer.IScene) {
        this.props = opts;
        this.emit('update', opts);
    }
}

/**
 * Control is a control type in the scene.
 */
export class MControl extends EventEmitter {
    /**
     * Unique ID of the control in the scene.
     */
    public readonly controlID: string;

    /**
     * The kind of this control.
     */
    public readonly kind: string;

    /**
     * The Scene this control belongs to.
     */
    public readonly scene: MScene;

    /**
     * The State this control belongs to.
     */
    public readonly state: State;

    constructor(scene: MScene, private props: mixer.IControl) {
        super();
        this.controlID = props.controlID;
        this.kind = props.kind;
        this.scene = scene;
    }

    /**
     * Gets a custom property from the control.
     */
    public get<T>(prop: string, defaultValue: T): T {
        const props: any = this.props;
        return props[prop] === undefined ? defaultValue : props[prop];
    }

    /**
     * Returns the constructor class for this control, the class decoratored
     * with `@Control`.
     */
    public descriptor(): IControlDescriptor {
        const descriptor = controlRegistry.find(s => s.kind === this.kind);
        if (descriptor) {
            return descriptor;
        }

        throw new Error(
            `Could not find a control kind for ${this.kind}. Did you forget to ` +
            `add @Control({ kind: '${this.kind}' }) to one of your classes?`
        );
    }

    /**
     * giveInput sends input on this control up to the Interactive service
     * and back down to the game client.
     */
    public giveInput<T extends Partial<mixer.IInput>>(input: T) {
        input.controlID = this.controlID;
        mixer.socket.call('giveInput', input);
    }

    private update(opts: mixer.IControl) {
        this.props = opts;
        this.emit('update', opts);
    }
}
