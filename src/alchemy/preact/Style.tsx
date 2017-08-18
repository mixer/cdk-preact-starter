import { Layout } from 'miix/std';

/**
 * RuleSet is a set of CSS rules.
 */
export class RuleSet {
    private observerMap = new Map<Function, () => void>();
    private lastRules: { [key: string]: Layout.Style };

    constructor(private readonly rules: Layout.StyleRules) {}

    /**
     * Compiles the set of CSS rules into an inline style. Breakpoints will
     * be evaluated based on the instant size of the display.
     */
    public compile(): string {
        const output: string[] = [];
        this.lastRules = {};
        Object.keys(this.rules).forEach(name => {
            const value = this.rules[name];
            if (value == null) {
                return;
            }

            if (typeof value !== 'object') {
                // simple rules are easy
                output.push(this.compileAndAddRule(name, value));
                return;
            }

            if (!matchMedia(name).matches) {
                // key is a media query, abort if no match
                return;
            }

            Object.keys(value).forEach(nested => {
                output.push(this.compileAndAddRule(nested, value[nested]));
            });
        });

        return output.join(';');
    }

    /**
     * Returns a new rule set by joining this one to another. The others'
     * rules will override this set's rules if they conflict.
     */
    public concat(other: RuleSet): RuleSet {
        return new RuleSet({
            ...this.rules,
            ...other.rules,
        });
    }

    /**
     * Returns if the element the ruleset applies to is _definitely_ hidden.
     * It might not be visible even if this returns false, but if this returns
     * return then it is definitely not visible.
     */
    public isHidden(): boolean {
        return (
            String(this.rules.display).toLowerCase() === 'none' ||
            String(this.rules.visibility).toLowerCase() === 'hidden'
        );
    }

    /**
     * Watches for changes in the rules that happen when the window changes
     * and breakpoints are hit. The callback fires with the new,compiled rules.
     */
    public observe(callback: (rules: string) => void): void {
        const queries = this.getMediaQueries().map(q => matchMedia(q));
        const wrapped = () => callback(this.compile());
        this.observerMap.set(callback, () => queries.forEach(q => q.removeListener(wrapped)));
        queries.forEach(q => q.addListener(wrapped));
    }

    /**
     * Removes a previously added observer.
     */
    public unobserve(callback?: (rules: string) => void) {
        if (!callback) {
            this.observerMap.forEach(fn => fn());
            return;
        }

        const unsubscribe = this.observerMap.get(callback);
        if (unsubscribe) {
            unsubscribe();
            this.observerMap.delete(callback);
        }
    }

    /**
     * Compiles a single property:value pair, and adds it to the working ruleset.
     */
    private compileAndAddRule(name: string, value: Layout.Style) {
        const parsedName = name.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
        const parsedValue = typeof value === 'number' ? `${value}px` : value;
        this.lastRules[name] = value;

        return `${parsedName}:${parsedValue}`;
    }

    /**
     * Returns a list of media queries this ruleset has.
     */
    private getMediaQueries(): string[] {
        return Object.keys(this.rules).filter(key => typeof this.rules[key] === 'object');
    }
}

/**
 * Compiles the set of CSS styles into an inline string.
 */
export function css(styles: Layout.StyleRules): string {
    return new RuleSet(styles).compile();
}
