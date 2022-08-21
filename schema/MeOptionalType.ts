import MeType, {MeTypeAny} from "./MeType";
import MeAnyType from "./MeAnyType";
import MeObjectType from "./MeObjectType";
import MeUnionType from "./MeUnionType";
import MeLiteralType from "./MeLiteralType";

export type MeOptionalTypeValueType<ValueType extends MeTypeAny> = ValueType["_type"] | null
export type MeOptionalTypeMetadataType<ValueType extends MeTypeAny> = { innerType: ValueType }

export default class MeOptionalType<Type extends MeTypeAny> extends MeType<MeOptionalTypeValueType<Type>, MeOptionalTypeMetadataType<Type>> {
    constructor(metadata: MeOptionalTypeMetadataType<Type>) {
        super(
            "optional", new MeObjectType({innerType: new MeAnyType()}), metadata,
            new MeUnionType([
                metadata.innerType, new MeLiteralType(null)
            ])
        );
    }

    check(metadata: MeOptionalTypeMetadataType<Type>, value: MeOptionalTypeValueType<Type>): boolean {
        if (value === null) {
            return true;
        }
        return metadata.innerType.doCheck(metadata.innerType.metadata, metadata.innerType.meType, value)
    }
}