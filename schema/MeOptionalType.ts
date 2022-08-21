import MeType, {MeTypeAny} from "./MeType";
import MeAnyType from "./MeAnyType";
import MeObjectType from "./MeObjectType";
import MeUnionType from "./MeUnionType";
import MeLiteralType from "./MeLiteralType";

export default class MeOptionalType<Type extends MeTypeAny> extends MeType<Type["_type"] | undefined, { innerType: Type }> {
    constructor(metadata: { innerType: Type }) {
        super(
            "optional", new MeObjectType({innerType: new MeAnyType()}), metadata,
            new MeUnionType([
                metadata.innerType, new MeLiteralType(null)
            ])
        );
    }
}