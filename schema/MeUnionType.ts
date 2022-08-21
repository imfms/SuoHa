import MeType, {MeTypeAny} from "./MeType";
import MeListType from "./MeListType";
import MeAnyType from "./MeAnyType";

export default class MeUnionType<Types extends MeTypeAny[]> extends MeType<Types[number]["_type"], Types> {
    constructor(metadata: Types) {
        super("union", new MeListType({valueType: new MeAnyType()}), metadata, new MeUnionType(metadata));
    }
}