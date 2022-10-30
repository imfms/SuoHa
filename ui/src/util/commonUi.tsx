import {OperatorFunction} from "@reactivex/rxjs/dist/package";
import {doOn} from "./rxjs";
import React, {KeyboardEventHandler, MutableRefObject, useState} from "react";
import {Progress} from "./commonType";
import {GlobalDialog} from "../component/Dialog";
import {CircularProgress, Stack, Typography} from "@mui/material";
import {CircularProgressWithLabel} from "../component/CircularProgressWithLabel";
import {AppConstant} from "../constant";
import {isNil} from "lodash";

export type RefType<T> = ((instance: T | null) => void) | MutableRefObject<T | null> | null

export function loadingUiOperator<T>({cancelable= true, content= "加载中..."} = {}): OperatorFunction<T, T> {
    let loadingCloser : undefined | (() => void);
    const onComplete = () => {
        if (loadingCloser !== undefined) {
            loadingCloser();
            loadingCloser = undefined;
        }
    }
    return doOn<T>({
        onSubscribe(canceler) {
            let dialogCloser : (() => void) | undefined = undefined
            const delayFlag = setTimeout(() => {
                dialogCloser = GlobalDialog().show({
                    dialog: {
                        fullWidth: false,
                    },
                    contentProps: {
                        sx: {
                            minWidth: "10rem",
                        }
                    },
                    content: <Stack padding={1.5} spacing={1.5} alignItems={"center"} justifyContent={"center"}>
                        <CircularProgress/>
                        <Typography variant={"body3"} color={"text.secondary"}>{content}</Typography>
                    </Stack>,
                    actions: !cancelable ? [] : [{
                        closeOnAction: true,
                        text: "取消",
                        action: () => canceler(),
                    }]
                }).close
            }, AppConstant.LOADING_SHOW_DELAY)
            loadingCloser = () => {
                clearTimeout(delayFlag)
                if (!isNil(dialogCloser)) {
                    setTimeout(dialogCloser)
                }
            }
        },
        onComplete,
        onError: onComplete,
        onCancel: onComplete
    })
}

export function progressLoadingUiOperator<T>(
    {cancelable= true, content= "加载中..."} = {}
): OperatorFunction<Progress<T>, Progress<T>> {
    let loadingCloser : undefined | (() => void);
    const loadingUiRef : MutableRefObject<ProgressLoadingUiRef | null> = {current: null};
    const onComplete = () => {
        if (loadingCloser !== undefined) {
            loadingCloser();
            loadingCloser = undefined;
        }
    }
    return doOn<Progress<T>>({
        onSubscribe(canceler) {
            const ProgressLoadingUi = () => {
                const [percent, setPercent] = useState(0)
                loadingUiRef.current = {
                    setPercent: percent1 => setPercent(percent1)
                }
                return <Stack padding={1.5} spacing={1.5} alignItems={"center"} justifyContent={"center"}>
                    {
                        percent < 1
                            ? <CircularProgress/>
                            : <CircularProgressWithLabel value={percent}/>
                    }
                    <Typography variant={"body3"} color={"text.secondary"}>{content}</Typography>
                </Stack>
            }

            let dialogCloser : (() => void) | undefined = undefined
            const delayFlag = setTimeout(() => {
                dialogCloser = GlobalDialog().show({
                    dialog: {
                        fullWidth: false,
                        onClose: event => {
                            canceler()
                        }
                    },
                    contentProps: {
                        sx: {
                            minWidth: "10rem",
                        }
                    },
                    content: <ProgressLoadingUi/>,
                    actions: !cancelable ? [] : [{
                        text: "取消",
                        color: "inherit",
                        closeOnAction: true,
                        action: () => {
                            canceler()
                        },
                    }],
                }).close
            }, AppConstant.LOADING_SHOW_DELAY)
            loadingCloser = () => {
                clearTimeout(delayFlag)
                if (!isNil(dialogCloser)) {
                    setTimeout(dialogCloser)
                }
            }
        },
        onNext(progress) {
            if (loadingUiRef.current !== null) {
                loadingUiRef.current.setPercent(parseInt(String(progress.percent)))
            }
        },
        onComplete,
        onError: onComplete,
        onCancel: onComplete
    })
}
type ProgressLoadingUiRef = { setPercent: (percent: number) => void };

export function onKeyDown<T = Element>(key: string, action: (event: React.KeyboardEvent<T>) => void | Promise<void>) : KeyboardEventHandler<T> {
    return async event => {
            if (event.key === key) {
            const result = action(event);
            if (result instanceof Promise) {
                await result;
                return;
            }
        }
    }
}
export function onEnterKeyDown<T = Element>(action: (event: React.KeyboardEvent<T>) => void | Promise<void>) {
    return onKeyDown("Enter", action);
}

/**
 * 当回车键时提交行为
 * TODO 占位行为暂未实现
 */
export function onEnterKeySubmit(submit: () => void) {
    return {};
}
/**
 * 自动聚焦并弹出软键盘
 * TODO 占位行为暂未实现
 */
export function autoFocusAndPopupKeyboard() {
    return {};
}

export function getDisplayName(WrappedComponent: React.ComponentType<any>) {
    return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}