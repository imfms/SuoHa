import {ForwardRefExoticComponent, PropsWithoutRef, RefAttributes} from "react";
import {Control} from "react-hook-form";
import {isEmpty, isNil} from "lodash";
import {ZodPrimitive} from "./validator";

export type Progress<Result> = {
    done: false,
    percent: number,
} | {
    done: true,
    percent: number,
    result: Result,
}
export type ProgressResult<P extends Progress<any>> = P extends Progress<infer Result> ? Result : never
export const type = <T>(t: T): T => {
    return t;
}

export type OnSelect<DataType> = (data: DataType) => void;

export type Canceler = () => void;

declare global {
    interface ObjectConstructor {
        entries<T, K extends { [s: string]: T } | ArrayLike<T> = { [s: string]: T } | ArrayLike<T>>(o: K): [keyof K, T][];
    }
}

export type ForwardedComponent<T, P> = ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<T>>;

export type ForwardProps<P, T> = PropsWithoutRef<P> & RefAttributes<T>

export type SimpleValueProps<ValueType> = {
    value?: ValueType,
    onChange?: (value: ValueType) => void,
}
export type ValueComponentProps<ValueType> = {
    value?: ValueType,
    defaultValue?: ValueType,
    onChange?: (value: ValueType) => void,
}

export function key<T extends keyof any>(): { [P in T]: P } {
    return new Proxy({}, {get: (_, p) => p}) as { [P in T]: P }
}

export function keyof<T>(key: keyof T) {
    return key;
}

export function value<T>(value: T) {
    return value;
}

export type EnumLike = {
    [k: string]: string | number;
    [nu: number]: string;
};

export type ControlType<C extends Control<any>> = C extends Control<infer T> ? T : never;

export function notBlankObject<T extends object>(object: T): T | undefined;
export function notBlankObject<T extends object, Default = undefined>(object: T, defaultValue?: Default): T | Default {
    if (isNil(object)) {
        // @ts-ignore
        return defaultValue;
    }
    // @ts-ignore
    return Object.entries(object).every(([, value]) => isNil(value))
        ? defaultValue
        : object;
}

export function isBlankObject(object: any) {
    return notBlankObject(object) === undefined
}

export type PartialRequiredDeclare<T> = {
    [P in keyof Required<T>]: undefined | T[P];
};

export type PartialRequiredNestDeclare<T> = T extends ZodPrimitive ? (T | undefined)
    : T extends Array<any> ? Array<PartialNest<T[number]>>
        : HasFunction<T> extends true ? T
            : {
                [P in keyof Required<T>]: undefined | PartialNest<T[P]>;
            }

export type PartialNest<T> = T extends ZodPrimitive ? (T | undefined)
    : T extends Array<any> ? Array<PartialNest<T[number]>>
        : HasFunction<T> extends true ? T
            : {
                [P in keyof T]?: PartialNest<T[P]>
            }

type HasFunction<T> = {
    [K in keyof T]-?: T[K] extends (...args: any) => any ? K : never;
}[keyof T] extends never ? false : true

export function toNumber(value: any): number | undefined {
    if (isEmpty(value)) {
        return undefined;
    }
    const number = Number(value)
    if (isNaN(number)) {
        return undefined
    }
    return number;
}

export type SerializeCallable<Name extends string, Param, Result> = {
    call: {
        name: Name,
        param: Param,
        callId?: string,
    },
    return: {
        name: Name,
        result: Result,
        callId?: string,
    }
}

export type FullWidth = {
    fullWidth?: true | number,
}
export const fullWidth = (fullWidth?: true | number) => {
    return isNil(fullWidth) ? undefined
        : fullWidth === true
            ? 1
            : fullWidth
}
export const fullWidthProps = (width?: true | number) => {
    if (isNil(width)) {
        return undefined
    }
    const computedWidth = fullWidth(width);
    if (isNil(computedWidth)) {
        return undefined
    }
    return {
        width: computedWidth,
    }
}
export type FullHeight = FullWidth
export const fullHeight = fullWidth
export const fullHeightProps = fullWidthProps