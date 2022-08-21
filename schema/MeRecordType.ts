import MeType, {MeTypeAny} from "./MeType";
import MeAnyType from "./MeAnyType";
import MeObjectType from "./MeObjectType";
import {isNil} from "./util";

export type MeRecordTypeValueType<ValueType extends MeTypeAny> = {
    [key: string]: ValueType["_type"],
}
export type MeRecordTypeMetadataType<ValueType extends MeTypeAny> = {
    valueType: ValueType,
}

export default class MeRecordType<ValueType extends MeTypeAny> extends MeType<MeRecordTypeValueType<ValueType>, MeRecordTypeMetadataType<ValueType>> {

    constructor(metadata: MeRecordTypeMetadataType<ValueType>) {
        super("record", new MeObjectType({valueType: new MeAnyType()}), metadata, new MeRecordType(metadata));
    }

    check(metadata: MeRecordTypeMetadataType<ValueType>, record: MeRecordTypeValueType<ValueType>): boolean {
        if (isNil(record)) {
            return false;
        }
        if (typeof record !== "object") {
            return false;
        }
        for (let key in record) {
            if (!metadata.valueType.doCheck(metadata.valueType.metadata, metadata.valueType.meType, record[key])) {
                return false;
            }
        }
        return true;
    }

}