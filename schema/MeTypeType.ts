import MeType, {MeTypeAny} from "./MeType";
import MeAnyType from "./MeAnyType";

export default class MeTypeType<Type extends MeTypeAny> extends MeType<Type, Type> {
    constructor(metadata: Type) {
        super("type", new MeAnyType(), metadata, metadata);
    }
}
