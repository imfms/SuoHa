export type Primitive = string | number | boolean;

export const isNil = (value: any): value is undefined => {
    return value === undefined || value === null;
}
export const isNull = (value: any): value is null => {
    return value === undefined || value === null;
}

export const type = <Type> (value: Type) => {
    return value;
}