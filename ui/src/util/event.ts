import {MouseEventHandler} from "react";

export function noPropagation<E extends { stopPropagation: () => void }>(listener?: (event: E) => any | Promise<any>) {
    return (event: E) => {
        event?.stopPropagation()
        listener?.(event);
    }
}

export function noPropagation2<E, Listener extends MouseEventHandler<E>>(listener?: Listener) {
    return (
        event => {
            event?.stopPropagation?.()
            listener?.(event);
        }
    ) as Listener
}


export function noPreventDefault<E extends { preventDefault: () => void }>(listener?: (event: E) => void | Promise<void>) {
    return (event: E) => {
        event?.preventDefault()
        listener?.(event);
    }
}

export function noPropagationDefault<E, Listener extends MouseEventHandler<E>>(listener?: Listener): Listener {
    return (
        event => {
            event?.preventDefault?.()
            event?.stopPropagation?.()
            listener?.(event);
        }
    ) as Listener
}