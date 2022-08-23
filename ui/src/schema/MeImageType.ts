import MeType from "./MeType";
import MeFileType from "./MeFileType";
import MeVoidType from "./MeVoidType";
import MeObjectType from "./MeObjectType";

const meImageTypeValueType = new MeObjectType({
    file: new MeFileType<{ type: "jpg" }>({
        type: "jpg",
    }),
})
type MeImageTypeValue = typeof meImageTypeValueType["_type"]

export default class MeImageType extends MeType<MeImageTypeValue> {
    constructor(metadata: void) {
        super(
            "file", new MeVoidType(), metadata,
            new MeImageType()
        );
    }

    check(metadata: void, value: MeImageTypeValue): boolean {
        return true;
    }
}