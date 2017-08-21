import { Component, h } from 'preact';
import * as Mixer from 'miix/std';

import { PreactScene } from './Scene';
import { MScene, State } from '../State';
import { ResourceHolder } from './Helpers';

/**
 * PreactStage is the bootstrap component for the interactive integration.
 * You may swap this out or customize it if you want, but it shouldn't
 * generally be necessary.
 */
export class PreactStage extends Component<{ registry: Mixer.Registry }, { scene: MScene }> {
    private interactive: State;

    public componentDidMount() {
        const i = (this.interactive = new State(this.props.registry));

        i.once('ready', () => {
            this.updateScene(i.participant.group.sceneID);
            i.participant.on('update', ev => this.updateScene(i.participant.group.sceneID));
            i.participant.on('groupUpdate', ev => this.updateScene(ev.sceneID));
        });
    }

    public render() {
        if (!this.state.scene) {
            return;
        }

        return <div class="stage">{this.getSceneComponent(this.state.scene)}</div>;
    }

    /**
     * Updates the displayed scene to match the ID.
     */
    protected updateScene(id: string) {
        if (!this.state.scene || this.state.scene.props.sceneID !== id) {
            this.setState({ ...this.state, scene: this.interactive.scenes[id] });
        }
    }

    /**
     * Returns the renderable component for the scene.
     */
    protected getSceneComponent(scene: MScene) {
        const Scene = scene.descriptor().ctor as typeof PreactScene;
        return <ResourceHolder resource={scene} component={Scene} />;
    }
}
