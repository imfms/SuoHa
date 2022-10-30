import {
    ItemRender,
    ListRender,
    PureListRender,
    PureRender,
    RenderWrapper,
    toPureItemRender,
    toPureListRender
} from "./commonTypes";
import React, {ComponentProps, useState} from "react";
import {Box, Chip, Container, Divider, Grid, List, ListItem, Menu, MenuItem, Stack} from "@mui/material";
import {isEmpty, isNil} from "lodash";
import {bindMenuNoClosePropagationDefault, bindTriggerNoPropagationDefault} from "../../util/popupUtil";
import {noPropagationDefault} from "../../util/event";
import PopupState from "material-ui-popup-state";
import FormatListBulletedOutlinedIcon from '@mui/icons-material/FormatListBulletedOutlined';
import {ContainerProps} from "@mui/material/Container/Container";
import {opt} from "../../util/optional-js/Optional";
import {safeErrorResult} from "../../util/error";
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import {paperWrapper, stackWrapper} from "./PageComponent";

export function normalListRender<DataType>(items: DataType[], itemRender: ItemRender<DataType>): React.ReactNode {
    const pureItemRender = toPureItemRender(itemRender)
    return items.map((item, index) => (
        pureItemRender(item, index)
    ))
}

export function normalListRender2<DataType, Extra>(): ListRender<DataType, Extra> {
    return normalListRender
}

export function emptyRefreshListRender<DataType, Extra extends { refresh: () => void }>(listRender: ListRender<DataType, Extra>, option?: { fullHeight?: boolean }): PureListRender<DataType, Extra> {
    const pureListRender = toPureListRender(listRender);
    return (items, itemRender, extra) => {
        if (isEmpty(items)) {
            return <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 1,
                    height: (option?.fullHeight ?? true) ? 1 : undefined,
                }}
                onClick={() => {
                    extra?.refresh?.()
                }}
            >
                暂无数据，点击刷新
            </Box>
        } else {
            return pureListRender(items, itemRender, extra)
        }
    }
}

export function emptyAddListRender<DataType, Extra>(
    listRender: ListRender<DataType, Extra>,
    option?: {
        fullHeight?: boolean,
        describe?: React.ReactNode,
        addAction: () => void,
    }
): PureListRender<DataType, Extra> {
    const pureListRender = toPureListRender(listRender);
    return (items, itemRender, extra) => {
        if (isEmpty(items)) {
            return <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 1,
                    height: (option?.fullHeight ?? true) ? 1 : undefined,
                }}
                onClick={() => {
                    option?.addAction?.()
                }}
            >
              空空如也哦，点击添加
            </Box>
        } else {
            return pureListRender(items, itemRender, extra)
        }
    }
}

export function stackListRender<DataType, Extra>(props?: ComponentProps<typeof Stack>): PureListRender<DataType, Extra> {
    return (items, itemRender) => {
        return <Stack spacing={1} {...props}>{normalListRender<DataType>(items, itemRender)}</Stack>
    }
}

export function normalStackListRender<DataType, Extra>(): PureListRender<DataType, Extra> {
    return stackListRender({
        padding: 1,
    })
}

export const gridListRender: <DataType, Extra>(option?: {
    container?: ComponentProps<typeof Grid>,
    item?: ComponentProps<typeof Grid>,
    itemKey?: (item: DataType, index: number) => number | string,
}) => PureListRender<DataType, Extra> = (option) => {
    return (items, itemRender) => {
        return <Grid container {...option?.container}>
            {items.map((item, index) => (
                <Grid key={option?.itemKey?.(item, index)} item {...option?.item}>
                    {toPureItemRender(itemRender)(item, index)}
                </Grid>
            ))}
        </Grid>
    }
}

export function listRenderToRender<DataType, Extra>(listRender: ListRender<DataType, Extra>, itemRender: ItemRender<DataType>): PureRender<DataType[], Extra> {
    const pureListRender = toPureListRender(listRender)
    return (items, extra) => pureListRender(items, itemRender, extra)
}

export function listRenderWrapper<Render extends ListRender<any, any>>(wrapper: RenderWrapper, render: Render): Render {
    const pureListRender = toPureListRender(render);
    return ((items, itemRender, extra) => {
        return wrapper(pureListRender(items, itemRender, extra))
    }) as Render
}

export const listListRender: <DataType, Extra>(option?: {
    container?: ComponentProps<typeof List>,
    item?: ComponentProps<typeof ListItem>,
    itemsWrapper?: RenderWrapper,
    itemKey?: (item: DataType, index: number) => number | string,
}) => PureListRender<DataType, Extra> = (option) => {
    return (items, itemRender) => {
        const itemViews = items.map((item, index) => (
            <ListItem key={option?.itemKey?.(item, index)} {...option?.item}>
                {toPureItemRender(itemRender)(item, index)}
            </ListItem>
        ));
        return <List {...option?.container}>
            {!isNil(option?.itemsWrapper)
                ? option?.itemsWrapper(itemViews)
                : itemViews
            }
        </List>
    }
}


const toggleListStyle = {
    get(key: string) : number | undefined {
        return opt(localStorage.getItem(`user.list.style`))
            .map(style => safeErrorResult(() => JSON.parse(style)) as {[key: string]: number})
            .orElse({})
            [key] ?? undefined
    },
    save(key: string, value: number) {
        const saved = opt(localStorage.getItem(`user.list.style`))
            .map(style => safeErrorResult(() => JSON.parse(style)) as {[key: string]: number})
            .orElse({})
        saved[key] = value
        localStorage.setItem('user.list.style', JSON.stringify(saved))
    }
}

export function toggleListRender<DataType, Extra extends {refresh?: () => void}>(option: {
    saveKey?: string,
    renders: { name: string, render: PureListRender<DataType, Extra>, container?: ContainerProps, default?: boolean }[]
}): PureListRender<DataType, Extra> {
    const saveKey = option.saveKey ?? new URL(window.location.href).pathname
    const Wrapper: React.FC<{ items: DataType[], itemRender: ItemRender<DataType>, extra: Extra }> = (props) => {
        const [renderIndex, setRenderIndexRaw] = useState(() => {
            if (!isNil(saveKey)) {
                const savedIndex = toggleListStyle.get(saveKey);
                if (!isNil(savedIndex)) {
                    if (option.renders.length - 1 >= savedIndex) {
                        return savedIndex
                    }
                }
            }
            const defaultIndex = option.renders.findIndex(render => render.default);
            return defaultIndex >= 0 ? defaultIndex : 0
        })
        const setRenderIndex = (value: number) => {
            setRenderIndexRaw(value)
            if (!isNil(saveKey)) {
                toggleListStyle.save(saveKey, value)
            }
        }
        const currentRender = option.renders[renderIndex];

        return <Container disableGutters {...currentRender.container}>
            <PopupState variant="popover">
                {(popupState) => <>
                    <Stack
                        display={{xs: "none", md: "flex"}} justifyContent={"flex-end"} padding={.5}
                        direction={"row"} spacing={1}
                    >
                        {props.extra.refresh && (
                            <Chip
                                size={"small"} label={"刷新"} variant={"outlined"}
                                sx={{border: "none"}}
                                icon={<RefreshOutlinedIcon/>}
                                onClick={() => props.extra?.refresh?.()}
                            />
                        )}
                        <Chip
                            size={"small"} label={"排列方式"} variant={"outlined"}
                            sx={{border: "none"}}
                            icon={<FormatListBulletedOutlinedIcon/>}
                            {...bindTriggerNoPropagationDefault(popupState)}
                        />
                    </Stack>
                    <Menu {...bindMenuNoClosePropagationDefault(popupState)}>
                        {option.renders.map(({name, render}, index) => (
                            <MenuItem selected={index === renderIndex}
                                      onClick={noPropagationDefault(() => {
                                          popupState.close()
                                          setRenderIndex(index)
                                      })}>
                                {name}
                            </MenuItem>
                        ))}
                    </Menu>
                </>}
            </PopupState>
            {currentRender.render(props.items, props.itemRender, props.extra)}
        </Container>
    }

    return (items, itemRender, extra) => {
        return <Wrapper items={items} itemRender={itemRender} extra={extra}/>
    }
}

export const listDividerListRender = <DataType, Extra>(option?: {
    disableItemPadding?: boolean,
    itemKey?: (item: DataType, index: number) => number | string,
}): PureListRender<DataType, Extra> => {
    return listListRender({
        item: {disablePadding: option?.disableItemPadding},
        container: {disablePadding: option?.disableItemPadding},
        itemsWrapper: stackWrapper({divider: <Divider/>}),
        itemKey: option?.itemKey,
    })
}

export const paperListDividerListRender = <DataType, Extra>(option?: {
    disableItemPadding?: boolean,
}): PureListRender<DataType, Extra> => {
    return listRenderWrapper(paperWrapper(), listListRender({
        item: {disablePadding: option?.disableItemPadding},
        itemsWrapper: stackWrapper({divider: <Divider/>}),
    }))
}

export const normal4ColumnGridListRender: <DataType, Extra>(option?: {
    container?: ComponentProps<typeof Grid>,
    item?: ComponentProps<typeof Grid>,
}) => PureListRender<DataType, Extra> = (option) => {
    return gridListRender({
        container: {padding: 1, spacing: 1, justifyContent: "center", ...option?.container},
        item: {xs: 12, md: 6, lg: 4, xl: 3, ...option?.item},
    })
}
export const normal6ColumnGridListRender: <DataType, Extra>(option?: {
    container?: ComponentProps<typeof Grid>,
    item?: ComponentProps<typeof Grid>,
}) => PureListRender<DataType, Extra> = (option) => {
    return gridListRender({
        container: {padding: 1, spacing: 1, justifyContent: "center", ...option?.container},
        item: {xs: 12, sm: 6, md: 4, lg: 3, xl: 2, ...option?.item},
    })
}