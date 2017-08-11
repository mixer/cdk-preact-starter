declare module 'mixer' {

    /**
     * Attaches a handler function that will be triggered when the call comes in.
     */
    export function on(call: string, data: any): void;
}