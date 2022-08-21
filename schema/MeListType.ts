import MeType, {MeTypeAny} from "./MeType";
import MeAnyType from "./MeAnyType";
import MeObjectType from "./MeObjectType";

export default class MeListType<Type extends MeTypeAny> extends MeType<Type["_type"][], { valueType: Type }> {
    constructor(metadata: { valueType: Type }) {
        super("list", new MeObjectType({valueType: new MeAnyType()}), metadata, new MeListType(metadata));
    }
}
