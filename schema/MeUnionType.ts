import MeType, {MeTypeAny} from "./MeType";
import MeListType from "./MeListType";
import MeAnyType from "./MeAnyType";

export type MeUnionTypeValueType<Types extends MeTypeAny[]> = Types[number]["_type"]
export type MeUnionTypeMetadataType<Types extends MeTypeAny[]> = Types

export default class MeUnionType<Types extends MeTypeAny[]> extends MeType<MeUnionTypeValueType<Types>, MeUnionTypeMetadataType<Types>> {
    constructor(metadata: Types) {
        super("union", new MeListType({valueType: new MeAnyType()}), metadata, new MeUnionType(metadata));
    }

    check(meTypes: MeUnionTypeMetadataType<Types>, value: MeUnionTypeValueType<Types>): boolean {
        for (let meType of meTypes) {
            if (meType.doCheck(meType.metadata, meType.meType, value)) {
                return true;
            }
        }
        return false;
    }
}