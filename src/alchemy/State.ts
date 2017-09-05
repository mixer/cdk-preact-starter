import { EventEmitter } from 'eventemitter3';
import * as Mixer from '@mcph/miix/std';

import { assert, guard, remap } from './Log';

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

        // debug handler -----------------------
        Mixer.socket.dumpHandler(() => ({
            participant: this.participant.toObject(),
            scenes: Object.keys(this.scenes).map(g => this.scenes[g].toObject()),
            groups: Object.keys(this.groups).map(g => this.groups[g].toObject()),
        }));

        // scenes -------------------------------
        Mixer.socket.on('onSceneCreate', guard(({ scenes }) => {
            console.log('create', JSON.stringify(scenes));
            scenes.forEach(s => {
                assert(!this.scenes[s.sceneID], `Tried to create scene in "${s.sceneID}", but it already exists`);
                const scene = (this.scenes[s.sceneID] = new MScene(this, s));
                this.emit('sceneCreate', scene);
            });
        }));
        Mixer.socket.on('onSceneUpdate', guard(({ scenes }) => {
            scenes.forEach(s => {
                assert(this.scenes[s.sceneID], `Tried to update scene "${s.sceneID}", but it didn't exist`);
                (<any>this.scenes[s.sceneID]).update(s);
            });
        }));
        Mixer.socket.on('onSceneDelete', guard(packet => {
            assert(this.scenes[packet.sceneID], `Tried to update scene "${packet.sceneID}", but it didn't exist`);
            this.emit('sceneDelete', this.scenes[packet.sceneID], packet);
            this.scenes[packet.sceneID].emit('delete', packet);
            delete this.scenes[packet.sceneID];
        }));

        // controls -----------------------------
        Mixer.socket.on('onControlCreate', guard(data => {
            assert(this.scenes[data.sceneID], `Tried to create controls in "${data.sceneID}", but it didn't exist`);
            (<any> this.scenes[data.sceneID]).createControls(data.controls);
        }));
        Mixer.socket.on('onControlUpdate', guard(data => {
            assert(this.scenes[data.sceneID], `Tried to update controls in "${data.sceneID}", but it didn't exist`);
            (<any> this.scenes[data.sceneID]).updateControls(data.controls);
        }));
        Mixer.socket.on('onControlDelete', guard(data => {
            assert(this.scenes[data.sceneID], `Tried to delete controls in "${data.sceneID}", but it didn't exist`);
            (<any> this.scenes[data.sceneID]).deleteControls(data.controls);
        }));

        // groups -------------------------------
        Mixer.socket.on('onGroupCreate', guard(({ groups }) => {
            groups.forEach(g => {
                assert(!this.groups[g.groupID], `Tried to create group "${g.groupID}", but it already exists`);
                assert(this.scenes[g.sceneID], `Tried to assign group to "${g.sceneID}", but it didn't exist`);
                const group = (this.groups[g.groupID] = new Group(this.scenes[g.sceneID], g));
                this.emit('groupCreate', group);
            });
        }));
        Mixer.socket.on('onGroupUpdate', guard(({ groups }) => {
            groups.forEach(g => {
                assert(this.groups[g.groupID], `Tried to update group "${g.groupID}", but it didn't exist`);
                assert(this.scenes[g.sceneID], `Tried to assign group to "${g.sceneID}", but it didn't exist`);

                (<any>this.groups[g.groupID]).update(g);
                if (this.participant.props.groupID === g.groupID) {
                    this.participant.emit('groupUpdate', g);
                }
            });
        }));
        Mixer.socket.on('onGroupDelete', guard(packet => {
            assert(this.groups[packet.groupID], `Tried delete group "${packet.groupID}", but it doesn't exist`);
            this.emit('groupDelete', this.groups[packet.groupID], packet);
            this.groups[packet.groupID].emit('delete', packet);
            delete this.groups[packet.groupID];
        }));

        // global state -------------------------
        Mixer.socket.on('onParticipantUpdate', guard(ev => {
            (<any>this.participant).update(ev.participants[0]);
        }));
        Mixer.socket.on('onParticipantJoin', guard(ev => {
            (<any>this.participant).update(ev.participants[0]);
        }));
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
        assert(
            this.state.groups[props.groupID],
            `Tried to move participant to group "${props.groupID}", but it didn't exist`,
        );

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
     * Returns the resource's plain properties.
     * @override
     */
    public toObject(): T {
        return Object.assign(
            {},
            this.props,
            { controls: Object.keys(this.controls).map(k => this.controls[k].toObject()) },
        );
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

    /**
     * @override
     */
    protected update(value: T) {
        remap(() => this.state.registry.getScene(value.sceneID));
        super.update(value);
    }

    protected createControls(controls: Mixer.IControl[]) {
        controls.forEach(control => {
            assert(
                !this.controls[control.controlID],
                `Tried to create control "${control.controlID}", but it already exists`,
            );

            this.controls[control.controlID] = new MControl(this, control);
            this.emit('update', this.toObject());
        });
    }

    protected updateControls(controls: Mixer.IControl[]) {
        controls.forEach(control => {
            if (!this.controls[control.controlID]) {
                this.createControls([control]);
                return;
            }

            (<any> this.controls[control.controlID]).update(control);
            this.emit('update', this.toObject());
        });
    }

    protected deleteControls(controls: { controlID: string }[]) {
        controls.forEach(control => {
            if (!this.controls[control.controlID]) {
                return;
            }

            this.controls[control.controlID].emit('delete');
            delete this.controls[control.controlID];
            this.emit('update', this.toObject());
        });
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
    public on(event: 'update', handler: () => void): this;
    public on(event: string, handler: (...args: any[]) => void): this {
        return super.on(event, handler);
    }

    /**
     * @override
     */
    protected update(value: T) {
        remap(() => this.state.registry.getControl(value.kind));
        super.update(value);
    }
}
