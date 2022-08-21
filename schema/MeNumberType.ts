import MeType from "./MeType";
import MeVoidType from "./MeVoidType";

export default class MeNumberType extends MeType<number> {
    constructor(metadata: void) {
        super("number", new MeVoidType(), metadata, new MeNumberType());
    }
}
