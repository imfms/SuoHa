import MeType, {MeTypeAny} from "./MeType";
import {MeObjectType} from "./MeObjectType";
import MeAnyType from "./MeAnyType";

export default class MeOptionalType<Type extends MeTypeAny> extends MeType<Type["_type"] | undefined, { innerType: Type }> {
    constructor(metadata: { innerType: Type }) {
        super("optional", new MeObjectType({innerType: new MeAnyType()}), metadata);
    }
}