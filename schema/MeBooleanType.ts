import MeType from "./MeType";
import MeVoidType from "./MeVoidType";

export default class MeBooleanType extends MeType<boolean> {
    constructor(metadata: void) {
        super("boolean", new MeVoidType(), metadata, new MeBooleanType());
    }

    check(metadata: void, value: boolean): boolean {
        return typeof value === "boolean"
    }
}
