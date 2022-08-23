import MeType, {MeTypeAny} from "./MeType";
import MeAnyType from "./MeAnyType";
import MeObjectType from "./MeObjectType";

export type MeListTypeValueType<Type extends MeTypeAny> = Type["_type"][]
export type MeListTypeMetadataType<Type extends MeTypeAny> = { valueType: Type }

export default class MeListType<Type extends MeTypeAny> extends MeType<MeListTypeValueType<Type>, MeListTypeMetadataType<Type>> {
    constructor(metadata: MeListTypeMetadataType<Type>) {
        super("list", new MeObjectType({valueType: new MeAnyType()}), metadata);
    }

    check(metadata: MeListTypeMetadataType<Type>, values: MeListTypeValueType<Type>): boolean {
        if (!Array.isArray(values)) {
            return false;
        }

        for (let value of values) {
            if (!metadata.valueType.doCheck(metadata.valueType.metadata, metadata.valueType.meType, value)) {
                return false;
            }
        }
        return true;
    }
}
