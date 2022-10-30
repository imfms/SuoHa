
const parse: (typeof JSON.parse) = (text, reviver) => {
    return JSON.parse(text, (key, value) => {
        if (value === null) {
            return undefined;
        }
        if (reviver !== undefined) {
            return reviver(key, value);
        }
        return value;
    })
}
export const Json = {
    stringify: JSON.stringify,
    parse,
}