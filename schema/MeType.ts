import MeOptionalType from "./MeOptionalType";
import MeListType from "./MeListType";

export default abstract class MeType<Type, Metadata = void> {
    readonly _type!: Type;
    readonly meType: MeType<Type, any>;
    readonly metaDataMeType: MeType<any, any>;
    readonly metadata: Metadata;
    readonly id: string | number;

    protected constructor(id: string | number, metadataType: MeType<any, any>, metadata: Metadata, valueType: MeType<Type, any>) {
        this.id = id;
        this.metaDataMeType = metadataType;
        this.metadata = metadata;
        this.meType = valueType;
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

    doCheck(metadata: Metadata, meType: MeType<Type, any>, value: Type) {
        if (!meType.doCheck(meType.metadata, meType.meType, value)) {
            return false;
        }
        return this.check(metadata, value)
    }

    protected abstract check(metadata: Metadata, value: Type): boolean;
}

export type MeTypeAny = MeType<any, any>

export type MeValue<Type extends MeTypeAny> = {
    value: Type["_type"],
}