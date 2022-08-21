import MeType, {MeTypeAny} from "./MeType";
import MeAnyType from "./MeAnyType";
import MeObjectType from "./MeObjectType";

export default class MeRecordType<ValueType extends MeTypeAny> extends MeType<{ [key: string]: ValueType["_type"] }, { valueType: ValueType }> {
    constructor(metadata: { valueType: ValueType }) {
        super("record", new MeObjectType({valueType: new MeAnyType()}), metadata, new MeRecordType(metadata));
    }
}