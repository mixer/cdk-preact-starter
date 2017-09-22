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
