import {isNil, isNull, Primitive} from "./util";
import {ComponentType, useMemo, useRef} from "react";
import {FormControl, IconButton, InputLabel, MenuItem, Select, Switch, TextField} from "@mui/material";
import Grid2 from "@mui/material/Unstable_Grid2";
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DownloadIcon from '@mui/icons-material/Download';
import {isEmpty} from "lodash";

// # MeType
export type MeTypeAny = MeType<any, any>

export type MeValue<Type extends MeTypeAny> = {
    value: Type["_type"],
}

export abstract class MeType<Type, Metadata = void> {
    readonly _type!: Type;
    readonly valueType?: (metadata: any) => MeType<Type, any>;
    readonly metaDataType: () => MeType<Metadata>;
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

type MeTypeComponentGetter = (type: MeTypeAny["id"]) => MeTypeComponent<MeTypeAny, any>
type MeTypeComponentContext = { getTypeComponent: MeTypeComponentGetter }

type MeTypeComponent<MeType extends MeTypeAny, TempVarType = void, ValueType = MeType["_type"]> = ComponentType<{
    metadata: MeType["metadata"],
    value: ValueType | null, tempVariable?: TempVarType
    setValue: (value: ValueType | null, tempVariable?: TempVarType) => void,
    context: MeTypeComponentContext,
}>

// # MeAnyType
export class MeAnyType extends MeType<any> {
    static readonly BASE_TYPE = new MeAnyType()
    constructor() {
        super("any", () => new MeVoidType());
    }

    check(metadata: void, value: any): boolean {
        return true;
    }
}

// # MeNullType
export class MeNullType extends MeType<null> {
    static readonly BASE_TYPE = new MeNullType()
    constructor() {
        super("null", () => new MeVoidType(), undefined);
    }

    protected check(metadata: void, value: null): boolean {
        return value === null;
    }
}

const MeComponentNullType: MeTypeComponent<MeNullType> = () => <></>

// # MeBooleanType
export class MeBooleanType extends MeType<boolean> {
    static readonly BASE_TYPE = new MeBooleanType()
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
    static readonly BASE_TYPE = new MeNumberType()
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
    static readonly BASE_TYPE = new MeStringType()
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
    static readonly BASE_TYPE = new MeLiteralType(0)
    constructor(metadata: Value) {
        super("literal", () => new MeUnionType([
            {name: "数值", type: new MeNumberType()}, {name: "文本", type: new MeStringType()}, {name: "开关", type: new MeBooleanType()}
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
    static readonly BASE_TYPE = new MeListType({valueType: new MeNullType()})
    constructor(metadata: MeListTypeMetadataType<Type>) {
        super("list", () => new MeObjectType({valueType: new MeTypeType(new MeAnyType())}), metadata);
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

    return <Grid2 container direction={"column"}>
        {(values ?? []).map((itemValue, itemIndex) => {
            return <Grid2 container>
                <Grid2 xs>
                    <ItemComponent
                        context={context}
                        metadata={metadata.valueType.metadata}
                        value={itemValue}
                        tempVariable={tempVariables?.[itemIndex] ?? undefined}
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
    static readonly BASE_TYPE = new MeOptionalType({innerType: new MeStringType()});
    constructor(metadata: MeOptionalTypeMetadataType<Type>) {
        super("optional", () => new MeObjectType({innerType: new MeAnyType()}), metadata, (metadata) => new MeUnionType([
            {name: String(metadata.innerType.id), /*TODO*/ type: metadata.innerType}, {name: "空值", type: new MeNullType()}
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
    static readonly BASE_TYPE = new MeRecordType({valueType: new MeStringType()})
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

    return <Grid2 container direction={"column"}>
        {Object.entries(values ?? {}).map(([itemIndex, itemValue]) => {
            return <Grid2 container>
                <Grid2 xs={"auto"}>
                    <TextField value={itemIndex} label={"名称"} InputProps={{readOnly: true}} inputProps={{size: 8}}/>
                </Grid2>
                <Grid2 xs>
                    <ItemComponent
                        context={context}
                        metadata={metadata.valueType.metadata}
                        value={itemValue}
                        tempVariable={tempVariables?.[itemIndex] ?? undefined}
                        setValue={(newItemValue, newItemTempVariable) => {
                            const newValues = {
                                ...values,
                                [itemIndex]: newItemValue,
                            };

                            const newTempVariables = {
                                ...tempVariables,
                                [itemIndex]: newItemTempVariable
                            };

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
                const key = prompt("输入名称", "");
                if (isEmpty(key)) {
                    return;
                }
                if (Reflect.has(values ?? {}, key as string)) {
                    alert(`名称 '${key}' 已存在`);
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
    static readonly BASE_TYPE = new MeObjectType({})
    constructor(metadata: Shape) {
        super("object", () => new MeRecordType({valueType: new MeTypeType(new MeAnyType())}), metadata);
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

    return <Grid2 container direction={"column"}>
        {Object.entries(metadata).map(([valueKey, valueType]) => {
            const ItemComponent = ObjectComponent[valueKey];
            return <Grid2 container>
                <Grid2 xs={"auto"}>
                    <TextField value={valueKey} InputProps={{readOnly: true}}/>
                </Grid2>
                <Grid2 xs>
                    <ItemComponent
                        context={context}
                        metadata={valueType.metadata}
                        value={objectValue?.[valueKey] ?? null}
                        tempVariable={objectTempVariable?.[valueKey] ?? undefined}
                        setValue={(newValue, newTempVariable) => {
                            const newObjectValue = {
                                ...objectValue,
                                [valueKey]: newValue
                            };
                            const newObjectTempVariable = {
                                ...objectTempVariable,
                                [valueKey]: newTempVariable,
                            };
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
    static readonly BASE_TYPE = new MeAnyType()
    constructor(metadata: Type) {
        super("type", () => new MeAnyType(), metadata);
    }

    check(metadata: Type, value: Type): boolean {
        return metadata.id === value.id;
    }
}

const MeComponentTypeType: MeTypeComponent<MeTypeType<MeTypeAny>, { values: any[], tempVariables: any[] }>
    = ({
           metadata,
           context,
           value, tempVariable, setValue,
       }) => {

    const types = [
        {
            name: "文本",
            type: MeStringType.BASE_TYPE,
        },
        {
            name: "数值",
            type: MeNumberType.BASE_TYPE,
        },
        {
            name: "开关",
            type: MeBooleanType.BASE_TYPE,
        },
        {
            name: "对象",
            type: MeObjectType.BASE_TYPE,
        },
        {
            name: "列表",
            type: MeListType.BASE_TYPE,
        },
        {
            name: "文件",
            type: MeFileType.BASE_TYPE,
        },
        {
            name: "图像",
            type: MeImageType.BASE_TYPE,
        },
    ]

    const typeMetadatas = types.map(type => ({
        name: type.name,
        type: type.type.metaDataType(),
    }));

    let value1 = (value === null || value === undefined) ? null : {
        index: types.findIndex(type => type.type.id === value.id),
        value: value.metadata
    };
    return <MeComponentUnionType
        context={context} metadata={typeMetadatas}
        value={value1}
        tempVariable={tempVariable}
        setValue={(newValue, newTempVariable) => {
            if (isNull(newValue)) {
                setValue(null, newTempVariable);
            } else {
                const {index, value: metadata} = newValue;
                setValue(
                    // @ts-ignore
                    {
                        id: types[index].type.id,
                        metadata: metadata,
                    },
                    newTempVariable
                )
            }
        }}
    />
}

// # MeUnionType
export type MeUnionTypeValueType<Types extends {name: string, type: MeTypeAny}[]> = Types[number]["type"]["_type"]
export type MeUnionTypeMetadataType<Types extends {name: string, type: MeTypeAny}[]> = Types

export class MeUnionType<Types extends {name: string, type: MeTypeAny}[]> extends MeType<MeUnionTypeValueType<Types>, MeUnionTypeMetadataType<Types>> {
    static readonly BASE_TYPE = new MeUnionType([])
    constructor(metadata: Types) {
        super("union", () => new MeListType({valueType: new MeAnyType()}), metadata);
    }

    check(meTypes: MeUnionTypeMetadataType<Types>, value: MeUnionTypeValueType<Types>): boolean {
        for (let meType of meTypes) {
            if (meType.type.doCheck(value)) {
                return true;
            }
        }
        return false;
    }
}

const MeComponentUnionType: MeTypeComponent<MeUnionType<{name: string, type: MeTypeAny}[]>, { values: any[], tempVariables: any[] }, {index: number, value: any}>
    = ({
           metadata: metadata,
           value,
           tempVariable = {
               values: Array.apply(null, Array(metadata.length)),
               tempVariables: Array.apply(null, Array(metadata.length)),
           },
           setValue,
           context
       }) => {

    const componentGetter = useMemo(
        () => {
            const lazyLoadComponents: MeTypeComponent<any, any>[] = []
            return (index: number) => {
                return lazyLoadComponents[index] ??= context.getTypeComponent(metadata[index].type.id);
            }
        },
        metadata
    )

    const index = value?.index ?? null

    const Component = useMemo(() => index === null ? () => <></> : componentGetter(index), [index])

    if (metadata.length === 1) {
        return <Component
            context={context} metadata={metadata[0].type.metadata}
            value={value} tempVariable={tempVariable.tempVariables[0]}
            setValue={setValue}
        />
    }

    return <Grid2 container>
        <Grid2 minWidth={"12ch"}>
            <FormControl fullWidth>
                <InputLabel id={"data-type"}>数据类型</InputLabel>
                <Select
                    fullWidth
                    labelId={"data-type"}
                    label={"数据类型"}
                    defaultOpen
                    value={index}
                    onChange={event => {
                        const index = event.target.value as number
                        if (isNil(index)) {
                            return
                        }
                        setValue(
                            {
                                index: index,
                                value: tempVariable.values[index],
                            },
                            tempVariable,
                        )
                    }}
                >
                    {metadata.map((meType, index) => (
                        <MenuItem value={index}>
                            {meType.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Grid2>
        <Grid2 flexGrow={1}>
            {!isNull(index) && (
                <Component
                    context={context} metadata={metadata[index].type.metadata}
                    value={value?.value ?? null} tempVariable={tempVariable.tempVariables[index]}
                    setValue={(value, compTempVariable) => {
                        setValue(
                            {
                                index: index,
                                value: value,
                            },
                            {
                                values: (tempVariable.values).map((itemValue, itemIndex) => itemIndex !== index ? itemValue : value),
                                tempVariables: tempVariable.tempVariables.map((itemValue, itemIndex) => itemIndex !== index ? itemValue : compTempVariable)
                            }
                        )
                    }}
                />
            )}
        </Grid2>
    </Grid2>;
}

// # MeVoidType
export class MeVoidType extends MeType<void> {
    static readonly BASE_TYPE = new MeVoidType()
    constructor(metadata: void) {
        super("void", () => new MeVoidType(), metadata);
    }

    check(metadata: void, value: void): boolean {
        return isNil(value);
    }
}

type FunctionMetadataType<Input extends MeTypeAny, Output extends MeTypeAny> = {
    input: Input,
    output: Output,
}

type FunctionValueType<Input extends MeTypeAny, Output extends MeTypeAny> = (input: Input["_type"]) => Output["_type"]

export class MeFunctionType<Input extends MeTypeAny, Output extends MeTypeAny
    > extends MeType<FunctionValueType<Input, Output>, FunctionMetadataType<Input, Output>> {
    static readonly BASE_TYPE = new MeFunctionType({input: new MeAnyType(), output: new MeAnyType()})

    constructor(metadata: FunctionMetadataType<Input, Output>) {
        super("function", () => new MeVoidType(), metadata);
    }

    protected check(metadata: FunctionMetadataType<Input, Output>, value: FunctionValueType<Input, Output>): boolean {
        return false;
    }
}

const MeComponentVoidType: MeTypeComponent<MeVoidType> = () => <></>

// # MeFileTypeMetadata
const meMetadataType = new MeObjectType({
    type: new MeStringType(),
});
export type MeFileTypeMetadata = typeof meMetadataType["_type"];

const meFileTypeValueType = new MeObjectType({
    name: new MeStringType(),
    length: new MeNumberType(), // 自动生成类字段
    mimeType: new MeStringType(),
    dataUrl: new MeStringType(),
});
export type MeFileTypeValue = typeof meFileTypeValueType["_type"];

export class MeFileType<Metadata extends MeFileTypeMetadata = MeFileTypeMetadata> extends MeType<MeFileTypeValue, Metadata> {
    static readonly BASE_TYPE = new MeFileType({type: "*"})
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

const MeComponentFileType: MeTypeComponent<MeFileType, File | null> = ({metadata, value, tempVariable, setValue}) => {

    const inputRef = useRef<HTMLInputElement>(null);

    return <Grid2 container>
        <Grid2 flexGrow={1}>
            <TextField
                fullWidth
                value={value?.name ?? "选择文件"}
                InputProps={{readOnly: true}}
                onClick={() => {
                    inputRef.current?.click();
                }}
            />
            <input ref={inputRef} style={{display: "none"}}
                type="file" multiple={false}
                accept={isNil(metadata.type) ? "*/*" : `*.${metadata.type}`}
                onChange={event => {
                    const file = event.target.files?.[0];
                    if (isNil(file)) {
                        setValue(null, null);
                        return
                    }

                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = ev => {
                        const dataUrl = ev.target?.result;
                        if (!isNil(dataUrl)) {
                            setValue(
                                {
                                    name: file.name,
                                    mimeType: file.type,
                                    length: file.size,
                                    dataUrl: dataUrl as string,
                                },
                                file
                            )
                        }
                    }
                }}
            />
        </Grid2>
        {value && !isNil(value) && (
            <Grid2>
                <IconButton download href={value.dataUrl}>
                    <DownloadIcon/>
                </IconButton>
            </Grid2>
        )}
    </Grid2>
}

// # MeImageType
const meImageTypeValueType = new MeObjectType({
    file: new MeFileType<{ type: "jpg" }>({
        type: "jpg",
    }),
})
type MeImageTypeValue = typeof meImageTypeValueType["_type"]

export class MeImageType extends MeType<MeImageTypeValue> {
    static readonly BASE_TYPE = new MeImageType()
    constructor(metadata: void) {
        super("image", () => new MeVoidType(), metadata);
    }

    check(metadata: void, value: MeImageTypeValue): boolean {
        return true;
    }
}

const MeComponentImageType: MeTypeComponent<MeImageType, File | null> = ({context, metadata, value, tempVariable, setValue}) => {
    const FileComponent = useMemo(() => context.getTypeComponent("file"), []);

    return <Grid2 container direction={"column"}>
        <Grid2>
            <FileComponent
                context={context} metadata={{type: "jpg"}}
                value={value?.file} tempVariable={tempVariable}
                setValue={(value, tempVariable) => {
                    setValue({file: value}, tempVariable)
                }}
            />
        </Grid2>
        {value && !isNil(value) && (
            <img src={value.file.dataUrl} width={200} height={200}/>
        )}
    </Grid2>
}

const types = [
    {name: "类型定义", type: new MeTypeType(new MeAnyType())},
    {name: "文本", type: new MeStringType()},
    {name: "People", type: new MeObjectType({
            name: new MeStringType(),
            age: new MeNumberType(),
            gender: new MeBooleanType(),
            friends: new MeListType({
                valueType: new MeObjectType({
                    name: new MeStringType(),
                    age: new MeNumberType(),
                    gender: new MeBooleanType(),
                })
            })
        })},
    {name: "数值", type: new MeNumberType()},
    {name: "开关", type: new MeBooleanType()},
    {name: "键值对", type: new MeRecordType({valueType: new MeAnyType()})},
    {name: "对象", type: new MeObjectType({
        name: new MeStringType(), // TODO
        man: new MeBooleanType(),
        age: new MeNumberType(),
    })},
    {name: "列表", type: new MeListType({
        valueType: new MeStringType(), // TODO
    })},
    {name: "文件", type: new MeFileType({type: "*"})},
    {name: "图像", type: new MeImageType()},
]


const MeComponentAnyType: MeTypeComponent<MeAnyType, { values: any[], tempVariables: any[] }, {type: MeTypeType<any>, value: any}>
    = ({
           context,
           value, tempVariable, setValue,
       }) => {
    return <MeComponentUnionType
        context={context} metadata={types}
        value={isNull(value) ? null : {index: types.findIndex(type => type.type == value.type), value: value.value}}
            tempVariable={tempVariable}
        setValue={(value, tempVariable) => {
            if (isNull(value)) {
                setValue(null, tempVariable);
            } else {
                setValue({type: types[value.index].type, value: value.value}, tempVariable)
            }
        }}
    />
}

const typeIdAndComponent = {
    type: MeComponentTypeType,
    void: MeComponentVoidType,
    boolean: MeComponentBooleanType,
    number: MeComponentNumberType,
    string: MeComponentStringType,
    literal: MeComponentLiteralType,
    list: MeComponentListType,
    record: MeComponentRecordType,
    object: MeComponentObjectType,
    union: MeComponentUnionType,
    file: MeComponentFileType,
    image: MeComponentImageType,
    any: MeComponentAnyType,
}
const MeTypeComponentContextInstance : MeTypeComponentContext = {
    getTypeComponent: type => {
        // @ts-ignore
        return typeIdAndComponent[type] ?? (() => {
            return <>暂不支持的类型: {type}</>
        })
    }
}

export const PublicMeAnyTypeComponent = ({value, onChange} : {value: any, onChange: (value: any) => void}) => {

    const tempVarRef = useRef({});

    return <MeComponentRecordType
        context={MeTypeComponentContextInstance}
        metadata={{valueType: new MeAnyType()}}
        value={value}
        tempVariable={tempVarRef.current}
        setValue={(value: any, tempVar: any) => {
            tempVarRef.current = tempVar
            onChange(value)
        }}
    />
}

type ValueType<MeType extends MeTypeType<any>> = {
    type: MeTypeType<MeType>,
    value: MeType["_type"],
}

type RefValueType = {
    // type: ValueType<Function>,
}

type ValueType2 = {
    type: {
        id: string,
        metadata: any,
    },
    value: any,
}
