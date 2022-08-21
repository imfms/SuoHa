import MeType from "./MeType";
import MeObjectType from "./MeObjectType";
import {MeStringType} from "./MeStringType";
import MeNumberType from "./MeNumberType";
import MeRecordType from "./MeRecordType";
import {isNil} from "./util";
import MeLiteralType from "./MeLiteralType";

const meMetadataType = new MeObjectType({
    type: new MeStringType(),
});
export type MeFileTypeMetadata = typeof meMetadataType["_type"];

const meFileTypeValueType = new MeObjectType({
    name: new MeStringType(),
    length: new MeNumberType(), // 自动生成类字段
    mimeType: new MeStringType(),
    type: new MeStringType(),
    attrs: new MeRecordType({valueType: new MeStringType()}),
    contentBase64: new MeStringType(),
});
export type MeFileTypeValue = typeof meFileTypeValueType["_type"];

export default class MeFileType<Metadata extends MeFileTypeMetadata = MeFileTypeMetadata> extends MeType<MeFileTypeValue, Metadata> {
    constructor(metadata: Metadata) {
        super(
            "file", meMetadataType, metadata,
            new MeObjectType({
                ...meFileTypeValueType.metadata,
                ...isNil(metadata.type) ? {} : {
                    type: new MeLiteralType(metadata.type),
                },
            })
        );
    }
}