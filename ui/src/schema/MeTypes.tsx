import {isNil, Primitive} from "./util";
import {ComponentType, useMemo} from "react";
import {IconButton, Switch, TextField} from "@mui/material";
import Grid2 from "@mui/material/Unstable_Grid2";
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import {isEmpty} from "lodash";

// # MeType
export type MeTypeAny = MeType<any, any>

export type MeValue<Type extends MeTypeAny> = {
    value: Type["_type"],
}

export abstract class MeType<Type, Metadata = void> {
    readonly _type!: Type;
    readonly valueType?: (metadata: any) => MeType<Type, any>;
    readonly metaDataType: () => MeTypeAny;
    readonly metadata: Metadata;
    readonly id: string | number;

    constructor(id: string | number, metadataType: () => MeTypeAny, metadata: Metadata, valueType?: (metadata: Metadata) => MeType<Type, any>) {
        this.id = id;
        this.metadata = metadata;
        this.metaDataType = metadataType;
        this.valueType = valueType;
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

    doCheck(value: Type) {
        if (!(this.valueType?.(this.metadata).doCheck(value) ?? true)) {
            return false;
        }
        return this.check(this.metadata, value)
    }

    protected abstract check(metadata: Metadata, value: Type): boolean;

}

type MeTypeComponentGetter = (type: MeTypeAny["id"]) => MeTypeComponent<MeTypeAny, any>;

type MeTypeComponent<MeType extends MeTypeAny, TempVarType = void> = ComponentType<{
    metadata: MeType["metadata"],
    value: MeType["_type"] | null, tempVariable?: TempVarType
    setValue: (value: MeType["_type"] | null, tempVariable?: TempVarType) => void,
    context: { getTypeComponent: MeTypeComponentGetter }
}>

// # MeNullType
export class MeNullType extends MeType<null> {
    constructor() {
        super("null", () => new MeVoidType(), undefined);
    }

    protected check(metadata: void, value: null): boolean {
        return value === null;
    }
}

// # MeBooleanType
export class MeBooleanType extends MeType<boolean> {
    constructor() {
        super("boolean", () => new MeVoidType(), undefined);
    }

    check(metadata: void, value: boolean): boolean {
        return typeof value === "boolean"
    }
}

const MeComponentBooleanType: MeTypeComponent<MeBooleanType> = ({metadata, value, setValue}) => {
    return <Switch
        checked={value ?? false}
        onChange={(e) => setValue(e.target.checked)}
    />
}

// # MeNumberType
export class MeNumberType extends MeType<number> {
    constructor() {
        super("number", () => new MeVoidType(), undefined);
    }

    check(metadata: void, value: number): boolean {
        return typeof value === "number"
            && !isNaN(value)
            && !isFinite(value)
    }
}

const MeComponentNumberType: MeTypeComponent<MeNumberType, string> = ({metadata, value, tempVariable, setValue}) => {
    return <TextField
        value={tempVariable ?? value ?? null}
        onChange={event => {
            const stringValue = event.target.value
            const numberValue = Number(stringValue)
            const validNumber = isNaN(numberValue) || isFinite(numberValue)
            setValue(validNumber ? numberValue : null, stringValue)
        }}
        inputMode={"decimal"}
        type={"number"}
    />
}

// # MeStringType
export class MeStringType<Metadata extends void = void> extends MeType<string> {
    constructor(metadata: void) {
        super("string", () => new MeVoidType(), metadata);
    }

    check(metadata: void, value: string): boolean {
        return typeof value === "string"
    }
}

const MeComponentStringType: MeTypeComponent<MeStringType> = ({metadata, value, setValue}) => {
    return <TextField
        value={value ?? null}
        onChange={event => {
            setValue(event.target.value ?? null)
        }}
    />
}

// # MeLiteralType
export class MeLiteralType<Value extends Primitive = Primitive> extends MeType<Value, Value> {
    constructor(metadata: Value) {
        super("literal", () => new MeUnionType([
            new MeNumberType(), new MeStringType(), new MeBooleanType()
        ]), metadata);
    }

    check(metadata: Value, value: Value): boolean {
        return metadata === value;
    }
}

const MeComponentLiteralType: MeTypeComponent<MeLiteralType> = ({metadata, value, setValue}) => {
    if (value === null) {
        setTimeout(() => setValue(metadata))
    }
    switch (typeof metadata) {
        case "boolean":
            return <Switch readOnly checked={metadata}/>
        case "number":
        case "string":
            return <TextField
                value={String(metadata)}
                InputProps={{readOnly: true}}
            />
    }
}

// # MeListType
export type MeListTypeValueType<Type extends MeTypeAny> = Type["_type"][]
export type MeListTypeMetadataType<Type extends MeTypeAny> = { valueType: Type }

export class MeListType<Type extends MeTypeAny> extends MeType<MeListTypeValueType<Type>, MeListTypeMetadataType<Type>> {
    constructor(metadata: MeListTypeMetadataType<Type>) {
        super("list", () => new MeObjectType({valueType: new MeAnyType()}), metadata);
    }

    check(metadata: MeListTypeMetadataType<Type>, values: MeListTypeValueType<Type>): boolean {
        if (!Array.isArray(values)) {
            return false;
        }

        for (let value of values) {
            if (!metadata.valueType.doCheck(value)) {
                return false;
            }
        }
        return true;
    }
}

const MeComponentListType: MeTypeComponent<MeListType<MeTypeAny>, any[]> = ({
                                                                                metadata,
                                                                                value: values,
                                                                                tempVariable: tempVariables,
                                                                                setValue: setValues,
                                                                                context
                                                                            }) => {

    const ItemComponent = useMemo(
        () => context.getTypeComponent(metadata.valueType.id),
        [metadata.valueType.id]
    );

    return <Grid2 container>
        {(values ?? []).map((itemValue, itemIndex) => {
            return <Grid2 container>
                <Grid2 xs>
                    <ItemComponent
                        context={context}
                        metadata={metadata.valueType.metadata}
                        value={itemValue}
                        tempVariable={tempVariables?.[itemIndex] ?? null}
                        setValue={(newItemValue, newItemTempVariable) => {
                            setValues(
                                (values ?? []).map((itemValue, index) => index !== itemIndex ? itemValue : newItemValue),
                                (tempVariables ?? []).map((itemTempVariable, index) => index !== itemIndex ? itemTempVariable : newItemTempVariable)
                            )
                        }}
                    />
                </Grid2>
                <Grid2 xs={"auto"}>
                    <IconButton onClick={() => {
                        setValues(
                            (values ?? []).filter((_, index) => index !== itemIndex),
                            (tempVariables ?? []).filter((_, index) => index !== itemIndex)
                        )
                    }}>
                        <HighlightOffIcon/>
                    </IconButton>
                </Grid2>
            </Grid2>
        })}
        <Grid2>
            <IconButton onClick={() => {
                setValues(
                    (values ?? []).concat(null),
                    (tempVariables ?? []).concat(null)
                )
            }}>
                <AddCircleOutlineIcon/>
            </IconButton>
        </Grid2>
    </Grid2>
}


// # MeOptionalType
export type MeOptionalTypeValueType<ValueType extends MeTypeAny> = ValueType["_type"] | null
export type MeOptionalTypeMetadataType<ValueType extends MeTypeAny> = { innerType: ValueType }

export class MeOptionalType<Type extends MeTypeAny> extends MeType<MeOptionalTypeValueType<Type>, MeOptionalTypeMetadataType<Type>> {
    constructor(metadata: MeOptionalTypeMetadataType<Type>) {
        super("optional", () => new MeObjectType({innerType: new MeAnyType()}), metadata, (metadata) => new MeUnionType([
            metadata.innerType, new MeNullType()
        ]));
    }

    check(metadata: MeOptionalTypeMetadataType<Type>, value: MeOptionalTypeValueType<Type>): boolean {
        if (value === null) {
            return true;
        }
        return metadata.innerType.doCheck(value)
    }
}

// # MeRecordType
export type MeRecordTypeValueType<ValueType extends MeTypeAny> = {
    [key: string]: ValueType["_type"],
}
export type MeRecordTypeMetadataType<ValueType extends MeTypeAny> = {
    valueType: ValueType,
}

export class MeRecordType<ValueType extends MeTypeAny> extends MeType<MeRecordTypeValueType<ValueType>, MeRecordTypeMetadataType<ValueType>> {

    constructor(metadata: MeRecordTypeMetadataType<ValueType>) {
        super("record", () => new MeObjectType({valueType: new MeAnyType()}), metadata);
    }

    check(metadata: MeRecordTypeMetadataType<ValueType>, record: MeRecordTypeValueType<ValueType>): boolean {
        if (isNil(record)) {
            return false;
        }
        if (typeof record !== "object") {
            return false;
        }
        for (let key in record) {
            if (!metadata.valueType.doCheck(record[key])) {
                return false;
            }
        }
        return true;
    }

}

const MeComponentRecordType: MeTypeComponent<MeRecordType<MeTypeAny>, { [key: string]: any }> = ({
                                                                                                     metadata,
                                                                                                     value: values,
                                                                                                     tempVariable: tempVariables,
                                                                                                     setValue: setValues,
                                                                                                     context
                                                                                                 }) => {
    const ItemComponent = useMemo(
        () => context.getTypeComponent(metadata.valueType.id),
        [metadata.valueType.id]
    );

    return <Grid2 container>
        {Object.entries(values ?? {}).map(([itemIndex, itemValue]) => {
            return <Grid2 container>
                <Grid2 xs={"auto"}>
                    <TextField value={itemIndex} InputProps={{readOnly: true}}/>
                </Grid2>
                <Grid2 xs>
                    <ItemComponent
                        context={context}
                        metadata={metadata.valueType.metadata}
                        value={itemValue}
                        tempVariable={tempVariables?.[itemIndex] ?? null}
                        setValue={(newItemValue, newItemTempVariable) => {
                            const newValues = {...values};
                            newValues[itemIndex] = newItemValue;

                            const newTempVariables = {...tempVariables};
                            newTempVariables[itemIndex] = newItemTempVariable;

                            setValues(newValues, newTempVariables)
                        }}
                    />
                </Grid2>
                <Grid2 xs={"auto"}>
                    <IconButton onClick={() => {
                        const newValues = {...values};
                        delete newValues[itemIndex];

                        const newTempVariables = {...tempVariables};
                        delete newTempVariables[itemIndex];

                        setValues(newValues, newTempVariables)
                    }}>
                        <HighlightOffIcon/>
                    </IconButton>
                </Grid2>
            </Grid2>
        })}
        <Grid2>
            <IconButton onClick={() => {
                const key = prompt("Enter key", "");
                if (isEmpty(key)) {
                    return;
                }
                if (Reflect.has(values ?? {}, key as string)) {
                    alert(`key '${key}' already exists`);
                    return;
                }
                setValues(
                    {...values, [key as string]: null},
                    {...tempVariables, [key as string]: null}
                )
            }}>
                <AddCircleOutlineIcon/>
            </IconButton>
        </Grid2>
    </Grid2>
}

// # MeObjectType
export type flatten<T extends object> = { [k in keyof T]: T[k] };
type optionalKeys<T extends object> = {
    [k in keyof T]: undefined extends T[k] ? k : never;
}[keyof T];

type requiredKeys<T extends object> = {
    [k in keyof T]: undefined extends T[k] ? never : k;
}[keyof T];
export type addQuestionMarks<T extends object> = Partial<Pick<T, optionalKeys<T>>> &
    Pick<T, requiredKeys<T>>;
export type baseObjectType<Shape extends ObjectShape> = flatten<addQuestionMarks<{
    [k in keyof Shape]: Shape[k]["_type"];
}>>;

type ObjectShape = { [key: string]: MeTypeAny };

export class MeObjectType<Shape extends ObjectShape> extends MeType<baseObjectType<Shape>, Shape> {
    constructor(metadata: Shape) {
        super("object", () => new MeRecordType({valueType: new MeAnyType()}), metadata);
    }

    check(shape: Shape, objectValue: baseObjectType<Shape>): boolean {
        if (isNil(objectValue)) {
            return false;
        }
        for (let key in shape) {
            const propertyType = shape[key];
            // @ts-ignore
            const value = objectValue[key];
            if (!propertyType.doCheck(value)) {
                return false;
            }
        }
        return true;
    }
}

const MeComponentObjectType: MeTypeComponent<MeObjectType<{ [key: string]: MeTypeAny }>, { [key: string]: any }> = ({
                                                                                                                        metadata,
                                                                                                                        value: objectValue,
                                                                                                                        tempVariable: objectTempVariable,
                                                                                                                        setValue: setValues,
                                                                                                                        context
                                                                                                                    }) => {

    const ObjectComponent = useMemo(
        () => Object.fromEntries(
            Object.entries(metadata)
                .map(([key, propertyType]) => [key, context.getTypeComponent(propertyType.id)])
        ),
        [metadata]
    );

    return <Grid2 container>
        {Object.entries(metadata).map(([key, value]) => {
            const ItemComponent = ObjectComponent[key];
            return <Grid2 container>
                <Grid2 xs={"auto"}>
                    <TextField value={key} InputProps={{readOnly: true}}/>
                </Grid2>
                <Grid2 xs>
                    <ItemComponent
                        context={context}
                        metadata={metadata.valueType.metadata}
                        value={value}
                        tempVariable={objectTempVariable?.[key] ?? null}
                        setValue={(newValue, newTempVariable) => {
                            const newObjectValue = {...objectValue};
                            newObjectValue[key] = newValue;

                            const newObjectTempVariable = {...objectTempVariable};
                            newObjectTempVariable[key] = newTempVariable;

                            setValues(newObjectValue, newObjectTempVariable)
                        }}
                    />
                </Grid2>
            </Grid2>
        })}
    </Grid2>
}

// # MeTypeType
export class MeTypeType<Type extends MeTypeAny> extends MeType<Type, Type> {
    constructor(metadata: Type) {
        super("type", () => new MeAnyType(), metadata);
    }

    check(metadata: Type, value: Type): boolean {
        return metadata.id === value.id;
    }
}

// # MeUnionType
export type MeUnionTypeValueType<Types extends MeTypeAny[]> = Types[number]["_type"]
export type MeUnionTypeMetadataType<Types extends MeTypeAny[]> = Types

export class MeUnionType<Types extends MeTypeAny[]> extends MeType<MeUnionTypeValueType<Types>, MeUnionTypeMetadataType<Types>> {
    constructor(metadata: Types) {
        super("union", () => new MeListType({valueType: new MeAnyType()}), metadata);
    }

    check(meTypes: MeUnionTypeMetadataType<Types>, value: MeUnionTypeValueType<Types>): boolean {
        for (let meType of meTypes) {
            if (meType.doCheck(value)) {
                return true;
            }
        }
        return false;
    }
}

// # MeVoidType
export class MeVoidType extends MeType<void> {
    constructor(metadata: void) {
        super("void", () => new MeVoidType(), metadata);
    }

    check(metadata: void, value: void): boolean {
        return isNil(value);
    }
}

// # MeFileTypeMetadata
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

export class MeFileType<Metadata extends MeFileTypeMetadata = MeFileTypeMetadata> extends MeType<MeFileTypeValue, Metadata> {
    constructor(metadata: Metadata) {
        super("file", () => meMetadataType, metadata, (metadata) => new MeObjectType({
            ...meFileTypeValueType.metadata,
            ...isNil(metadata.type) ? {} : {
                type: new MeLiteralType(metadata.type),
            },
        }));
    }

    check(metadata: Metadata, value: MeFileTypeValue): boolean {
        return true;
    }
}

// # MeImageType
const meImageTypeValueType = new MeObjectType({
    file: new MeFileType<{ type: "jpg" }>({
        type: "jpg",
    }),
})
type MeImageTypeValue = typeof meImageTypeValueType["_type"]

export class MeImageType extends MeType<MeImageTypeValue> {
    constructor(metadata: void) {
        super("file", () => new MeVoidType(), metadata);
    }

    check(metadata: void, value: MeImageTypeValue): boolean {
        return true;
    }
}

// # MeAnyType
export class MeAnyType extends MeType<any> {
    constructor() {
        super("any", () => new MeVoidType());
    }

    check(metadata: void, value: any): boolean {
        return true;
    }
}