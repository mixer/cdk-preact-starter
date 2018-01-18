import { Component } from 'preact';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs/ReplaySubject';

/**
 * throttle creates a function that calls the inner, passed function at
 * the trailing edge of the throttle duration, with the last set of
 * arguments it received.
 */
export function throttle<T extends Function>(duration: number, fn: T): T {
  let deferred: any | null = null;
  let lastArgs: any[];

  // tslint:disable-next-line
  return <any>function(this: any, ...args: any[]) {
    lastArgs = args;

    if (deferred) {
      return;
    }

    deferred = setTimeout(() => {
      deferred = null;
      // tslint:disable-next-line
      fn.apply(this, lastArgs);
    }, duration);
  };
}

/**
 * untilUnmount returns a function that can be used in an observable's pipe
 * to unsubscribe.
 *
 * @example
 * mixer.display.video()
 *   .pipe(untilUnmount(this))
 *   .subscribe(settings => this.updateSettings(settings));
 */
export function untilUnmount<T>(component: Component<any, any>) {
  const inner = component.componentWillUnmount;
  const notifier = new ReplaySubject<void>(1);
  component.componentWillMount = function() {
    notifier.next(undefined);
    if (inner) {
      // tslint:disable-next-line
      inner.apply(this, arguments);
    }
  };

  return takeUntil<T>(notifier);
}
