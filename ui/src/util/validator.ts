import {z, ZodAny, ZodBigInt, ZodBoolean, ZodDate, ZodNumber, ZodString, ZodType, ZodTypeAny} from "zod";
import {ZodRawShape} from "zod/lib/types";
import _, {isArray, isEmpty, isNil, isPlainObject} from "lodash";
import {util} from "zod/lib/helpers/util";
import {EnumLike} from "./commonType";
import {Json} from "./JSON";
import {parse} from "date-fns";
import Big from "big.js";
import {safeErrorResult, safeException} from "./error";

export const REGEX_PHONE = /^1\d{10}$/
export const REGEX_PASSWORD = /^[a-zA-Z0-9]{6,16}$/;

export declare type ZodPrimitive = string | number | bigint | boolean | null | undefined;

type ConvertType = "string" | "number" | "bigint" | "boolean";
const ConvertTypeFunMap = new Map<ConvertType, (from: any) => any>([
    ["string", String],
    ["number", (from) => {
        if (typeof from === "string") {
            if (isEmpty(from.trim())) {
                return undefined;
            }
        }
        if (typeof from === "number") {
            return from;
        }
        const number = Number(from);
        return isNaN(number) ? from : number;
    }],
    ["bigint", (from) => {
        if (typeof from === "string") {
            if (isEmpty(from.trim())) {
                return undefined;
            }
        }
        return BigInt(from);
    }],
    ["boolean", (from) => {
        if (from === '0') {
            return false;
        }
        return Boolean(from);
    }],
]);

type RawCreateParams = Parameters<typeof z.array>[1];

export class zc {

    static readonly strNotEmpty = () => z.string().nonempty();
    static readonly oStrTrim = () => this.trimFirst(this.toString()).optional();
    static readonly strTrimNotEmpty = () => this.trimFirst(z.string().nonempty());
    static readonly strSpaceToUndef = () => this.trimFirst(this.emptyToUndef());
    static readonly phone = () => zc.strNotEmpty().regex(REGEX_PHONE, "请填写正确的手机号");
    static readonly password = () => zc.strNotEmpty().min(6).max(16).regex(REGEX_PASSWORD, "密码需为数字与字母的组合");

    static preparse<Input, Output>(
        preSchema: ZodType<Input, any, any>,
        preprocess: (arg: Input) => unknown,
        schema: ZodType<Output, any, any>
    ) {
        return preSchema
            .transform(value => preprocess(value))
            .superRefine((value, context) => {
                const parseResult = schema.safeParse(value);
                if (!parseResult.success) {
                    parseResult.error.issues.forEach(issue => context.addIssue(issue))
                }
            })
            .transform(value => schema.parse(value))
    }

    static readonly parseJson = <T extends ZodTypeAny>(schema: T, params?: RawCreateParams) => {
        return z.preprocess(
            value => {
                if (isNil(value)) {
                    return value;
                }
                if (typeof value !== "string") {
                    return value;
                }
                return safeErrorResult(() => Json.parse(value))
            },
            schema
        )
    }
    static readonly oarray = <T extends ZodTypeAny>(schema: T, params?: RawCreateParams) => {
        return z.array(schema, params).optional();
    }
    static readonly odate = (params?: RawCreateParams) => {
        return z.date(params).optional();
    }
    static readonly oobject = <T extends ZodRawShape>(shape: T, params?: RawCreateParams) => {
        return z.object(shape, params).optional();
    }

    static toBig(requireMessage?: string) {
        return z.preprocess(
            value => {
                if (isNil(value)) {
                    return value;
                }
                const [success, result] = safeException(() => Big(value as any))
                if (success) {
                    return result;
                } else {
                    return value;
                }
            },
            zc.custom<Big>(
                value => value instanceof Big,
                requireMessage
            )
        );
    }

    static oToBig() {
        return this.toBig().optional()
    }

    static toBigNoSign(requireMessage?: string, signMessage?: string) {
        return this.bigBuilder(requireMessage).min(0, signMessage).build();
    }

    static readonly bigBuilder = (requiredMessage?: string) => {
        let schema : ZodType<Big, any, any> = zc.toBig(requiredMessage)
        return {
            min(min: number, message?: string | undefined) {
                return this.limit({start: [min, true]})
            },
            max(max: number, message?: string | undefined) {
                return this.limit({end: [max, true]})
            },
            positive(message?: string) {
                return this.limit({start: [0, false]})
            },
            negative(message?: string) {
                return this.limit({end: [0, false]})
            },
            nonpositive(message?: string) {
                return this.limit({end: [0, true]})
            },
            nonnegative(message?: string) {
                return this.limit({start: [0, true]})
            },
            limit(
                option: ({
                    start?: number | [value: number, inclusive?: boolean, message?: string],
                    end?: number | [value: number, inclusive?: boolean, message?: string],
                })) {
                schema = schema.superRefine((value, context) => {
                    if (isNil(value)) {
                        return
                    }
                    if (!isNil(option.start)) {
                        const [start, inclusive = true, message] = typeof option.start === "number" ? [option.start] : option.start;
                        if ([-1, ...inclusive ? [] : [0]].includes(value.cmp(start))) {
                            context.addIssue({
                                code: "too_small",
                                minimum: start,
                                type: "number",
                                inclusive: inclusive,
                                message: message,
                            })
                        }
                    }
                    if (!isNil(option.end)) {
                        const [end, inclusive = true, message] = typeof option.end === "number" ? [option.end] : option.end;
                        if ([1, ...inclusive ? [] : [0]].includes(value.cmp(end))) {
                            context.addIssue({
                                code: "too_big",
                                maximum: end,
                                type: "number",
                                inclusive: inclusive,
                                message: message,
                            })
                        }
                    }
                })
                return this
            },
            integer(message?: string) {
                return this.precision(0, message)
            },
            precision(precision: number, message?: string) {
                schema = schema.superRefine((value, context) => {
                    if (isNil(value)) {
                        return
                    }
                    if ((value.c.length - (value.e + 1)) > precision) {
                        context.addIssue({
                            code: "custom",
                            message: message ?? precision <= 0 ? "仅支持整数" : `最大支持${precision}位小数`,
                        })
                    }
                })
                return this
            },
            build: () => schema,
        }
    }

    static readonly custom = <T, >(instanceMatcher? : (value: any) => boolean, requireMessage?: string): ZodType<T, any, T> => {
        return ZodAny.create().superRefine((value, ctx) => {
            if (value === undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.invalid_type,
                    expected: "object",
                    received: "undefined",
                    message: requireMessage,
                })
                return;
            }
            if (value === null) {
                ctx.addIssue({
                    code: z.ZodIssueCode.invalid_type,
                    expected: "object",
                    received: "null",
                    message: requireMessage,
                })
                return;
            }
            if (!(instanceMatcher?.(value) ?? true)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.invalid_type,
                    expected: "object",
                    received: "never",
                    message: requireMessage,
                })
            }
        })
    }
    static readonly ocustom = <T, >() => {
        return this.custom<T>().optional();
    }

    static oToString<I extends ZodTypeAny = ZodString>(schema?: I | ((schema: ZodString) => I), params?: RawCreateParams) {
        return this.toString(schema, params).optional();
    }

    static toString<I extends ZodTypeAny = ZodString>(schema?: I | ((schema: ZodString) => I), params?: RawCreateParams) {
        let finalSchema: I;
        if (schema === undefined) {
            // @ts-ignore
            finalSchema = z.string();
        } else if (typeof schema === "function") {
            finalSchema = schema(z.string());
        } else {
            finalSchema = schema;
        }
        return zc.to("string", finalSchema, params);
    }

    static trimFirst<I extends ZodTypeAny = ZodString>(schema?: I) {
        return z
            .preprocess(
                value => {
                    if (typeof value !== "string") {
                        return value;
                    }
                    return value.trim();
                },
                schema ?? z.string()
            )
    }

    static emptyToUndef<I extends ZodTypeAny = ZodString>(schema?: I) {
        return z
            .preprocess(value => {
                if (isNil(value)) {
                    return value;
                }
                if (typeof value === "string" && value.length === 0) {
                    return value;
                }
                return value;
            }, schema ?? z.string())
    }

    static oToNumber<I extends ZodTypeAny = ZodNumber>(schema?: I | ((schema: ZodNumber) => I), params?: RawCreateParams) {
        return this.toNumber(schema, params).optional();
    }

    static toNumber<I extends ZodTypeAny = ZodNumber>(schema?: I | ((schema: ZodNumber) => I), params?: RawCreateParams) {
        let finalSchema: I;
        if (schema === undefined) {
            // @ts-ignore
            finalSchema = z.number();
        } else if (typeof schema === "function") {
            finalSchema = schema(z.number());
        } else {
            finalSchema = schema;
        }
        return zc.to("number", finalSchema, params);
    }

    static oToBigint<I extends ZodTypeAny = ZodBigInt>(schema?: I | ((schema: ZodBigInt) => I), params?: RawCreateParams) {
        return this.toBigint(schema, params).optional();
    }

    static toBigint<I extends ZodTypeAny = ZodBigInt>(schema?: I | ((schema: ZodBigInt) => I), params?: RawCreateParams) {
        let finalSchema: I;
        if (schema === undefined) {
            // @ts-ignore
            finalSchema = z.number();
        } else if (typeof schema === "function") {
            finalSchema = schema(z.bigint());
        } else {
            finalSchema = schema;
        }
        return zc.to("bigint", finalSchema, params);
    }

    static oToBoolean<I extends ZodTypeAny = ZodBoolean>(schema?: I | ((schema: ZodBoolean) => I), params?: RawCreateParams) {
        return this.toBoolean(schema, params).optional();
    }

    static nilToBoolean<I extends ZodTypeAny = ZodBoolean>(schema?: I | ((schema: ZodBoolean) => I), params?: RawCreateParams) {
        return z.preprocess(value => value ?? false, this.toBoolean(schema, params))
    }

    static toBoolean<I extends ZodTypeAny = ZodBoolean>(schema?: I | ((schema: ZodBoolean) => I), params?: RawCreateParams) {
        let finalSchema: I;
        if (schema === undefined) {
            // @ts-ignore
            finalSchema = z.boolean();
        } else if (typeof schema === "function") {
            finalSchema = schema(z.boolean());
        } else {
            finalSchema = schema;
        }
        return zc.to("boolean", finalSchema, params);
    }

    static toLiteral<T extends ZodPrimitive>(value: T, params?: RawCreateParams) {
        if (_.isNil(value)) {
            return z.preprocess(value => value, z.literal(value, params))
        }
        return this.to(typeof value as ConvertType, z.literal(value, params));
    }

    static oToLiteral<T extends ZodPrimitive>(value: T, params?: RawCreateParams) {
        return this.toLiteral(value, params).optional()
    }

    static oToDate<I extends ZodType<any, any, Date> = ZodDate>(dateFormat?: string, schema?: I | ((schema: ZodDate) => I), option?: {sourceSeconds?: boolean}) {
        return this.toDate(dateFormat, schema, option).optional();
    }

    static toDate<I extends ZodType<any, any, Date> = ZodDate>(dateFormat?: string, schema?: I | ((schema: ZodDate) => I), option?: {sourceSeconds?: boolean}) {
        let finalSchema: I;
        if (schema === undefined) {
            // @ts-ignore
            finalSchema = z.date();
        } else if (typeof schema === "function") {
            finalSchema = schema(z.date());
        } else {
            finalSchema = schema;
        }

        return z.preprocess(
            value => {
                if (isNil(value)) {
                    return value;
                }
                if (typeof value === "number" || !isNaN(Number(value))) {
                    let timestamp = Number(value)
                    if (option?.sourceSeconds ?? false) {
                        timestamp *= 1000;
                    }
                    return new Date(timestamp)
                }
                if (typeof value === "string") {
                    return parse(value, dateFormat ?? "yyyy-MM-dd HH:mm:ss", new Date())
                }
            },
            finalSchema
        );
    }

    static toMap<Key extends ZodTypeAny = ZodTypeAny, Value extends ZodTypeAny = ZodTypeAny>(keyType: Key, valueType: Value, params?: RawCreateParams) {
        return z.preprocess(
            value => {
                if (isNil(value)) {
                    return value;
                }
                if (!isPlainObject(value)) {
                    return value;
                }
                return new Map(Object.entries(value as { [p: string]: any }))
            },
            z.map(keyType, valueType, params)
        );
    }

    static oToMap<Key extends ZodTypeAny = ZodTypeAny, Value extends ZodTypeAny = ZodTypeAny>(keyType: Key, valueType: Value, params?: RawCreateParams) {
        return this.toMap(keyType, valueType, params).optional()
    }

    static toRecord<Keys extends ZodType<string | number | symbol, any, any>, Value extends ZodTypeAny>(keySchema: Keys, valueType: Value, params?: RawCreateParams) {
        return z
            .preprocess(
                value => {
                    if (isNil(value)) {
                        return value;
                    }
                    if (isArray(value)) {
                        return {...value}
                    }
                    return value;
                },
                z.record(keySchema, valueType, params)
            )
    };

    static oToRecord<Keys extends ZodType<string | number | symbol, any, any>, Value extends ZodTypeAny>(keySchema: Keys, valueType: Value, params?: RawCreateParams) {
        return this.toRecord(keySchema, valueType, params).optional()
    }

    static anythingToBoolean<I extends ZodTypeAny = ZodBoolean>(schema?: I | ((schema: ZodBoolean) => I)) {
        return z.preprocess(value => value ?? false, this.toBoolean(schema))
    }

    static routeToBoolean() {
        return z.preprocess(value => value === '' ? true : value, this.toBoolean()).default(false);
    }

    static readonly nilToEmptyArray = <T extends ZodTypeAny>(schema: T, params?: RawCreateParams) => {
        return z.array(schema, params).default([])
    }

    static readonly nilToEmptyString = (schema?: ZodString) => {
        return z.preprocess(
            value => isNil(value) ? "" : value,
            schema ?? zc.toString()
        ).default("")
    }

    static readonly anythingToVoid = () => {
        return z.preprocess(() => undefined, z.void());
    }

    static toEnum<U extends string, T extends Readonly<[U, ...U[]]>>(values: T) {
        return z.preprocess(
            value => _.isNil(value) ? value : String(value),
            z.enum(values)
        );
    }

    static oToEnum<U extends string, T extends Readonly<[U, ...U[]]>>(values: T) {
        return this.toEnum(values).optional();
    }

    static toNativeEnum<T extends EnumLike>(values: T, params?: RawCreateParams) {
        const enumValues = util.getValidEnumValues(values);

        const Converter = enumValues
            // @ts-ignore
            ? ConvertTypeFunMap.get(typeof enumValues[0]) ?? false
            : false;

        return z.preprocess(
            value => {
                if (_.isNil(value)) {
                    return value;
                }
                if (Converter === false) {
                    return value;
                }
                return Converter(value);
            },
            z.nativeEnum(values)
        )
    }

    static oToNativeEnum<T extends EnumLike>(values: T, params?: RawCreateParams) {
        return this.toNativeEnum(values, params).optional();
    }

    static toNativeEnumOtherwise<T extends EnumLike>(values: T, params?: RawCreateParams) {
        const enumValues = util.getValidEnumValues(values);

        const Converter = enumValues
            // @ts-ignore
            ? ConvertTypeFunMap.get(typeof enumValues[0]) ?? false
            : false;

        return z.preprocess(
            value => {
                if (_.isNil(value)) {
                    return value;
                }
                if (Converter === false) {
                    return value;
                }
                const convertedValue = Converter(value);
                if (isNil(convertedValue)) {
                    return false;
                }
                if (!enumValues.includes(convertedValue)) {
                    return false;
                }
                return convertedValue
            },
            z.union([
                z.literal(false),
                z.nativeEnum(values)
            ])
        )
    }

    static oToNativeEnumOtherwise<T extends EnumLike>(values: T, params?: RawCreateParams) {
        return this.toNativeEnumOtherwise(values, params).optional();
    }

    static to<I extends ZodTypeAny>(type: ConvertType, schema: I, params?: RawCreateParams) {
        return z.preprocess(zc.toF(type), schema, params);
    }

    static toF(type: ConvertType) {
        const converter = ConvertTypeFunMap.get(type);
        return (value: any) => {
            const valueType = typeof value;
            if (valueType === type) {
                return value;
            }
            if (!ConvertTypeFunMap.has(valueType as ConvertType)) {
                return value;
            }
            if (converter !== undefined) {
                return converter(value);
            }
            return value;
        }
    }

}

z.setErrorMap((issue, ctx) => {
    let message: string;
    switch (issue.code) {
        case z.ZodIssueCode.invalid_type:
            if (issue.received === "undefined" || issue.received === "null") {
                message = "必填项";
            } else {
                message = `类型错误,需要类型'${issue.expected}'但实际为'${issue.received}'`;
            }
            break;
        case z.ZodIssueCode.unrecognized_keys:
            message = `无法识别的字段: ${issue.keys
                .map((k) => `'${k}'`)
                .join(", ")}`;
            break;
        case z.ZodIssueCode.invalid_union:
            message = `无效输入`;
            break;
        case z.ZodIssueCode.invalid_enum_value:
            message = `无效枚举值. 需要 ${issue.options
                .map((val) => (typeof val === "string" ? `'${val}'` : val))
                .join(" | ")}, 但实际是 ${
                typeof ctx.data === "string" ? `'${ctx.data}'` : ctx.data
            }`;
            break;
        case z.ZodIssueCode.invalid_arguments:
            message = `无效方法参数`;
            break;
        case z.ZodIssueCode.invalid_return_type:
            message = `无效返回类型`;
            break;
        case z.ZodIssueCode.invalid_date:
            message = `无效日期`;
            break;
        case z.ZodIssueCode.invalid_string:
            if (issue.validation !== "regex") message = `需符合正则'${issue.validation}'`;
            else message = "无效数据";
            break;
        case z.ZodIssueCode.too_small:
            if (issue.type === "array")
                if (issue.minimum === 1) {
                    message = "必填项";
                } else {
                    message = `${issue.inclusive ? `至少` : `至少不小于`}${issue.minimum}项`;
                }
            else if (issue.type === "string")
                if (issue.minimum === 1) {
                    message = "必填项";
                } else {
                    message = `${issue.inclusive ? `至少` : `至少不小于`}${issue.minimum}个字符`;
                }
            else if (issue.type === "number")
                message = `需大于${issue.inclusive ? `等于` : ``}${issue.minimum}`;
            else message = "无效输入";
            break;
        case z.ZodIssueCode.too_big:
            if (issue.type === "array")
                message = `${issue.inclusive ? `最多` : `最多少于`}${issue.maximum}项`;
            else if (issue.type === "string")
                message = `${issue.inclusive ? `最长` : `最长少于`} ${issue.maximum}个字符`;
            else if (issue.type === "number")
                message = `需小于${issue.inclusive ? `等于` : ``}${issue.maximum}`;
            else message = "无效输入";
            break;
        case z.ZodIssueCode.custom:
            message = `无效输入`;
            break;
        case z.ZodIssueCode.not_multiple_of:
            message = `需为${issue.multipleOf}的倍数`;
            break;
        default:
            message = ctx.defaultError;
    }
    return {message};
});