import React, {createContext, ReactNode, useContext, useMemo, useRef, useState} from "react";
import {DialogProps as MuiDialogProps} from "@mui/material/Dialog/Dialog";
import {
    ButtonProps,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentProps as MuiDialogContentProps,
    DialogContentText,
    DialogTitle,
    DialogTitleProps,
    Divider,
    IconButton,
    ListItemButton,
    ListItemText,
    ListItemTextProps,
    Stack
} from "@mui/material";
import {useUpdate} from "react-use";
import {useOnUnmount} from "../util/commonHook";
import {isArray, isNil} from "lodash";
import {isObservable, Observable, of} from "@reactivex/rxjs/dist/package";
import {LoadingButton} from "@mui/lab";
import {doOn} from "../util/rxjs";
import {ZodType} from "zod";
import {TextFieldProps} from "@mui/material/TextField/TextField";

import {fromPromise} from "@reactivex/rxjs/dist/package/internal/observable/fromPromise";
import {ItemRender, ListRender, toPureListRender} from "./compose/commonTypes";
import {listListRender, stackListRender} from "./compose/listRenders";
import CloseIcon from '@mui/icons-material/Close';
import {stackWrapper} from "./compose/PageComponent";
import {OnSelect} from "../util/commonType";

export const useDialog = () => {
    let dialogContextValue = useCompDialog();
    // 在DialogContext外获取dialog实例则返回全局dialog实例
    if (useInnerDialog() === defaultDialogContextValue) {
        console.error("get dialog instance outside dialogContext, fallback to globalDialog")
        return GlobalDialog()
    }
    return getDialog(dialogContextValue.showDialog)
}

export const GlobalDialog = () => {
    return getDialog(GlobalContextValue.showDialog)
}

type ContextValue = {
    showDialog: (option: DialogProps) => DialogController,
};
let GlobalContextValue: ContextValue
const defaultDialogContextValue: ContextValue = {
    showDialog: (option) => ({
        close: () => {
        },
        closed: () => true,
        update: () => {
        },
        props: () => ({}),
    })
};
const DialogContext = createContext<ContextValue>(defaultDialogContextValue)
export type DialogProps = Omit<MuiDialogProps, "open" | "keepMounted" | "onClose"> & {
    fullHeight?: boolean,
    ionPage?: boolean,
    onClose?: (event: {}, reason: 'backdropClick' | 'escapeKeyDown' | 'userCall') => void,
    disableBackdropClickClose?: boolean,
};
export type DialogController = {
    close: () => void,
    closed: () => boolean,
    update: (option: DialogProps) => void,
    props: () => DialogProps,
};
export const DialogProvider: React.FC<{children?: ReactNode | undefined}> = (props) => {

    const flagCount = useRef(0)
    const dialogs = useRef<Map<number, {
        open: boolean,
        hidden: boolean,
        dialog: DialogProps,
    }>>(new Map())
    const update = useUpdate();

    const latestPurgeTask = useRef<NodeJS.Timeout | null>(null)
    const purge = useMemo(() => {
        return () => {
            if (!isNil(latestPurgeTask.current)) {
                clearTimeout(latestPurgeTask.current)
            }
            latestPurgeTask.current = setTimeout(() => {
                    latestPurgeTask.current = null
                    if (dialogs.current.size <= 0) {
                        return
                    }
                    Array.from(dialogs.current.entries())
                        .filter(([, {open}]) => !open)
                        .forEach(([flag]) => {
                            dialogs.current.delete(flag)
                        })
                }, 5000
            )
        }
    }, [])

    const close = (flag: number) => {
        const dialog = dialogs.current.get(flag)
        if (dialog && dialog.open) {
            dialog.open = false
            update()
            purge()
        }
    }

    const showDialog = useMemo<ContextValue>(() => ({
            showDialog: option => {
                const flag = ++flagCount.current
                const dialogProps = {
                    open: true,
                    hidden: option.hidden ?? false,
                    dialog: option,
                };
                dialogs.current.set(flag, dialogProps)
                update()
                return {
                    close: () => {
                        close(flag)
                        option.onClose?.({}, "userCall")
                    },
                    closed: () => !(dialogs.current.get(flag)?.open ?? false),
                    update: newOption => {
                        const dialog = dialogs.current.get(flag)
                        const oldShow = (dialog?.open ?? false) && !(dialog?.hidden ?? false)
                        if (dialog && dialog.open) {
                            const newDialogOption = {
                                open: true,
                                hidden: newOption.hidden ?? false,
                                dialog: newOption,
                            };
                            dialogs.current.set(flag, newDialogOption)
                        }
                        update()
                    },
                    props: () => dialogs.current.get(flag)?.dialog ?? option
                }
            }
        }),
        []
    )
    GlobalContextValue = showDialog

    return <>
        <DialogContext.Provider value={showDialog}>
            {props.children}
            <div id={"dialog-container"}>
                {Array.from(dialogs.current.entries()).map(([flag, {open, dialog}]) => (
                    <Dialog
                        key={flag}
                        {...dialog}
                        open={open}
                        onClose={(event, reason) => {
                            if (dialog.disableBackdropClickClose ?? false) {
                                if (reason === "backdropClick") {
                                    return;
                                }
                            }
                            close(flag)
                            dialog.onClose?.(event, reason)
                        }}
                    />
                ))}
            </div>
        </DialogContext.Provider>
    </>
}

const useInnerDialog = () => {
    return useContext(DialogContext)
}
export const useCompDialog = () => {
    const dialogs = useRef(new Map<number, DialogController>());
    let cancelFlagCount = 0;

    const {showDialog: innerShowDialog} = useInnerDialog();
    const showDialog: typeof innerShowDialog = (option) => {
        const cancelFlag = ++cancelFlagCount;
        const dialogController = innerShowDialog({
            ...option,
            onClose: (event, reason) => {
                dialogs.current.delete(cancelFlag);
                option.onClose?.(event, reason)
            },
        });
        dialogs.current.set(cancelFlag, dialogController)
        return dialogController
    }

    // 页面被卸载时关闭所有对应对话框
    useOnUnmount(() => {
        const cancelersCopy = dialogs.current;
        cancelersCopy.forEach(({close}) => close());
        dialogs.current.clear();
    })
    // 进入页面、离开页面时展示/隐藏对话框

    return {showDialog}
}

export type Action<Result = any, Param = any> = (param: Param) => (
    void
    | Promise<Result>
    | Observable<Result>
    | {
    action: Promise<Result> | Observable<Result>,
    onDone?: (result: Result) => void,
    onError?: (reason?: any) => void,
})
type PureActionResult<Result> = {
    async: boolean,
    action: Observable<Result>,
    onDone?: (result: Result) => void,
    onError?: (reason?: any) => void,
};

function toPureAction<Result, Param>(action1: Action<Result, Param>) {
    return (param: Param): PureActionResult<Result> => {
        const result = action1(param)

        if (isNil(result)) {
            // @ts-ignore
            return {async: false, action: of(undefined),}
        }
        if (result instanceof Promise) {
            return {async: true, action: fromPromise(result)}
        }
        if (isObservable(result)) {
            return {async: true, action: result}
        }
        if (typeof result === "object") {
            const {action, onDone, onError} = result
            if (isObservable(action)) {
                return {async: true, action, onDone, onError}
            } else {
                return {async: true, action: fromPromise(action), onDone, onError}
            }
        }
        throw new Error("will not run to here")
    }
}

type DialogContentProps = MuiDialogContentProps & { disablePadding?: boolean };
export type ShowDialogOption = {
    dialog?: Omit<DialogProps, "children">,
    title?: string | React.ReactNode,
    titleProps?: DialogTitleProps & {
        disableCloseButton?: boolean,
    },
    content?: string | React.ReactNode,
    contentProps?: (DialogContentProps) | false,
    actions?: ActionWrapper[],
};
type ActionWrapper = {
    text: string, action?: Action, closeOnAction?: boolean, variant?: ButtonProps["variant"], color?: ButtonProps["color"]
};
export type PureAlertDialogOption = Omit<ShowDialogOption, "actions"> & {
    confirmText?: string,
    onConfirm?: () => void,
};
export type AlertDialogOption = PureAlertDialogOption | string | [confirmText: string, onConfirm?: () => void];
export type PureConfirmDialogOption = Omit<ShowDialogOption, "actions"> & {
    confirmText?: string,
    onConfirm: Action,
    cancelText?: string,
    onCancel?: Action,
};
export type ConfirmDialogOption = PureConfirmDialogOption | [confirmContent: string, onConfirm: Action]

export type ShowInputOption = Omit<PureConfirmDialogOption, "content"> & {
    onConfirm?: Action<any, string>,
    defaultValue?: string,
    input?: TextFieldProps,
    schema?: ZodType<string>,
};

export type DialogType = ReturnType<typeof getDialog>

function getDialog(showDialog: ContextValue["showDialog"]) {
    return {
        show: (option: ShowDialogOption) => {
            const cancelers = new Map<number, () => void>()
            let cancelFlag = 0

            const contentInner = typeof option.content === "string"
                ? <DialogContentText>{option.content}</DialogContentText>
                : option.content
            const content = (option.contentProps ?? {}) === false
                ? <>{contentInner}</>
                : <DialogContent
                    {...(option.dialog?.ionPage ?? false) ? {sx: {flexGrow: 1, position: "relative"}} : {}}
                    {...option.contentProps ?? {}}
                    sx={{
                        ...(option.dialog?.ionPage ?? false) ? {flexGrow: 1, position: "relative"} : {},
                        ...((option.contentProps ?? {}) as DialogContentProps).sx,
                        ...((option.contentProps ?? {}) as DialogContentProps).disablePadding ? {padding: 0} : {},
                    }}
                >
                    {contentInner}
                </DialogContent>

            const maxHeight = (option.dialog?.fullScreen ?? false) ? "100vh" : "92vh";
            const dialogController = showDialog({
                ...option.dialog,
                onClose: (event, reason) => {
                    option.dialog?.onClose?.(event, reason)
                    cancelers.forEach(canceler => canceler())
                },
                children: <Stack sx={{
                    height: (option.dialog?.fullHeight ?? false) ? maxHeight : undefined,
                    maxHeight: maxHeight
                }}>
                    {!isNil(option.title) &&
                        <DialogTitle>{option.title}
                            {!(option.titleProps?.disableCloseButton ?? false) && (
                                <IconButton
                                    sx={{
                                        position: "absolute",
                                        top: option.dialog?.fullScreen ? "calc(var(--ion-safe-area-top) + 8)" : 8,
                                        right: 8,
                                    }}
                                    size={"small"}
                                    onClick={() => dialogController.close()}>
                                    <CloseIcon htmlColor={"#b2b2b2"}/>
                                </IconButton>
                            )}
                        </DialogTitle>}
                    {!isNil(option.content) && content}
                    {!isNil(option.actions) && <DialogActions><Stack width={1} direction={"row"} divider={<Divider orientation={"vertical"}/>}>{
                        isArray(option.actions)
                            ? option.actions.map(action => {
                                if (isNil(action)) {
                                    return action
                                }
                                if (typeof action === "object" && "text" in action) {
                                    const ifCloseOnAction = () => {
                                        if (action.closeOnAction ?? true) {
                                            dialogController.close()
                                        }
                                    }

                                    const ActionButton = () => {
                                        const [loading, setLoading] = useState(false)
                                        return <LoadingButton
                                            loading={loading}
                                            size={"large"}
                                            fullWidth
                                            sx={{flexGrow: 1}}
                                            variant={action.variant}
                                            color={action.color}
                                            onClick={() => {
                                                if (isNil(action.action)) {
                                                    ifCloseOnAction()
                                                    return
                                                }

                                                const finalAction = toPureAction(action.action)(undefined)
                                                if (!finalAction.async) {
                                                    ifCloseOnAction()
                                                    return
                                                }
                                                const taskFlag = ++cancelFlag
                                                finalAction.action.pipe(
                                                    doOn({
                                                        onSubscribe: canceler => {
                                                            setLoading(true)
                                                            cancelers.set(taskFlag, canceler)
                                                        },
                                                        onCancel: () => {
                                                            setLoading(false)
                                                        }
                                                    })
                                                ).subscribe({
                                                    next: (result) => {
                                                        finalAction.onDone?.(result)
                                                    },
                                                    complete: () => {
                                                        setLoading(false)
                                                        ifCloseOnAction()
                                                        cancelers.delete(taskFlag)
                                                    },
                                                    error: (reason) => {
                                                        (finalAction.onError ?? (() => {}))(reason)
                                                        setLoading(false)
                                                        cancelers.delete(taskFlag)
                                                    },
                                                })
                                            }}>
                                            {action.text}
                                        </LoadingButton>
                                    }
                                    return <ActionButton/>
                                }
                                return action;
                            }) as ReactNode
                            : option.actions as ReactNode
                    }</Stack></DialogActions>}
                </Stack>
            });
            return dialogController
        },
        alert(option: AlertDialogOption) {
            const finalOption: PureAlertDialogOption = typeof option === "string" ? {content: option}
                : isArray(option) ? {content: option[0], onConfirm: option[1]}
                    : option
            return this.show({
                ...finalOption,
                actions: [{
                    text: finalOption.confirmText ?? "我知道了",
                }],
                dialog: {
                    onClose: () => {
                        finalOption.onConfirm?.()
                    }
                }
            });
        },
        confirm(option: ConfirmDialogOption) {
            const finalOption: PureConfirmDialogOption = isArray(option)
                ? {content: option[0], onConfirm: option[1]}
                : option
            const {confirmText = "确认", onConfirm, cancelText, onCancel, ...otherProps} = finalOption
            return this.show({
                ...otherProps,
                actions: [
                    {
                        text: cancelText ?? "取消",
                        closeOnAction: true,
                        action: onCancel,
                        color: "inherit",
                    },
                    {
                        text: confirmText ?? "确认",
                        closeOnAction: true,
                        action: onConfirm,
                    }
                ]
            })
        },
        showItems<ItemType>(option: Omit<ShowDialogOption, "content"> & {
            listRender?: ListRender<ItemType, any>,
            itemRender: ItemRender<ItemType>,
            items: ItemType[],
        }) {
            const {listRender, itemRender, items, ...dialogOptions} = option
            const pureListRender = !isNil(option.listRender) ? toPureListRender(option.listRender)
                : stackListRender<ItemType, any>()
            return this.show({
                ...dialogOptions,
                content: pureListRender(option.items, option.itemRender, undefined)
            })
        },
        showTextItems<ItemType>(option: Omit<ShowDialogOption, "content"> & {
            items: ItemType[],
            showText: (item: ItemType) => string | ListItemTextProps,
            onItemClick: (item: ItemType) => void,
        }) {
            const {items, showText, onItemClick, ...showDialogOption} = option
            const controller = this.showItems<ItemType>({
                ...showDialogOption,
                contentProps: {disablePadding: true},
                listRender: listListRender({
                    container: {
                        disablePadding: true,
                    },
                    item: {
                        disablePadding: true,
                    },
                    itemsWrapper: stackWrapper({divider: <Divider/>}),
                }),
                itemRender: item => {
                    const showText = option.showText(item);
                    return <ListItemButton onClick={() => {
                        option.onItemClick?.(item)
                        controller.close()
                    }}>
                        <ListItemText
                            {
                                ...typeof showText === "string"
                                    ? {children: showText}
                                    : showText
                            }
                        />
                    </ListItemButton>
                },
                items: option.items,
            });
            return controller
        },
        confirmObservable<Result, >(
            props: Omit<PureConfirmDialogOption, "onConfirm"> & {
                onConfirm?: () => void | Promise<void>
                action: () => Observable<Result>,
                onError?: (error: any) => void,
                onDone: (result: Result) => void,
            }
        ) {
            return this.confirm({
                ...props,
                onConfirm: () => {
                    return {
                        action: props.action(),
                        onDone: props.onDone,
                        onError: props.onError,
                    }
                }
            })
        },
        showDataSelect<T>(option: Omit<ShowDialogOption, "content" | "actions"> & {
            selector: (
                onSelect: OnSelect<T>, selectedData: T | undefined
            ) => React.ReactNode,
            onSelect?: OnSelect<T>,
            selectedData?: T,
            trigger?: () => Promise<T>,
        }) {
            const result = this.show({
                ...option,
                actions: option.trigger === undefined ? undefined : [
                    {
                        text: "取消",
                        color: "inherit",
                    },
                    {
                        text: "确认",
                        action: async () => {
                            try {
                                const result = await option.trigger!();
                                option.onSelect?.(result)
                            } catch (error) {
                                return Promise.reject(error)
                            }
                        },
                    },
                ],
                content: option.selector(data => {
                    option.onSelect?.(data)
                    result.close()
                }, option.selectedData)
            });
            return result;
        }
    }
}