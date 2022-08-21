import MeType from "./MeType";
import MeVoidType from "./MeVoidType";

export default class MeAnyType extends MeType<any> {
    constructor(metadata: void) {
        super("any", new MeVoidType(), metadata, new MeAnyType());
    }

    check(metadata: void, value: any): boolean {
        return true;
    }
}