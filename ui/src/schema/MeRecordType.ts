import MeType, {MeTypeAny} from "./MeType";
import MeAnyType from "./MeAnyType";
import MeObjectType from "./MeObjectType";
import {isNil, type} from "./util";

export type MeRecordTypeValueType<ValueType extends MeTypeAny> = {
    [key: string]: ValueType["_type"],
}
export type MeRecordTypeMetadataType<ValueType extends MeTypeAny> = {
    valueType: ValueType,
}

class A {
    readonly field: number;

    constructor(field: number) {
        this.field = field;
    }
}

const a : A = {
    field: 1,
}

export default class MeRecordType<ValueType extends MeTypeAny> extends MeType<MeRecordTypeValueType<ValueType>, MeRecordTypeMetadataType<ValueType>> {

    constructor(metadata: MeRecordTypeMetadataType<ValueType>) {

        // const type1 = type<typeof MeObjectType>({
        //
        // });

        const type1 : MeObjectType<{valueType: MeAnyType}> = {
            metadata: {valueType: new MeAnyType()},
            metaDataMeType: {
            }
        }

        super("record", new MeObjectType({valueType: new MeAnyType()}), metadata);
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