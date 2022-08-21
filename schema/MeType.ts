import MeOptionalType from "./MeOptionalType";
import MeListType from "./MeListType";

export default abstract class MeType<Type, Metadata = void> {
    readonly _type!: Type;
    readonly metaDataType: MeType<any, any>;
    readonly metadata: Metadata;
    readonly id: string | number;

    protected constructor(id: string | number, metadataType: MeType<any, any>, metadata: Metadata) {
        this.id = id;
        this.metaDataType = metadataType;
        this.metadata = metadata;
    }

    optional(): MeOptionalType<this> {
        return new MeOptionalType<this>({
            innerType: this,
        })
    }

    list(): MeListType<this> {
        return new MeListType<this>({
            valueType: this,
        })
    }

    check(value: Type): boolean {
        return false
    }
}

export type MeTypeAny = MeType<any, any>

export type MeValue<Type extends MeTypeAny> = {
    value: Type["_type"],
}