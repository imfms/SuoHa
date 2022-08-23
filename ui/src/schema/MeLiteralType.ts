import MeType from "./MeType";
import {Primitive} from "./util";

export default class MeLiteralType<Value extends Primitive = Primitive> extends MeType<Value, Value> {
    constructor(metadata: Value) {
        super("literal", new MeLiteralType(metadata), metadata);
    }

    check(metadata: Value, value: Value): boolean {
        return metadata === value;
    }
}
