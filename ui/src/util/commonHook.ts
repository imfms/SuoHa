import {EffectCallback, useEffect, useRef} from "react";
import {Observable, OperatorFunction} from "@reactivex/rxjs/dist/package";
import {doOn} from "./rxjs";
import {loadingUiOperator} from "./commonUi";
import {Canceler} from "./commonType";

export function useOnMount(effect: EffectCallback) {
    useEffect(effect, []);
}
export function useOnUnmount(destructor: () => void) {
    useEffect(() => destructor, []);
}
export function useOnUnMounter() : (destructor: () => void) => (() => void) {
    const destructors = useRef(new Set<() => any>())
    useOnUnmount(() => {
        destructors.current.forEach(destructor => destructor())
        destructors.current.clear()
    })
    return destructor => {
        destructors.current.add(destructor)
        return () => {
            destructors.current.delete(destructor)
        }
    }
}

/**
 * 获取受生命周期控制的管道操作符
 *
 * 当组件被unmount时自动cancel所有组件内发出的请求
 */
export function useScopedOperator() {
    const cancelers = useRef(new Map<number, Canceler>());
    let cancelFlagCount = 0;

    useOnUnmount(() => {
        const cancelersCopy = cancelers.current;
        cancelersCopy.forEach(canceler => canceler());
        cancelersCopy.clear();
    });

    return <T>(observable: Observable<T>) => {
        const cancelFlag = ++cancelFlagCount;
        return observable.pipe(
            doOn({
                onSubscribe(canceler) {
                    cancelers.current.set(cancelFlag, canceler);
                },
                onError(error) {
                    cancelers.current.delete(cancelFlag);
                },
                onComplete() {
                    cancelers.current.delete(cancelFlag);
                },
                onCancel() {
                    cancelers.current.delete(cancelFlag);
                }
            })
        )
    }
}

/**
 * 获取受生命周期控制的loadingUi管道操作符
 */
export function useScopedLoadingUiOperator() {
    const scopedObservable = useScopedOperator();
    return <T>(...args: Parameters<typeof loadingUiOperator>) : OperatorFunction<T, T> => {
        return observable => {
            return scopedObservable(loadingUiOperator<T>(...args)(observable))
        }
    }
}