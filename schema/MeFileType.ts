import MeType from "./MeType";
import MeObjectType from "./MeObjectType";
import {MeStringType} from "./MeStringType";

export type MeFileTypeValue = {
    name: string,
    length: number, // TODO 自动生成类字段
    mimeType: string,
    type: string,
    createTime: Date,
    modifyTime: Date,
    attrs: { [key: string]: string }, // todo auto map target type
    contentBase64: string,
}
export default class MeFileType<Metadata extends { type: string } = { type: string }> extends MeType<MeFileTypeValue, Metadata> {
    constructor(metadata: Metadata) {
        super("file", new MeObjectType({type: new MeStringType()}), metadata);
    }
}