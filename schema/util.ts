export type Primitive = string | number | boolean | null;

export const isNil = (value: any): value is undefined => {
    return value === undefined || value === null;
}