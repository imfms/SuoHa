import MeType from "./MeType";
import MeVoidType from "./MeVoidType";

export default class MeNumberType extends MeType<number> {
    constructor(metadata: void) {
        super("number", new MeVoidType(), metadata);
    }

    check(metadata: void, value: number): boolean {
        return typeof value === "number"
            && !isNaN(value)
            && !isFinite(value)
    }
}
