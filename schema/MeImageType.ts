import MeType from "./MeType";
import MeFileType from "./MeFileType";
import MeVoidType from "./MeVoidType";

type ImageValue = {
    file: MeFileType<{ type: "jpg" }>,
}
export default class MeImageType extends MeType<ImageValue> {
    constructor(metadata: void) {
        super("file", new MeVoidType(), metadata);
    }
}