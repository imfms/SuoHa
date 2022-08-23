import MeType from "./MeType";
import {isNil} from "./util";

export default class MeVoidType extends MeType<void> {
    constructor(metadata: void) {
        super("void", new MeVoidType(), metadata);
    }

    check(metadata: void, value: void): boolean {
        return isNil(value);
    }
}
