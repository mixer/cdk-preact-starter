import { bind } from 'decko';
import { Component, h } from 'preact';

import { Resource } from '../State';

export interface IResourceHolderProps<S, T extends Resource<S>> {
  resource: T;
  component: typeof Component;
  nest?: object;
}

/**
 * ResourceHolder is a class that contains a Resource, namely a Scene or
 * Control. It gives the nested component the resource's attributes as props
 * and watches for updates.
 */
export class ResourceHolder<S, T extends Resource<S>> extends Component<
  IResourceHolderProps<S, T>,
  { props: any }
> {
  private previousResource: T;

  /**
   * @override
   */
  public componentWillMount() {
    this.setResource(this.props.resource);
  }

  /**
   * @override
   */
  public componentWillReceiveProps(nextProps: IResourceHolderProps<S, T>) {
    this.setResource(nextProps.resource);
  }

  /**
   * @override
   */
  public componentWillUnmount() {
    if (this.previousResource) {
      this.previousResource.removeListener('update', this.updateListener);
    }
  }

  public render() {
    return <this.props.component resource={this.props.resource} {...this.state.props} />;
  }

  @bind
  private updateListener(ev: S) {
    this.setState({
      ...this.state,
      props: Object.assign({}, ev, this.props.nest),
    });
  }

  private setResource(nextResource: T) {
    if (nextResource === this.previousResource) {
      return;
    }
    if (this.previousResource) {
      this.previousResource.removeListener('update', this.updateListener);
    }

    this.updateListener(nextResource.toObject());
    nextResource.on('update', this.updateListener);
    this.previousResource = nextResource;
  }
}
