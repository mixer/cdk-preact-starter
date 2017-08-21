// todo(connor4312): we may need more than this eventually. Namely I want to
// capture logs and publish them in the miix UI if nothing else.
export const log = console;

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
export function guard<T, R>(fn: (arg: T) => R): (arg: T) => R | undefined {
    return function () {
        try {
            return fn.apply(this, arguments)
        } catch (e) {
            if (e instanceof AssertionError) {
                log.error(e.message);
                return undefined;
            }

            throw e;
        }
    }
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
