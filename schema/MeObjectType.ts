import MeType, {MeTypeAny} from "./MeType";
import MeRecordType from "./MeRecordType";
import MeAnyType from "./MeAnyType";
import {isNil} from "./util";

export type flatten<T extends object> = { [k in keyof T]: T[k] };
type optionalKeys<T extends object> = {
    [k in keyof T]: undefined extends T[k] ? k : never;
}[keyof T];

type requiredKeys<T extends object> = {
    [k in keyof T]: undefined extends T[k] ? never : k;
}[keyof T];
export type addQuestionMarks<T extends object> = Partial<Pick<T, optionalKeys<T>>> &
    Pick<T, requiredKeys<T>>;
export type baseObjectType<Shape extends ObjectShape> = flatten<addQuestionMarks<{
    [k in keyof Shape]: Shape[k]["_type"];
}>>;

type ObjectShape = { [key: string]: MeTypeAny };

export default class MeObjectType<Shape extends ObjectShape> extends MeType<baseObjectType<Shape>, Shape> {
    constructor(metadata: Shape) {
        super("object", new MeRecordType({valueType: new MeAnyType()}), metadata, new MeObjectType(metadata));
    }

    check(shape: Shape, objectValue: baseObjectType<Shape>): boolean {
        if (isNil(objectValue)) {
            return false;
        }
        for (let key in shape) {
            const propertyType = shape[key];
            // @ts-ignore
            const value = objectValue[key];
            if (!propertyType.doCheck(propertyType.metadata, propertyType.meType, value)) {
                return false;
            }
        }
        return true;
    }
}
