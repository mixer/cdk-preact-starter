import { ResourceHolder } from './Helpers';
/**
 * This module defines the layout engines used for custom controls. They create
 * Preact components. See the documentation on each class for further details.
 */

import { Component, h } from 'preact';
import { display, Layout, ISettings } from '@mcph/miix/std';
import { bind, debounce } from 'decko';

import { MControl, MScene } from '../State';
import { log } from '../Log';
import { css, RuleSet } from '../Style';
import { PreactControl } from './Control';

export interface IFixedGridState {
    activeGrid: number;
}

export interface ILayoutOptions {
    scene: MScene;
    settings: ISettings;
}

/**
 * Layout is a Component that takes a set of layout options. Layouts are
 * direct children of the scenes and take care of arranging and inserting
 * html elements.
 */
export interface Layout extends Component<ILayoutOptions, any> {
    /**
     * refresh should be called whenever an action happens that changes where
     * objects (particularly the video) are located.
     */
    refresh(): void;
}

/**
  * The FixedGridLayout is the traditional layout for Interactive controls.
  * A grid of predefined size is placed below the stream. There are a couple
  * of breakpoints that trigger the grid size to change. Each grid is made up
  * of a certain number of vertical and horizontal cells, which measure a
  * constant 12px by 12px;
  */
export class FixedGridLayout extends Component<ILayoutOptions, IFixedGridState> implements Layout {
    /**
     * Default width/height in pixels of each grid cell. This can be tweaked
     * on mobile devices to fit the controls more exactly.
     */
    public static gridScale = 12;

    /**
     * Padding around the video, in pixels.
     */
    public static videoPadding = 8;

    /**
     * "unlisteners" for media queries.
     */
    private unregisterListeners: (() => void)[] = [];

    /**
     * Array with indices corresponding to Layout.gridLayouts, and true/false
     * for whether the screen is wide enough to show that layout. This is
     * changed by listeners on `window.matchMedia`. Each time one of them
     * flips we go through and activate the largest possible grid.
     */
    private activeGrids: boolean[] = [];

    public componentWillMount() {
        Layout.gridLayouts.forEach((layout, i) => {
            const match = window.matchMedia(`(min-width: ${layout.minWidth}px)`);
            const fn = (mql: MediaQueryList) => this.setGridActive(i, mql.matches);

            this.setGridActive(i, match.matches);
            match.addListener(fn);

            this.unregisterListeners.push(() => match.removeListener(fn));
        });

        setTimeout(() => this.refresh());
    }

    public componentWillUnmount() {
        this.unregisterListeners.forEach(l => l());
    }

    /**
     * Implements Layout.refresh()
     */
    public refresh() {
        const { height } = this.getGridPixelSize();
        if (!this.props.settings.placesVideo) {
            return;
        }

        const padding = FixedGridLayout.videoPadding;
        display.moveVideo({
            top: padding,
            left: padding,
            right: padding,
            bottom: height + padding,
        });
    }

    /**
     * Returns the currently active grid height, in pixels.
     */
    private getGridPixelSize()  {
        const grid = Layout.gridLayouts[this.state.activeGrid];
        const width = grid.width * FixedGridLayout.gridScale;
        const height = grid.height * FixedGridLayout.gridScale;

        // On mobile, fill the available window.
        let multiplier = 1;
        if (!this.props.settings.placesVideo) {
            multiplier = Math.min(
                window.innerWidth / width,
                window.innerHeight / height,
            );
        }

        return { width: width * multiplier, height: height * multiplier };
    }

    /**
     * Marks the given grid index as active or inactive and then changes the displayed
     * displayed grid as necessary. See the docs on activeGrids for more info.
     */
    private setGridActive(index: number, active: boolean) {
        const previousActiveGrid = this.state.activeGrid;
        this.activeGrids[index] = active;

        // Grids are sorted largest to smallest, the active grid should be the
        // first true value in the activeGrids list.
        const nextActiveGrid = this.activeGrids.findIndex(Boolean);
        if (nextActiveGrid === previousActiveGrid) {
            return;
        }

        this.setState({ ...this.state, activeGrid: nextActiveGrid });
    }

    public render() {
        const { width, height } = this.getGridPixelSize();

        return (
            <div
                class="alchemy-grid-layout"
                style={css({
                    position: 'absolute',
                    bottom: this.props.settings.placesVideo ? 0 : '50%',
                    left: '50%',
                    height,
                    width,
                    marginLeft: width / -2,
                    marginBottom: this.props.settings.placesVideo ? 0 : height / -2,
                })}
            >
                {this.props.scene
                    .listControls()
                    .map(control =>
                        <ResourceHolder
                            resource={control}
                            component={FixedGridControl as typeof Component}
                            nest={{ grid: this.state.activeGrid }} />,
                    )}
            </div>
        );
    }
}

class FixedGridControl extends Component<{ resource: MControl; grid: number }, {}> {
    public render() {
        const Control = this.props.resource.descriptor().ctor as typeof PreactControl;
        const grid = this.getRelevantGrid();
        if (!grid) {
            return;
        }

        return (
            <Control
                resource={this.props.resource}
                style={new RuleSet({
                    position: 'absolute',
                    left: grid.x * FixedGridLayout.gridScale,
                    top: grid.y * FixedGridLayout.gridScale,
                    width: grid.width * FixedGridLayout.gridScale,
                    height: grid.height * FixedGridLayout.gridScale,
                })}
                {...this.props.resource.toObject()}
            />
        );
    }

    /**
     * Returns the currently active grid for the control, if any can be found;
     */
    private getRelevantGrid(): Layout.IGridPlacement | undefined {
        const activeGrid = Layout.gridLayouts[this.props.grid].size;
        const control = this.props.resource as MControl;
        const configuredGrids = control.get('position', []);
        if (configuredGrids.length === 0) {
            log.error(
                `A control in scene "${control.scene.props.sceneID}" is ` +
                    `missing a list of positions, we won't display it`,
                control.toObject(),
            );
            return;
        }
        return (
            configuredGrids.find(g => g.size === activeGrid) ||
            configuredGrids[configuredGrids.length - 1]
        );
    }
}

/**
 * The FlexLayout corresponds to the "flex" display mode. In this mode,
 * everything is made up of FlexContainers on which custom CSS styles and
 * classes can be applied. Each container can contain more containers, the
 * video, or controls.
 *
 * Note that controls don't *actually* have control of the video. Instead,
 * we track where the video container is and every time a CSS breakpoint
 * changes we'll trigger a resize of the video.
 */
export class FlexLayout extends Component<ILayoutOptions, {}> implements Layout {
    private container: FlexContainer;

    @bind
    @debounce(5)
    private resizeListener() {
        this.refresh();
    }

    public componentWillMount() {
        window.addEventListener('resize', this.resizeListener);
    }

    public componentWillUnmount() {
        window.removeEventListener('resize', this.resizeListener);
    }

    /**
     * Implements Layout.refresh()
     */
    public refresh() {
        const video = this.container.getVideoContainer();
        const rect = video && video.getBoundingClientRect();
        if (!video || rect.width === 0) {
            // width=0 indicates it's hidden
            log.warn('No video element was found in the containers, skipping reposition');
            return;
        }

        display.moveVideo({
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom,
        });
    }

    public render() {
        return (
            <FlexContainer
                ref={c => (this.container = c)}
                scene={this.props.scene}
                container={{
                    class: ['alchemy-flex-layout'],
                    children: this.props.scene.get('containers', []),
                }}
            />
        );
    }
}

export interface IFlexContainerOptions {
    parent?: FlexContainer;
    container: Layout.IContainer;
    scene: MScene;
}

export interface IFlexContainerState {
    style: string;
    classes: string;
    hasVideo: boolean;
    children: JSX.Element[];
}

function isControlChild(e: Layout.IContainer | Layout.IControlChild): e is Layout.IControlChild {
    return (e as any).ControlID !== 'undefined';
}

/**
 * FlexContainer correspondings to an IContainer, nested in the FlexLayout.
 */
export class FlexContainer extends Component<IFlexContainerOptions, IFlexContainerState> {
    private rules: RuleSet;
    private videoContainer: Element;

    /**
     * Returns the video container contained in this tree, or undefined if none.
     */
    public getVideoContainer(): HTMLElement | undefined {
        return this.videoContainer as HTMLElement;
    }

    /**
     * Updates the video container of the root of the container tree.
     */
    protected setVideoContainer(el: Element) {
        if (el && this.props.parent && !this.rules.isHidden()) {
            this.props.parent.setVideoContainer(el);
        } else {
            this.videoContainer = el;
        }
    }

    public componentWillReceiveProps() {
        if (this.rules) {
            this.rules.unobserve();
        }

        const children = this.props.container.children || [];

        this.rules = new RuleSet(this.props.container.styles || {});
        this.rules.observe(style => this.setState({ ...this.state, style }));
        this.setState({
            ...this.state,
            style: this.rules.compile(),
            classes: (this.props.container.class || []).join(' '),
            hasVideo: children.indexOf('video') > -1,
            children: this.getChildren(),
        });
    }

    public render() {
        if (this.rules.isHidden()) {
            return;
        }

        return (
            <div
                style={this.state.style}
                class={this.state.classes}
                ref={e => this.setVideoContainer(e)}
            >
                {this.state.children}
            </div>
        );
    }

    /**
     * Returns a list of child components (a mix of FlexContainers and
     * PreactControls) in this layout.
     */
    private getChildren(): JSX.Element[] {
        const children = this.props.container.children || [];
        return children
            .map(child => {
                if (child === 'video') {
                    return;
                }

                if (!isControlChild(child)) {
                    return (
                        <FlexContainer parent={this} scene={this.props.scene} container={child} />
                    );
                }

                const control = this.props.scene.controls[child.controlID];
                const Control = control.descriptor().ctor as typeof PreactControl;
                return <ResourceHolder component={Control} resource={control} />;
            })
            .filter(control => !!control);
    }
}
