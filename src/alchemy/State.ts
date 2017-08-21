import { EventEmitter } from 'eventemitter3';
import * as Mixer from 'miix/std';

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
    public readonly participant = new Participant(this);

    /**
     * Whether the game client is ready to accept input. The `ready` event will
     * fire when this changes.
     */
    public readonly isReady = false;

    constructor(public readonly registry: Mixer.Registry) {
        super();

        // scenes -------------------------------
        Mixer.socket.on('onSceneCreate', ({ scenes }) => {
            scenes.forEach(s => {
                const scene = (this.scenes[s.sceneID] = new MScene(this, s));
                this.emit('sceneCreate', scene);
            });
        });
        Mixer.socket.on('onSceneUpdate', ({ scenes }) => {
            scenes.forEach(s => (<any>this.scenes[s.sceneID]).update(s));
        });
        Mixer.socket.on('onSceneDelete', packet => {
            this.emit('sceneDelete', this.scenes[packet.sceneID], packet);
            this.scenes[packet.sceneID].emit('delete', packet);
            delete this.scenes[packet.sceneID];
        });

        // groups -------------------------------
        Mixer.socket.on('onGroupCreate', ({ groups }) => {
            groups.forEach(g => {
                const group = (this.groups[g.groupID] = new Group(this.scenes[g.sceneID], g));
                this.emit('groupCreate', group);
            });
        });
        Mixer.socket.on('onGroupUpdate', ({ groups }) => {
            groups.forEach(s => {
                (<any>this.groups[s.groupID]).update(s);
                if (this.participant.props.groupID === s.groupID) {
                    this.participant.emit('groupUpdate', s);
                }
            });
        });
        Mixer.socket.on('onGroupDelete', packet => {
            this.emit('groupDelete', this.groups[packet.groupID], packet);
            this.groups[packet.groupID].emit('delete', packet);
            delete this.groups[packet.groupID];
        });

        // global state -------------------------
        Mixer.socket.on('onParticipantUpdate', ev => {
            (<any>this.participant).update(ev.participants[0]);
        });
        Mixer.socket.on('onParticipantJoin', ev => {
            (<any>this.participant).update(ev.participants[0]);
        });
        Mixer.socket.on('onReady', ev => {
            (<any>this).isReady = ev.isReady;
            this.emit('ready', ev.isReady);
        });

        Mixer.isLoaded();
    }

    public on(event: 'groupCreate', handler: (group: Group) => void): this;
    public on(event: 'groupDelete', handler: (group: Group, ev: Mixer.IGroupDelete) => void): this;
    public on(event: 'sceneCreate', handler: (scene: MScene) => void): this;
    public on(event: 'sceneDelete', handler: (scene: MScene, ev: Mixer.ISceneDelete) => void): this;
    public on(event: 'ready', handler: (isReady: boolean) => void): this;
    public on(event: string, handler: (...args: any[]) => void): this {
        return super.on(event, handler);
    }

    public once(event: 'ready', handler: (isReady: boolean) => void): this;
    public once(event: string, handler: (...args: any[]) => void): this {
        return super.once(event, handler);
    }
}

export abstract class Resource<T> extends EventEmitter {
    /**
     * The resource's underlying data properties.
     */
    public props: T;

    /**
     * Gets a custom property defined on the resource.
     */
    public get<K extends keyof T>(prop: K, defaultValue?: T[K]): T[K] {
        const props: any = this.props;
        return props[prop] === undefined ? defaultValue : props[prop];
    }

    /**
     * Returns the resource's plain properties.
     */
    public toObject(): T {
        return this.props;
    }

    /**
     * Updates the component's properties and emites an update event.
     */
    protected update(opts: T) {
        this.props = opts;
        this.emit('update', opts);
    }
}

/**
 * Group is a group of participants that is assigned to a specific scene.
 */
export class Group<T extends Mixer.IGroup = Mixer.IGroup> extends Resource<T> {
    /**
     * The scene this group is currently assigned to.
     */
    public readonly scene: MScene;

    /**
     * The state this group is assigned to.
     */
    public readonly state: State;

    /**
     * The ID of the assigned scene.
     */
    public get sceneID() {
        return this.props.sceneID;
    }

    /**
     * The ID of the assigned scene.
     */
    public get groupID() {
        return this.props.groupID;
    }

    constructor(scene: MScene, props: T) {
        super();
        this.scene = scene;
        this.state = scene.state;
        this.update(props);
    }

    /**
     * Gets a custom property from the group.
     */
    public get<T>(prop: string, defaultValue: T): T {
        const props: any = this.props;
        return props[prop] === undefined ? defaultValue : props[prop];
    }

    public on(event: 'delete', handler: (ev: Mixer.ISceneDelete) => void): this;
    public on(event: 'update', handler: (ev: T) => void): this;
    public on(event: string, handler: (...args: any[]) => void): this {
        return super.on(event, handler);
    }
}

/**
 * The Participant is the current user connected to Interactive.
 *
 * Note that when the controls are first created, all its properties will
 * be empty; you'll want to wait on the first `update`, or the Scene's `ready`
 * event, before propogating anything.
 */
export class Participant<T extends Mixer.IParticipant = Mixer.IParticipant> extends Resource<T> {
    /**
     * The State this participant belongs to.
     */
    public readonly state: State;

    /**
     * The Group this user belongs to.
     */
    public readonly group: Group;

    constructor(state: State) {
        super();
        this.state = state;
    }

    public on(event: 'groupUpdate', handler: (ev: Mixer.IGroup) => void): this;
    public on(event: 'update', handler: (ev: T) => void): this;
    public on(event: string, handler: (...args: any[]) => void): this {
        return super.on(event, handler);
    }

    protected update(props: T) {
        (<any>this).group = this.state.groups[props.groupID];
        super.update(props);
    }
}

/**
 * Scene holds a group of controls. User groups can be assigned to a scene.
 */
export class MScene<T extends Mixer.IScene = Mixer.IScene> extends Resource<T> {
    /**
     * Map of control IDs to Control objects.
     */
    public readonly controls: { [id: string]: MControl } = Object.create(null);

    /**
     * The State this scene belongs to.
     */
    public readonly state: State;

    constructor(state: State, props: T) {
        super();
        this.state = state;
        props.controls.forEach(c => {
            this.controls[c.controlID] = new MControl(this, c);
        });
        this.update(props);
    }

    /**
     * Returns the constructor class for this scene, the class decoratored
     * with `@Scene`.
     */
    public descriptor(): Mixer.ISceneDescriptor {
        return this.state.registry.getScene(this.props.sceneID);
    }

    /**
     * Returns an array of controls on the scene.
     */
    public listControls(): MControl[] {
        return Object.keys(this.controls).map(k => this.controls[k]);
    }

    public on(event: 'delete', handler: (ev: Mixer.ISceneDelete) => void): this;
    public on(event: 'update', handler: (ev: T) => void): this;
    public on(event: string, handler: (...args: any[]) => void): this {
        return super.on(event, handler);
    }
}

/**
 * Control is a control type in the scene.
 */
export class MControl<T extends Mixer.IControl = Mixer.IControl> extends Resource<T> {
    /**
     * The Scene this control belongs to.
     */
    public readonly scene: MScene;

    /**
     * The State this control belongs to.
     */
    public readonly state: State;

    constructor(scene: MScene, props: T) {
        super();
        this.scene = scene;
        this.state = scene.state;
        this.update(props);
    }

    /**
     * Returns the constructor descriptor for this control, including the class
     * decoratored with `@Control`.
     */
    public descriptor(): Mixer.IControlDescriptor {
        return this.state.registry.getControl(this.props.kind);
    }

    /**
     * giveInput sends input on this control up to the Interactive service
     * and back down to the game client.
     */
    public giveInput<I extends Partial<Mixer.IInput>>(input: I) {
        input.controlID = this.props.controlID;
        Mixer.socket.call('giveInput', input);
    }

    public on(event: 'delete', handler: (ev: Mixer.ISceneDelete) => void): this;
    public on(event: 'update', handler: (ev: T) => void): this;
    public on(event: string, handler: (...args: any[]) => void): this {
        return super.on(event, handler);
    }
}
