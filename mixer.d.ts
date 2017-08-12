declare module 'mixer' {
    import { EventEmitter } from 'eventemitter3';

    /**
     * IControl is some kind of control on the protocol. The controlID is
     * unique in the scene.
     *
     * This is a minimal interface: control types may extend this interface
     * and define their own properties.
     */
    export interface IControl {
        readonly controlID: string;
        readonly kind: string;
    }

    /**
     * IScene is a scene on the protocol. It can contain many controls. The
     * sceneID is globally unique.
     *
     * This is a minimal interface: scenes may extend this interface
     * and define their own properties.
     */
    export interface IScene {
        readonly sceneID: string;
        readonly controls: IControl[];
    }

    /**
     * IGroup is a groups of participants on the protocol. Groups are assigned
     * to a single scene.
     *
     * This is a minimal interface: integrations may extend this interface
     * and define their own properties.
     */
    export interface IGroup {
        readonly sceneID: string;
        readonly groupID: string;
    }

    /**
     * ISceneCreate is an event triggered when a new scene is created.
     */
    export interface ISceneCreate {
        readonly scenes: IScene[];
    }

    /**
     * ISceneUpdate is an event triggered when a an existing scene is updated.
     */
    export interface ISceneUpdate {
        readonly scenes: IScene[];
    }

    /**
     * ISceneDelete is an event triggered when a scene is deleted.
     */
    export interface ISceneDelete {
        readonly sceneID: string;
        readonly reassignSceneID: string;
    }

    /**
     * IControlChange is fired when new controls are created, updated, or
     * deleted in the scene.
     */
    export interface IControlChange {
        readonly sceneID: string;
        readonly controls: IControl[];
    }

    /**
     * IGroupDelete is an event triggered when a group is deleted.
     */
    export interface IGroupDelete {
        readonly groupID: string;
        readonly reassignGroupID: string;
    }

    /**
     * IGroupCreate is fired when new groups are created.
     */
    export interface IGroupCreate {
        readonly groups: IGroup[];
    }

    /**
     * IGroupUpdate is fired when groups are updated.
     */
    export interface IGroupUpdate {
        readonly groups: IGroup[];
    }

    /**
     * IParticipant represents a user in Interactive. As far as controls are
     * concerned, this means only the current user.
     *
     * This is a minimal interface: integrations may extend this interface
     * and define their own properties.
     */
    export interface IParticipant {
        readonly sessionID: string;
        readonly userID: number;
        readonly username: string;
        readonly level: number;
        readonly lastInputAt: number; // milliseconds timestamp
        readonly connectedAt: number; // milliseconds timestamp
        readonly disabled: boolean;
        readonly groupID: string;
    }

    /**
     * IParticipantUpdate is fired when the participant's data is updated,
     * and once when first connecting.
     */
    export interface IParticipantUpdate {
        readonly participants: [IParticipant];
    }

    /**
     * IInput is an input event fired on a control. This is a minimal
     * interface; custom properties may be added and they will be passed
     * through to the game client.
     */
    export interface IInput {
        controlID: string;
        event: string;
    }

    /**
     * IReady is sent when when the integration indicates that it has set up
     * and is ready to accept input.
     */
    export interface IReady {
        readonly isReady: boolean;
    }

    /**
     * Attaches a handler function that will be triggered when the call comes in.
     */
    export class Socket extends EventEmitter {
        on(event: 'onParticipantJoin', handler: (ev: IParticipantUpdate) => void): this;
        on(event: 'onParticipantUpdate', handler: (ev: IParticipantUpdate) => void): this;
        on(event: 'onGroupCreate', handler: (ev: IGroupCreate) => void): this;
        on(event: 'onGroupDelete', handler: (ev: IGroupDelete) => void): this;
        on(event: 'onGroupUpdate', handler: (ev: IGroupUpdate) => void): this;
        on(event: 'onSceneCreate', handler: (ev: ISceneCreate) => void): this;
        on(event: 'onSceneDelete', handler: (ev: ISceneDelete) => void): this;
        on(event: 'onSceneUpdate', handler: (ev: ISceneUpdate) => void): this;
        on(event: 'onControlCreate', handler: (ev: IControlChange) => void): this;
        on(event: 'onControlDelete', handler: (ev: IControlChange) => void): this;
        on(event: 'onControlUpdate', handler: (ev: IControlChange) => void): this;
        on(event: 'onReady', handler: (ev: IReady) => void): this;

        call(method: 'giveInput', options: IInput): void;
        call(method: string, options: object): Promise<object>;
        call(method: string, options: object, waitForReply: true): Promise<object>;
        call(method: string, options: object, waitForReply: false): void;
    }

    /**
     * IVideoPositionOptions are passed into display.moveVideo() to change
     * where the video is shown on the screen.
     */
    export interface IVideoPositionOptions {
        /**
         * Position of the video on screen as a percent (0 - 100) of the screen width.
         * If omitted, it's not modified.
         */
        x?: number;

        /**
         * Position of the video on screen as a percent (0 - 100) of the screen height.
         * If omitted, it's not modified.
         */
        y?: number;

        /**
         * Width of the video on screen as a percent (0 - 100) of the screen.
         * If omitted, it's not modified.
         */
        width?: number;

        /**
         * Height of the video on screen as a percent (0 - 100) of the screen.
         * If omitted, it's not modified.
         */
        height?: number;

        /**
         * Duration of the movement easing in milliseconds. Defaults to 0.
         */
        duration?: number;

        /**
         * CSS easing function. Defaults to 'linear'.
         * @see https://developer.mozilla.org/en-US/docs/Web/CSS/transition-timing-function
         */
        easing?: string;
    }

    /**
     * Display modified the display of interactive controls.
     */
    export class Display {
        /**
         * Hides the controls and displays a loading spinner, optionally
         * with a custom message. This is useful for transitioning. If called
         * while the controls are already minimized, it will update the message.
         */
        minimize(message?: string): void;

        /**
         * Restores previously minimize()'d controls.
         */
        maximize(): void;

        /**
         * Moves the position of the video on the screen.
         */
        moveVideo(options: IVideoPositionOptions): void;
    }

    export const socket: Socket;
    export const display: Display;
}
