import MeType, {MeTypeAny} from "./MeType";
import {MeObjectType} from "./MeObjectType";
import MeAnyType from "./MeAnyType";

export default class MeRecordType<ValueType extends MeTypeAny> extends MeType<{ [key: string]: ValueType["_type"] }, { valueType: ValueType }> {
    constructor(metadata: { valueType: ValueType }) {
        super("record", new MeObjectType({valueType: new MeAnyType()}), metadata);
    }
}