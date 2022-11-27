import {isNil, isNull, Primitive} from "./util";
import {ComponentType, useEffect, useMemo, useRef, useState} from "react";
import {Button, FormControl, IconButton, InputLabel, MenuItem, Select, Switch, TextField} from "@mui/material";
import Grid2 from "@mui/material/Unstable_Grid2";
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DownloadIcon from '@mui/icons-material/Download';
import {isEmpty} from "lodash";
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import {TraceError} from "../util/TraceError";
import {useDialog} from "../component/Dialog";

// # MeType
export type MeTypeAny = MeType<any, any, any>

export type MeValue<Type extends MeTypeAny> = {
    value: Type["_type"],
}

type MeTypeSubLocator<Type, Metadata, SubLocatePath> = {
    pathType: (value: Type, /* TODO 期望类型 */ metadata: Metadata, context: MeContext) => MeType<SubLocatePath, any, any> | undefined
    locator: (metadata: Metadata, path: SubLocatePath, value: Type, context: MeContext) => {
        type: MeTypeAny,
        value: any,
    }
};
type ValueGetter<Type, Metadata> = (metadata: Metadata, value: Type, context: MeContext) => MeTypeValue;

class TargetNotExist extends TraceError {}

type TypeSubLocator = (type: MeTypeAny["id"]) => MeTypeSubLocator<any, any, any> | undefined;
type MeContext = {
    rootValue: () => MeTypeValue,
    getTypeSubLocator: TypeSubLocator,
}

export abstract class MeType<Type, Metadata = void, SubLocatePath = void> {
    readonly _type!: Type;
    readonly valueType?: (metadata: any) => MeType<Type, any, any>;
    readonly metaDataType: () => MeType<Metadata, any, any>;
    readonly metadata: Metadata;
    readonly id: string | number;
    readonly subLocator?: MeTypeSubLocator<Type, Metadata, SubLocatePath>;
    readonly valueGetter?: ValueGetter<Type, Metadata>;

    constructor(
        id: string | number,
        metadataType: () => MeTypeAny, metadata: Metadata,
        valueType?: (metadata: Metadata) => MeType<Type, any, any>,
        subLocator?: MeTypeSubLocator<Type, Metadata, SubLocatePath>,
        valueGetter?: ValueGetter<Type, Metadata>) {
        this.id = id;
        this.metadata = metadata;
        this.metaDataType = metadataType;
        this.valueType = valueType;
        this.subLocator = subLocator;
        this.valueGetter = valueGetter;
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
type MeTypeComponentContext = MeContext & {
    originContext: () => MeTypeComponentContext,
    getTypeComponent: MeTypeComponentGetter,
}

type MeTypeComponent<MeType extends MeTypeAny, TempVarType = void, ValueType = MeType["_type"]> = ComponentType<{
    metadata: MeType["metadata"],
    value: ValueType | null, tempVariable?: TempVarType
    setValue: (value: ValueType | null, tempVariable?: TempVarType) => void,
    context: MeTypeComponentContext,
}>

// # MeAnyType
export class MeAnyType extends MeType<{type: MeTypeAny, value: any}, void, null> {
    static readonly BASE_TYPE = new MeAnyType()
    constructor() {
        super(
            "any",
            () => new MeVoidType(),
            undefined, undefined,
            {
                pathType: (value, metadata, context) => {
                    return new MeNullType()
                },
                locator: (metadata, path, value) => {
                    return value;
                }
            }
        );
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

const MeComponentNullType: MeTypeComponent<MeNullType> = ({value, setValue}) => {
    useEffect(() => {
        setTimeout(() => setValue(null))
    }, [])
    return <></>
}

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
    if (isNil(value)) {
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

export class MeListType<Type extends MeTypeAny> extends MeType<MeListTypeValueType<Type>, MeListTypeMetadataType<Type>, number> {
    static readonly BASE_TYPE = new MeListType({valueType: new MeNullType()})
    constructor(metadata: MeListTypeMetadataType<Type>) {
        super(
            "list",
            () => new MeObjectType({valueType: new MeTypeType(new MeAnyType())}),
            metadata,
            undefined,
            {
                pathType: value => new MeNumberType(),
                locator: (metadata, path, value) => {
                    if (path > value.length - 1) {
                        throw new TargetNotExist(`指定序号 ${path} 超出列表大小 ${value.length}`)
                    }
                    return {
                        type: metadata.valueType,
                        value: value[path],
                    }
                },
            }
        );
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

const MeComponentListType: MeTypeComponent<MeListType<MeTypeAny>, any[]> =
    ({
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
        super(
            "optional",
            () => new MeObjectType({innerType: new MeAnyType()}),
            metadata,
            // @ts-ignore TODO
            (metadata) => new MeUnionType([
                {
                    name: String(metadata.innerType.id),
                    /*TODO*/ type: metadata.innerType
                },
                {
                    name: "空值",
                    type: new MeNullType()
                }
            ])
        );
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

export class MeRecordType<ValueType extends MeTypeAny> extends MeType<MeRecordTypeValueType<ValueType>, MeRecordTypeMetadataType<ValueType>, { index: number, value: any}> {
    static readonly BASE_TYPE = new MeRecordType({valueType: new MeStringType()})
    constructor(metadata: MeRecordTypeMetadataType<ValueType>) {
        super(
            "record",
            () => new MeObjectType({valueType: new MeTypeType(new MeAnyType())}),
            metadata,
            undefined,
            {
                pathType: value => new MeUnionType(
                    // @ts-ignore
                    Object.entries(value)
                        .map(([key]) => ({name: key, type: new MeLiteralType(key)}))
                ),
                locator: (metadata, path, value) => {
                    if (!Reflect.has(value, path.value)) {
                        throw new TargetNotExist(`指定键 ${path} 不存在`)
                    }
                    return {
                        type: metadata.valueType,
                        value: value[path.value],
                    }
                }
            }
        );
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

export class MeObjectType<Shape extends ObjectShape> extends MeType<baseObjectType<Shape>, Shape, {index: number, value: keyof baseObjectType<Shape>}> {
    static readonly BASE_TYPE = new MeObjectType({})
    constructor(metadata: Shape) {
        super(
            "object",
            () => new MeRecordType({valueType: new MeTypeType(new MeAnyType())}),
            metadata, undefined,
            {
                // @ts-ignore
                pathType: value => (
                    new MeUnionType(
                        // @ts-ignore
                        Object.entries(value)
                            // @ts-ignore
                            .map(([key]) => ({name: key, type: new MeLiteralType(key)}))
                    )
                ),
                locator: (metadata, path, value) => {
                    if (!Reflect.has(value, path.value)) {
                        throw new TargetNotExist(`指定键 ${path.toString()} 不存在`)
                    }
                    return {
                        type: metadata[path.value],
                        value: value[path.value],
                    }
                }
            }
        );
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
                // @ts-ignore
                .map(([key, propertyType]) => [key, context.getTypeComponent(propertyType.id)])
        ),
        [JSON.stringify(metadata)]
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
                        // @ts-ignore
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
export class MeTypeType<Type extends MeTypeAny = MeTypeAny> extends MeType<Type, Type> {
    static readonly BASE_TYPE = new MeTypeType(new MeAnyType())
    constructor(metadata: Type) {
        super("type", () => new MeAnyType(), metadata);
    }

    check(metadata: Type, value: Type): boolean {
        return metadata.id === value?.id;
    }
}

const MeComponentTypeType: MeTypeComponent<MeTypeType<MeTypeAny>, { values: any[], tempVariables: any[] }>
    = ({
           metadata,
           context,
           value, tempVariable, setValue,
       }) => {

    const typeMetadatas = typeNames.map(type => ({
        name: type.name,
        type: type.type.metaDataType(),
    }));

    let value1 = (value === null || value === undefined) ? null : {
        index: typeNames.findIndex(type => type.type.id === value.id),
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
                        id: typeNames[index].type.id,
                        metadata: metadata,
                    },
                    newTempVariable
                )
            }
        }}
    />
}

// # MeUnionType
export type MeUnionTypeValueType<Types extends {name: string, type: MeTypeAny}[]> = {index: number, value: Types[number]["type"]["_type"]}
export type MeUnionTypeMetadataType<Types extends {name: string, type: MeTypeAny}[]> = Types

export class MeUnionType<Types extends {name: string, type: MeTypeAny}[]> extends MeType<MeUnionTypeValueType<Types>, MeUnionTypeMetadataType<Types>, null> {
    static readonly BASE_TYPE = new MeUnionType([])
    constructor(metadata: Types) {
        super(
            "union",
            () => new MeListType({valueType: new MeAnyType()}),
            metadata, undefined,
            {
                pathType: (value, metadata, context) => {
                    return new MeNullType()
                },
                locator: (metadata, path, value, context) => {
                    // if (isNil(value)) {
                    //     throw new TargetNotExist(`指定值 ${value} 类型不匹配`);
                    // }
                    return {
                        type: metadata[value.index].type,
                        value: value.value,
                    }
                },
            }
        );
    }

    check(meTypes: MeUnionTypeMetadataType<Types>, value: MeUnionTypeValueType<Types>): boolean {
        if (isNil(value)) {
            return false
        }
        return meTypes[value.index].type.doCheck(value.value)
    }
}

const MeComponentUnionType: MeTypeComponent<MeUnionType<{name: string, type: MeTypeAny}[]>, { values: any[], tempVariables: any[] }>
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
    constructor() {
        super("void", () => new MeVoidType(), undefined);
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

export class MeRefType<RefType extends MeTypeAny = MeTypeAny> extends MeType<MeListType<MeTypeAny>["_type"], RefType, null> {
    static readonly BASE_TYPE = new MeRefType(new MeAnyType());
    constructor(metadata: RefType) {
        super(
            "ref", () => new MeTypeType(new MeAnyType()), metadata, undefined,
            {
                pathType: (value, metadata, context) => {
                    return new MeNullType()
                },
                locator: (metadata, path, value, context) => {
                    const rootValue = context.rootValue();
                    const targetValue = MeRefType.findTargetValue(rootValue, value, context);
                    const locatorValue = context.getTypeSubLocator(targetValue.type.id)?.locator(targetValue.type.metadata, path, targetValue.value, context);
                    if (locatorValue === undefined) {
                        throw new TargetNotExist(`指定路径 ${value} 不存在`);
                    }
                    return locatorValue
                }
            },
            (metadata, value, context) => {
                const rootValue = context.rootValue()
                return MeRefType.findTargetValue(rootValue, value, context)
            }
        )
    }


    protected check(metadata: RefType, value: MeListType<MeTypeAny>["_type"]): boolean {
        // TODO impl after
        return false;
    }

    static findTargetValue(rootValue: MeTypeValue, path: any[], context: MeContext) : MeTypeValue {
        if (isEmpty(path)) {
            return rootValue;
        }
        return path.reduce(
            (rootValue, node) => {
                return context.getTypeSubLocator(rootValue.type.id)?.locator(rootValue.type.metadata, node, rootValue.value, context)
            },
            rootValue
        )
    }
}

const MeComponentRefType: MeTypeComponent<MeRefType, any>
    = ({
           metadata,
           value: path,
           tempVariable: tempVariables,
           setValue,
           context
       }) => {

    const rootValue = context.rootValue();

    let nodes : MeTypeValue[] = []
    try {
        nodes = parseRefPath(path ?? [], rootValue, context);
    } catch (e) {
        throw e
        if (!(e instanceof TargetNotExist)) {
            throw e
        }
    }

    const objectMetadata = Object.fromEntries(
        nodes.map((node, index) => [index, node.type])
    );
    const objectValue = Object.fromEntries(
        nodes.map((node, index) => [index, node.value])
    );

    return <MeComponentObjectType
        metadata={objectMetadata}
        value={objectValue}
        tempVariable={tempVariables}
        setValue={(objectValue, tempVariable) => {
            const refValue = Object.entries(objectValue as any)
                .sort(([index1], [index2]) => parseInt(index1 as string) - parseInt(index2 as string))
                .map(([index, value]) => value);
            setValue(refValue, tempVariable)
        }}
        context={context}
    />
}

function parseRefPath(path: any[], rootValue: MeTypeValue, context: MeContext) : MeTypeValue[] {
    let parentValue : MeTypeValue | undefined = rootValue;
    let nodes = path.reduce(
        (result, node) => {
            if (parentValue === undefined) {
                return result
            }
            const subPathType = context.getTypeSubLocator(parentValue.type.id)?.pathType(parentValue.value, parentValue.type.metadata, context) ?? new MeVoidType()
            try {
                const subValue = context.getTypeSubLocator(parentValue.type.id)?.locator(parentValue.type.metadata, node, parentValue.value, context)
                parentValue = subValue
            } catch (e) {
                parentValue = undefined
            }
            result.push({
                type: subPathType,
                value: node,
            })
            return result
        },
        [] as MeTypeAny[]
    );

    if (!isNil(parentValue)) {
        const appendNode = context.getTypeSubLocator(parentValue.type.id)?.pathType(parentValue.value, parentValue.type.metadata, context);
        if (appendNode !== undefined) {
            nodes.push({
                type: appendNode,
                value: null,
            })
        }
    }

    return nodes
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
        if (isNil(value)) {
            return false
        }
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

const MeComponentAnyType: MeTypeComponent<MeAnyType, { values: {[id: MeTypeAny["id"]]: any}, tempVariables: {[id: MeTypeAny["id"]]: any} }>
    = ({
           context,
           value,
           tempVariable = {
               values: {},
               tempVariables: {}
           },
           setValue,
       }) => {

    const dialog = useDialog();

    const Component = useMemo(() => isNil(value) ? () => <></>
            : context.getTypeComponent(value!.type.id),
        [value?.type]
    )

    console.log("value", value)

    const typeName = isNil(value)
        ? "选择类型"
        : "类型:" + typeNames.find(type => type.type.id === value!.type.id)?.name

    return <Grid2 container>
        <Grid2>
            <Button size={"medium"} variant={"outlined"} color={"inherit"} onClick={() => {
                function showTypeMakeDialog() {
                    let finalType : MeTypeAny;
                    const RefComponent = () => {
                        const [typeValue, setTypeValue] = useState(value?.type ?? new MeStringType());
                        finalType = typeValue;
                        const tempVariable = useRef(undefined as any);
                        return <MeComponentTypeType
                            context={context.originContext()}
                            metadata={MeAnyType.BASE_TYPE}
                            value={typeValue}
                            tempVariable={tempVariable.current}
                            setValue={(meValue, meTempVariable) => {
                                tempVariable.current = meTempVariable
                                setTypeValue(meValue as any)
                            }}
                        />
                    };
                    dialog.show({
                        title: "创建数据类型",
                        content: <RefComponent/>,
                        actions: [
                            {text: "取消"},
                            {
                                text: "确认",
                                action: () => {
                                    setValue(
                                        {
                                            type: finalType!,
                                            value: tempVariable.values[finalType!.id],
                                        },
                                        tempVariable
                                    )
                                }
                            }
                        ]
                    })
                }

                showTypeMakeDialog();
            }}>
                {typeName}
            </Button>
        </Grid2>
        <Grid2 flexGrow={1}>
            <Component
                context={context} metadata={value?.type.metadata}
                value={value?.value ?? null}
                tempVariable={tempVariable.tempVariables[value?.type.id!]}
                setValue={(compValue, compTempVariable) => {
                    setValue(
                        {
                            type: value!.type,
                            value: compValue,
                        },
                        {
                            values: {
                                ...tempVariable.values,
                                [value!.type.id]: compValue,
                            },
                            tempVariables: {
                                ...tempVariable.tempVariables,
                                [value!.type.id]: compTempVariable,
                            }
                        }
                    )
                }}
            />
        </Grid2>
    </Grid2>
}

export class MeRefValueType<Type extends MeTypeAny = MeTypeAny> extends MeType<MeRefTypeValue<Type>, void, null> {
    static readonly BASE_TYPE = new MeRefValueType()
    constructor() {
        super(
            "refValue",
            () => new MeVoidType(),
            undefined, undefined,
            {
                pathType: (value, metadata, context) => {
                    return new MeNullType()
                },
                locator: (metadata, path, value, context) => {
                    // @ts-ignore
                    const meType: MeTypeAny = value.type.mode === "value" ? value.type.value
                        : MeRefType.findTargetValue(context.rootValue(), value.type.value.value, context);
                    const meValue = value.value.mode === "value" ? value.value.value
                        : MeRefType.findTargetValue(context.rootValue(), value.value.value.value, context);
                    return {
                        type: meType,
                        value: meValue,
                    }
                }
            }
        );
    }

    check(metadata: void, value: any): boolean {
        return true;
    }

}

const MeComponentRefValueType: MeTypeComponent<MeRefValueType, any>
    = ({
           context,
           value,
           tempVariable,
           setValue,
           // @ts-ignore
           root,
       }) => {

    const value2 = value ?? {
        type: {
            mode: "value",
            // @ts-ignore
            value: {
                id: "string",
            }
        },
        value: {
            mode: "value",
            value: null,
        }
    }

    let typeComponentGetter : MeTypeComponentGetter = useMemo(() => (id) => {
        return ({metadata, value, tempVariable, setValue}) => {
            return <MeComponentRefValueType
                context={context}
                metadata={undefined}
                value={value ?? {
                    type: {
                        mode: "value",
                        value: {
                            id: id,
                            metadata: metadata,
                        }
                    },
                    value: {
                        mode: "value",
                        value: null,
                    }
                }}
                tempVariable={tempVariable}
                setValue={setValue}
            />
        }
    }, [context]);
    let typeSubLocator : TypeSubLocator = type => {
        console.log("type", type)
        const realSubLocator = context.getTypeSubLocator(type);
        if (realSubLocator === undefined) return undefined;
        return {
            pathType: (value, metadata, context) => {
                const realPathType = realSubLocator.pathType(value, metadata, context);
                console.log("realPathType", realPathType)
                return realPathType
            },
            locator: (metadata, path, value, context) => {
                const realValue = realSubLocator.locator(metadata, path, value, context);
                console.log("path", path, "realValue", realValue)
                if (type === "refValue") {
                    return realValue
                }
                if (realValue === undefined) {
                    return realValue
                }
                console.log("path", path, "finalValue", {
                    type: new MeRefValueType(),
                    value: realValue.value,
                })
                return {
                    type: new MeRefValueType(),
                    value: realValue.value,
                }
            },
        }
    }

    // @ts-ignore
    const meType : MeTypeAny = value2.type.mode === "value" ? value2.type.value
        : MeRefType.findTargetValue(context.rootValue(), value2.type.value.value, {...context, getTypeSubLocator: typeSubLocator}).type;
    const meValue = value2.value.mode === "value" ? value2.value.value
        : MeRefType.findTargetValue(context.rootValue(), value2.value.value.value, {...context, getTypeSubLocator: typeSubLocator}).value;

    const dialog = useDialog();

    const MeComponent = useMemo(() => context.getTypeComponent(meType.id), [meType.id]);

    return <Grid2 container direction={"row"}>
        {
            root !== true && <Grid2>
                <IconButton size={"small"} color={value2.value.mode === "ref" ? "primary" : "default"} onClick={() => {
                    function showRefSelectDialog() {
                        let finalValue: any[] | undefined = undefined;
                        const RefComponent = () => {
                            const [value, setValue] = useState([] as any[] | null);
                            // @ts-ignore
                            finalValue = value;
                            const tempVariable = useRef(undefined);
                            return <MeComponentRefType
                                context={{
                                    ...context,
                                    getTypeSubLocator: typeSubLocator,
                                }}
                                metadata={meType}
                                value={value}
                                tempVariable={tempVariable.current}
                                setValue={(meValue, meTempVariable) => {
                                    tempVariable.current = meTempVariable
                                    setValue(meValue)
                                }}
                            />
                        };
                        dialog.show({
                            title: "选择引用目标",
                            content: <RefComponent/>,
                            actions: [
                                {text: "取消"},
                                {
                                    text: "确认",
                                    action: () => {
                                        setValue({
                                            // @ts-ignore
                                            type: value2.type,
                                            value: {
                                                mode: "ref",
                                                value: {
                                                    // @ts-ignore
                                                    type: {id: "ref"},
                                                    // @ts-ignore
                                                    value: finalValue,
                                                }
                                            }
                                        }, tempVariable)
                                    }
                                }
                            ]
                        })
                    }

                    showRefSelectDialog();
                }}>
                    <FormatQuoteIcon fontSize={"small"} sx={{fontSize: "1rem"}}/>
                </IconButton>
            </Grid2>
        }
        <Grid2>
            <MeComponent
                context={{
                    ...context,
                    getTypeSubLocator: typeSubLocator,
                    getTypeComponent: typeComponentGetter,
                }}
                metadata={meType.metadata}
                value={meValue}
                tempVariable={tempVariable}
                setValue={(value, tempVariable) => {
                    setValue(
                        {
                            // @ts-ignore
                            type: value2.type,
                            value: {
                                mode: "value",
                                value: value,
                            }
                        },
                        tempVariable
                    )
                }}
            />
        </Grid2>
    </Grid2>
}
const typeIdAndComponent = {
    type: MeComponentTypeType,
    ref: MeComponentRefType,
    void: MeComponentVoidType,
    null: MeComponentNullType,
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

const idAndTypes: { [id: MeTypeAny["id"]]: MeType<any> } = [
    MeAnyType.BASE_TYPE,
    MeNullType.BASE_TYPE,
    MeBooleanType.BASE_TYPE,
    MeNumberType.BASE_TYPE,
    MeStringType.BASE_TYPE,
    MeLiteralType.BASE_TYPE,
    MeListType.BASE_TYPE,
    MeOptionalType.BASE_TYPE,
    MeRecordType.BASE_TYPE,
    MeObjectType.BASE_TYPE,
    MeTypeType.BASE_TYPE,
    MeUnionType.BASE_TYPE,
    MeVoidType.BASE_TYPE,
    MeFunctionType.BASE_TYPE,
    MeRefType.BASE_TYPE,
    MeFileType.BASE_TYPE,
    MeImageType.BASE_TYPE,
    MeRefValueType.BASE_TYPE,
].reduce((previousValue, currentValue) => {
        previousValue[currentValue.id] = currentValue;
        return previousValue
    },
    {} as { [id: MeTypeAny["id"]]: MeTypeAny }
)

export const PublicMeAnyTypeComponent = ({value, onChange} : {value: any, onChange: (value: any) => void}) => {

    const tempVarRef = useRef({});
    const valueRef = useRef(value);

    const value2 = value ?? {
        type: {
            mode: "value",
            // @ts-ignore
            value: new MeRecordType({valueType: new MeAnyType()}),
        },
        value: {
            mode: "value",
            // @ts-ignore
            value: null,
        }
    }
    valueRef.current = value2;

    const context = useMemo<MeTypeComponentContext>(() => {
            const context : MeTypeComponentContext = {
                originContext: () => context,
                rootValue: () => ({
                    type: new MeRecordType({valueType: new MeAnyType()}),
                    value: valueRef.current.value.value,
                }),
                getTypeSubLocator: (id: MeTypeAny["id"]) => idAndTypes[id]?.subLocator,
                getTypeComponent: meTypeComponentGetter,
            };
            return context
        },
        []
    );
    // @ts-ignore
    return <MeComponentRefValueType
        // @ts-ignore
        root={true}
        context={context}
        value={value2}
        tempVariable={tempVarRef.current}
        setValue={(value: any, tempVar: any) => {
            tempVarRef.current = tempVar
            onChange(value)
        }}
    />
}

type MeTypeValue<MeType extends MeTypeAny = MeTypeAny> = {
    type: MeType,
    value: MeType["_type"],
}

type RefValueType<MeType extends MeTypeAny = MeTypeAny> = {
    mode: "value",
    value: MeType,
} | {
    mode: "ref",
    value: MeTypeValue<MeRefType<MeType>>,
}

type MeRefTypeValue<MeType extends MeTypeAny = MeTypeAny> = {
    type: RefValueType<MeTypeType<MeType>>,
    value: RefValueType<MeType>,
}

const meTypeComponentGetter : MeTypeComponentGetter = type => {
    // @ts-ignore
    const Component = typeIdAndComponent[type] ?? (() => {
        return <>暂不支持的类型: {type}</>
    })
    return (props) => {
        return <Component {...props} />
    }
}

const typeNames = [
    {
        name: "不限",
        type: MeAnyType.BASE_TYPE,
    },
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
        name: "表单",
        type: MeObjectType.BASE_TYPE,
    },
    {
        name: "自由表单",
        type: MeRecordType.BASE_TYPE,
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
    {
        name: "类型定义",
        type: MeTypeType.BASE_TYPE,
    }
]

