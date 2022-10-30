import {isNil} from "lodash";

export const promiseThrowError = <T>(reason: any): T => {
    if (reason instanceof Error) {
        throw new Error(reason.message, reason);
    } else {
        throw reason;
    }
}

export const errorMessage = (error: any) => {
    if (isNil(error)) {
        return;
    }
    if (!isNil(error.message)) {
        return String(error.message);
    }
    return String(error);
}

export function safeException<Return>(action: () => Return) : [true, Return] | [false, undefined, any] {
    try {
        const return1 = action();
        return [true, return1];
    } catch (error) {
        return [false, undefined, error];
    }
}
export const safeError = safeException
export function safeErrorResult<Return>(action: () => Return) : Return | undefined {
    return safeException(action)[1]
}
export function hasException(action: () => any) : boolean {
    return !safeException(action)[0];
}
