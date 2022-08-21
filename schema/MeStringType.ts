import MeType from "./MeType";
import MeVoidType from "./MeVoidType";

export class MeStringType<Metadata extends void = void> extends MeType<string> {
    constructor(metadata: void) {
        super("string", new MeVoidType(), metadata, new MeStringType());
    }

    check(metadata: void, value: string): boolean {
        return typeof value === "string"
    }
}