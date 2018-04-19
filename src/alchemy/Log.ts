import * as Mixer from '@mcph/miix-std';

/**
 * `log` has methods to capture messages from your controls. These'll be
 * exposed in the miix UI, and we will continue to build further telemetry
 * around them.
 */
export const log = Mixer.log;

/**
 * Intercept console.log/error/debug to send them to the Mixer logger too.
 */
function interceptLogs(
  consoleMethod: keyof typeof console,
  logMethod: keyof typeof Mixer.log,
) {
  const originalFn = console[consoleMethod];
  console[consoleMethod] = (...args: any[]) => {
    Mixer.log[logMethod](...args);
    return originalFn.apply(console, args);
  };
}

interceptLogs('error', 'error');
interceptLogs('log', 'info');
interceptLogs('info', 'info');
interceptLogs('debug', 'debug');
interceptLogs('warn', 'warn');

const compactWhitespace = (str: string) => str.replace(/[ \n\r\t]+/g, ' ');

/**
 * An AssertionError is thrown by assert().
 */
export class AssertionError extends Error {
  constructor(message: string) {
    super(compactWhitespace(message));
    AssertionError.setProto(this);
  }

  protected static setProto(error: AssertionError) {
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(error, this.prototype);
      return;
    }
    (<any>error).__proto__ = this.prototype; // Super emergency fallback
  }
}

/**
 * Throws an AssertionError if the value is not truthy.
 */
export function assert(value: any, message: string) {
  if (!value) {
    throw new AssertionError(message);
  }
}

/**
 * Guard wraps the provided function and catches and logs assertionerrors.
 */
export function guard<R, T = undefined>(
  fn: (arg: T) => R,
): (arg: T) => R | undefined {
  return function() {
    try {
      // tslint:disable-next-line
      return fn.apply(this, arguments);
    } catch (e) {
      if (e instanceof AssertionError) {
        log.error(e);
        return undefined;
      }

      throw e;
    }
  };
}

/**
 * Runs the give function, remapping *any* error it throws to an
 * AssertionError. Should be used with great care.
 */
export function remap<R>(fn: () => R): R {
  try {
    return fn();
  } catch (e) {
    throw new AssertionError(e.message);
  }
}
