import Optional from "optional-js";

declare module 'optional-js' {
    export default interface Optional<T> {
        compose<T2>(other: Optional<T2>): Optional<[T, T2]>

        orUndefined(): T | undefined;

        orNull(): T | null;
    }
}

const optional = Optional.empty();
Object.getPrototypeOf(optional).compose = function compose(this: Optional<any>, other: Optional<any>) {
    return this.isPresent() && other.isPresent()
        ? Optional.of([this.get(), other.get()])
        : Optional.empty()
}
Object.getPrototypeOf(optional).orUndefined = function orUndefined(this: Optional<any>) {
    return this.isPresent() ? this.get() : undefined
}
Object.getPrototypeOf(optional).orNull = function orNull(this: Optional<any>) {
    return this.isPresent() ? this.get() : null
}

export const opt = Optional.ofNullable

export function valueMap<T, R>(value: T, fun: (value: T) => R): R {
    return fun(value)
}