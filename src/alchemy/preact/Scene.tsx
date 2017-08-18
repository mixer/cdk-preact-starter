import { Component, h } from 'preact';
import * as Mixer from 'miix/std';

import { FixedGridLayout, FlexLayout } from './Layout';
import { MScene } from '../State';

function getLayoutEngine() {
    if (Mixer.packageConfig.display.mode === 'flex') {
        return FlexLayout;
    }

    return FixedGridLayout;
}

/**
 * PreactScene is the base scene. You can extend and override this scene.
 */
@Mixer.Scene({ default: true })
export class PreactScene<T, S extends Mixer.IScene = Mixer.IScene>
    extends Component<{ scene: MScene<S> }, T & S> {

    protected readonly scene: MScene<S>;
    private sceneUpdateListener = (ev: S) => {
        this.setState(Object.assign({}, this.state, ev));
    };

    constructor(props: { scene: MScene<S> }, context: any) {
        super(props, context);
        this.scene = props.scene;
    }

    /**
     * @override
     */
    public componentWillMount() {
        this.setState(this.scene.toObject());
        this.scene.on('update', this.sceneUpdateListener);
    }

    /**
     * @override
     */
    public componentWillUnmount() {
        this.scene.removeListener('update', this.sceneUpdateListener);
    }

    public render() {
        const Layout = getLayoutEngine();
        return (
            <div class={`scene scene-${this.scene.sceneID}`}>
                <Layout scene={this.scene} />
            </div>
        );
    }
}
