import {
    combineLatest,
    merge,
    NextObserver,
    Observable,
    ObservableInput,
    of,
    OperatorFunction,
    pipe,
    Subscriber,
    TeardownLogic,
    throwError,
    timer
} from "@reactivex/rxjs/dist/package";
import {
    debounceTime,
    map,
    mergeMap,
    retry as rxjsRetry,
    retryWhen,
    takeLast
} from "@reactivex/rxjs/dist/package/operators";
import {Progress} from "./commonType";
import {isArray, isEmpty} from "lodash";

export type ObservableOutput<O extends ObservableInput<any>> = O extends ObservableInput<infer Output> ? Output : never;

export function doOnNext<T>(onNext: (value: T) => void) {
    return doOn<T>({onNext});
}

export function doOnSubscribe<T>(onSubscribe: (canceler: () => void) => void) {
    return doOn<T>({onSubscribe});
}

export function doOnComplete<T>(onComplete: () => void) {
    return doOn<T>({onComplete});
}

export function doOnError<T>(onError: (error: any) => void) {
    return doOn<T>({onError});
}

export function doOnCancel<T>(onCancel: () => void) {
    return doOn<T>({onCancel});
}

export function doOn<T>(
    listener: {
        onSubscribe?: (canceler: () => void) => void,
        onNext?: (value: T) => void,
        onComplete?: () => void,
        onError?: (error: any) => void,
        onCancel?: () => void,
    }): OperatorFunction<T, T> {

    return observable => {
        return observable.lift<T>({
            // @ts-ignore
            call(targetSubscriber: Subscriber<T>, source: Observable<T>): TeardownLogic {
                let canceler: (() => void) | undefined = undefined;
                listener.onSubscribe?.(() => canceler?.());
                const subscription = source.subscribe({
                    next(value) {
                        listener.onNext?.(value)
                        targetSubscriber.next(value);
                    },
                    complete() {
                        listener.onComplete?.();
                        targetSubscriber.complete()
                    },
                    error(error) {
                        listener.onError?.(error);
                        targetSubscriber.error(error);
                    },
                })
                canceler = () => {
                    subscription.unsubscribe();
                    listener.onCancel?.();
                };
                return canceler;
            }
        })
    }
}

export function retry<T>({count = Infinity, delay = 0} = {}): OperatorFunction<T, T> {
    if (delay <= 0) {
        return rxjsRetry(count);
    }
    return retryWhen(errors => errors.pipe(mergeMap((error, index) => {
        if (index + 1 > count) {
            return throwError(error)
        }
        return timer(delay);
    })))
}

export function ofProgress<T>(data: T) : Observable<Progress<T>> {
    return of({done: true, percent: 100, result: data})
}

export function progressMap<T, R>(project: (value: T, index: number) => R): OperatorFunction<Progress<T>, Progress<R>> {
    return map<Progress<T>, Progress<R>>(
        (value, index) => !value.done
            ? value
            : {done: true, percent: 100, result: project(value.result, index)}
    )
}

export function progressMergeMap<T, R>(upstreamWeight: number, currentWeight: number, project: (value: T, index: number) => Observable<R>): OperatorFunction<Progress<T>, Progress<R>> {
    return progressMergeMapWithProgress(
        upstreamWeight, currentWeight,
        (value, index) => project(value, index).pipe(toProgress())
    )
}

export function progressMergeMapWithProgress<T, R>(upstreamWeight: number, currentWeight: number, project: (value: T, index: number) => Observable<Progress<R>>): OperatorFunction<Progress<T>, Progress<R>> {
    const totalWeight = upstreamWeight + currentWeight;
    const upstreamWeightRatio = upstreamWeight / totalWeight;
    const totalUpstreamProgress = upstreamWeightRatio * 100;
    const currentWeightRatio = currentWeight / totalWeight;
    return mergeMap<Progress<T>, Observable<Progress<R>>>((upstreamProgress, index) => {
        return !upstreamProgress.done
            ? of<Progress<R>>({
                done: false,
                percent: upstreamProgress.percent * upstreamWeightRatio,
            })
            : project(upstreamProgress.result, index).pipe(map(currentProgress => (
                !currentProgress.done
                    ? {
                        done: false,
                        percent: currentProgress.percent * currentWeightRatio + totalUpstreamProgress
                    }
                    : currentProgress
            )));
    });
}

export function progressToResult<T>(): OperatorFunction<Progress<T>, T> {
    return pipe(
        takeLast(1),
        map(value => {
            if (value.done) {
                return value.result;
            } else {
                throw new Error("will not run here");
            }
        }),
    )
}

export function toProgress<T>(): OperatorFunction<T, Progress<T>> {
    return map(value => ({done: true, percent: 100, result: value}))
}

export function progressZip<T>(observables: Array<Observable<T> | [Observable<T>, number]>): Observable<Progress<T[]>> {
    const finalObservables = observables
        .map<[Observable<T>, number]>(observable => isArray(observable) ? observable : [observable, 1])
        .map<[Observable<Progress<T>>, number]>(([observable, number]) => [observable.pipe(toProgress()), number])
    return mergeProgress(finalObservables)
}

export function mergeProgress<T>(observables: Array<Observable<Progress<T>> | [Observable<Progress<T>>, number]>): Observable<Progress<T[]>> {
    if (isEmpty(observables)) {
        return of({
            done: true,
            percent: 100,
            result: []
        })
    }
    type FlagProgress<T> = Progress<T> & {
        flag: number,
    }
    const uploadObservables = observables
        .map(observable => isArray(observable) ? observable : [observable, 1] as const)
        .map(([observable, number], index) => [
            merge<Progress<T>, Progress<T>>(
                of({
                    done: false,
                    percent: 0,
                }),
                observable
            ).pipe(map(progress => {
                const flagProgress = progress as FlagProgress<T>;
                flagProgress.flag = index;
                return flagProgress
            })),
            number
        ] as const)
    const totalWeight = uploadObservables.reduce((previousValue, currentValue) => previousValue + currentValue[1], 0)
    return combineLatest(uploadObservables.map(([observable]) => observable))
        .pipe(map<FlagProgress<T>[], Progress<T[]>>(progresses => {
            if (progresses.find(value => !value.done) !== undefined) {
                progresses.map(progress => {
                    const weight = uploadObservables[progress.flag][1]
                    return (weight / totalWeight) * progress.percent
                })
                const percent = progresses
                    .map(progress => {
                        const weight = uploadObservables[progress.flag][1]
                        return (weight / totalWeight) * progress.percent
                    })
                    .reduce((previousValue, currentValue) => previousValue + currentValue);
                return {
                    done: false,
                    percent: percent
                }
            } else {
                return {
                    done: true,
                    percent: 100,
                    result: progresses.map(value => {
                        if (value.done) {
                            return value.result;
                        } else {
                            throw new Error("will not run here");
                        }
                    })
                }
            }
        }))
        .pipe(debounceTime(100))
}


export function loggerObserver<T>(): NextObserver<T> {
    return {
        complete(): void {
            console.log("onComplete")
        },
        error(err: any): void {
            console.error(`onError: ${err}`)
            console.error(err)
        },
        next(value: T): void {
            console.log(`onNext: ${value}`)
            console.log(value)
        }
    }
}