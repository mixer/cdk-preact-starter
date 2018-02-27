/**
 * This module defines the layout engines used for custom controls. They create
 * Preact components. See the documentation on each class for further details.
 */

import { display, ISettings, Layout } from '@mcph/miix-std';
import { Component, h } from 'preact';
import { fromEvent } from 'rxjs/observable/fromEvent';
import { debounceTime, startWith } from 'rxjs/operators';
import * as tippy from 'tippy.js';

import { log } from '../Log';
import { MControl, MScene } from '../State';
import { css, RuleSet } from '../Style';
import { untilUnmount } from '../Toolbox';
import { PreactControl } from './Control';
import { ResourceHolder } from './Helpers';

export interface IFixedGridState {
  activeGrid: number;
}

export interface ILayoutOptions {
  scene: MScene;
  settings: ISettings;
}

function rectsEqual(a: ClientRect, b: ClientRect): boolean {
  if (Boolean(a) !== Boolean(b)) {
    // xor
    return false;
  }

  return a.width === b.width && a.height === b.height && a.left === b.left && a.top === b.top;
}

/**
 * Layout is a Component that takes a set of layout options. Layouts are
 * direct children of the scenes and take care of arranging and inserting
 * html elements.
 */
export interface ILayout extends Component<ILayoutOptions, any> {
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
export class FixedGridLayout extends Component<ILayoutOptions, IFixedGridState> implements ILayout {
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

  /**
   * Previous position of the video, so we don't need to update
   * when things don't move.
   */
  private previousVideoHeight: number;

  public componentWillMount() {
    Layout.gridLayouts.forEach((layout, i) => {
      const match = window.matchMedia(`(min-width: ${layout.minWidth}px)`);
      const fn = (mql: MediaQueryList) => this.setGridActive(i, mql.matches);

      this.setGridActive(i, match.matches);
      match.addListener(fn);

      this.unregisterListeners.push(() => match.removeListener(fn));
    });
  }

  public componentDidMount() {
    this.refresh();
  }

  public componentWillUnmount() {
    this.unregisterListeners.forEach(l => l());
  }

  public componentDidUpdate() {
    this.refresh();
  }

  /**
   * Implements Layout.refresh()
   */
  public refresh() {
    const { height } = this.getGridPixelSize();
    if (!this.props.settings.placesVideo || height === this.previousVideoHeight) {
      return;
    }

    this.previousVideoHeight = height;

    const padding = FixedGridLayout.videoPadding;
    display.moveVideo({
      top: padding,
      left: padding,
      right: padding,
      bottom: height + padding,
    });
    this.renderTippy();
  }

  public render() {
    const { width, height, multiplier } = this.getGridPixelSize();

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
          .map(control => {
            control.grid = this.state.activeGrid;
            return (
              <ResourceHolder
                resource={control}
                component={FixedGridControl as typeof Component}
                nest={{ grid: this.state.activeGrid, multiplier }}
              />)
          })}
      </div>
    );
  }

  /**
   * Returns the currently active grid height, in pixels.
   */
  private getGridPixelSize() {
    const grid = Layout.gridLayouts[this.state.activeGrid];

    const width = grid.width * FixedGridLayout.gridScale;
    const height = grid.height * FixedGridLayout.gridScale;

    // On mobile, fill the available window.
    let multiplier = 1;
    if (this.props.settings.platform === 'xbox' || !this.props.settings.placesVideo) {
      multiplier = Math.min(window.innerWidth / width, window.innerHeight / height);
    }

    return { width: width * multiplier, height: height * multiplier, multiplier };
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

  private renderTippy = (): void => {
    tippy(`[name^="control"] > div`,
    {
      appendTo: document.querySelector('.alchemy-grid-layout'),
      placement: 'bottom',
      hideOnClick: false,
      dynamicTitle: true,
      popperOptions: {
        modifiers: {
          preventOverflow: {
            enabled: true,
            boundariesElement: document.querySelector('.alchemy-grid-layout'),
          },
          hide: {
            enabled: false
          }
        }
      }
    });
  }
}

/**
 * FixedGridControl is the container for individual controls in the fixed grid.
 * It renders a nested <Control /> component and passes in the correct styles.
 */
class FixedGridControl extends Component<{ resource: MControl; grid: number, multiplier: number }, {}> {
  public render() {
    // tslint:disable-next-line
    const Control = this.props.resource.descriptor().ctor as typeof PreactControl;
    const grid = this.getRelevantGrid();
    if (!grid) {
      return;
    }

    const { multiplier } = this.props;

    return (
      <div
        class="control-container"
        style={new RuleSet({
          position: 'absolute',
          left: grid.x * FixedGridLayout.gridScale * multiplier,
          top: grid.y * FixedGridLayout.gridScale * multiplier,
          width: grid.width * FixedGridLayout.gridScale * multiplier,
          height: grid.height * FixedGridLayout.gridScale * multiplier,
        }).compile()}
      >
        <Control resource={this.props.resource} {...this.props.resource.toObject()} />
      </div>
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
    return configuredGrids.find(g => g.size === activeGrid);
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
export class FlexLayout extends Component<ILayoutOptions, {}> implements ILayout {
  /**
   * Padding around the video, in pixels.
   */
  public static videoPadding = 8;

  /**
   * Previous position of the video, so we don't need to update
   * when things don't move.
   */
  private previousVideoRect: ClientRect;

  private container: FlexContainer;

  public componentDidMount() {
    fromEvent(window, 'resize')
      .pipe(debounceTime(5), untilUnmount(this), startWith(null))
      .subscribe(() => this.refresh());
  }

  public componentDidUpdate() {
    this.refresh();
  }

  /**
   * Implements Layout.refresh()
   */
  public refresh() {
    const video = this.container.getVideoContainer();
    const rect = video && video.getBoundingClientRect();
    if (!video || (rect.width === 0 && display.getSettings().placesVideo)) {
      // width=0 indicates it's hidden
      log.warn('No video element was found in the containers, skipping reposition');
      return;
    }
    if (rectsEqual(this.previousVideoRect, rect)) {
      return;
    }

    this.previousVideoRect = rect;

    display.moveVideo({
      top: rect.top + FlexLayout.videoPadding,
      left: rect.left + FlexLayout.videoPadding,
      width: rect.width - 2 * FlexLayout.videoPadding,
      height: rect.height - 2 * FlexLayout.videoPadding,
    });
  }

  public render() {
    return (
      <FlexContainer
        ref={this.setContainer}
        scene={this.props.scene}
        container={{
          class: ['alchemy-flex-layout'],
          children: this.props.scene.get('containers', []),
          styles: {
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          },
        }}
      />
    );
  }

  private setContainer = (container: FlexContainer) => {
    this.container = container;
  };
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
  return (e as any).controlID !== undefined;
}

/**
 * FlexContainer correspondings to an IContainer, nested in the FlexLayout.
 */
export class FlexContainer extends Component<IFlexContainerOptions, IFlexContainerState> {
  public containerElement: Element;
  private rules: RuleSet;
  private videoContainer: Element;

  /**
   * Returns the video container contained in this tree, or undefined if none.
   */
  public getVideoContainer(): HTMLElement | undefined {
    return this.videoContainer as HTMLElement;
  }

  public componentWillReceiveProps(nextProps: IFlexContainerOptions) {
    this.updateRules(nextProps);
  }

  public componentWillMount() {
    this.updateRules(this.props);
  }

  public render() {
    if (this.rules.isHidden()) {
      return;
    }

    return (
      <div style={this.state.style} class={this.state.classes} ref={this.onContainer}>
        {this.state.children}
      </div>
    );
  }

  /**
   * Called after we render the layout container. If the container contains
   * the video, bubble the call up.
   */
  protected onContainer = (el: Element) => {
    this.containerElement = el;
    if (this.state.hasVideo) {
      this.setVideoContainer(el);
    }
  };

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

  private updateRules(props: IFlexContainerOptions) {
    if (this.rules) {
      this.rules.unobserve();
    }

    const children = props.container.children || [];

    this.rules = new RuleSet(props.container.styles || {});
    this.rules.observe(style => this.setState({ ...this.state, style }));
    this.setState({
      ...this.state,
      style: this.rules.compile(),
      classes: (props.container.class || []).join(' '),
      hasVideo: children.indexOf('video') > -1,
      children: this.getChildren(props),
    });
  }

  /**
   * Returns a list of child components (a mix of FlexContainers and
   * PreactControls) in this layout.
   */
  private getChildren(props: IFlexContainerOptions): JSX.Element[] {
    const children = props.container.children || [];
    return children
      .map(child => {
        if (child === 'video') {
          return;
        }

        if (!isControlChild(child)) {
          return <FlexContainer parent={this} scene={this.props.scene} container={child} />;
        }

        const control = this.props.scene.controls[child.controlID];
        // tslint:disable-next-line
        const Control = control.descriptor().ctor as typeof PreactControl;
        return <ResourceHolder component={Control} resource={control} />;
      })
      .filter(control => !!control);
  }
}
