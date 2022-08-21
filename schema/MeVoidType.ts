import MeType from "./MeType";

export default class MeVoidType extends MeType<void> {
    constructor(metadata: void) {
        super("void", new MeVoidType(), metadata, new MeVoidType());
    }
}
