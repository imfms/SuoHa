import React, {ComponentProps} from "react";

import {getDisplayName} from "../../util/commonUi";
import {RenderWrapper} from "./commonTypes";
import {Box, Card, Container, Grid, Paper, Stack} from "@mui/material";

export type PureHeader = {
    title?: string | React.ReactNode,
    showBack?: boolean | (() => void),
    buttons?: ({ icon: string, onClick: () => void } | { text: string, onClick: () => void })[],
    onlyWideShow?: boolean,
    safeArea?: boolean,
};
export type Header = string | PureHeader;

export function boxWrapper(props?: ComponentProps<typeof Box>) : RenderWrapper {
    return node => <Box {...props}>
        {node}
    </Box>
}
export function containerWrapper(props?: ComponentProps<typeof Container>) : RenderWrapper {
    return node => <Container disableGutters {...props}>
        {node}
    </Container>
}
export function stackWrapper(props?: ComponentProps<typeof Stack>) : RenderWrapper {
    return node => <Stack {...props}>
        {node}
    </Stack>
}
export function gridWrapper(props?: ComponentProps<typeof Grid>) : RenderWrapper {
    return node => <Grid
        container flexDirection={"column"} spacing={1} padding={1}
        {...props}>
        {node}
    </Grid>
}
export function paperWrapper(props?: ComponentProps<typeof Paper>) : RenderWrapper {
    return node => <Paper
        {...props}>
        {node}
    </Paper>
}
export function cardWrapper(props?: ComponentProps<typeof Card>) : RenderWrapper {
    return node => <Card
        {...props}>
        {node}
    </Card>
}
export function chainWrapper(...wrappers: RenderWrapper[]) : RenderWrapper {
    const reverseWrappers = wrappers.reverse();
    return node => reverseWrappers.reduce((previousNode, wrapper) => wrapper(previousNode), node)
}
export function containerGridWrapper(props?: {
    container?: ComponentProps<typeof Container>,
    grid?: ComponentProps<typeof Grid>,
}) : RenderWrapper {
    return chainWrapper(
        containerWrapper(props?.container),
        gridWrapper(props?.grid)
    )
}
export function normalPaddingWrapper() : RenderWrapper {
    return boxWrapper({padding: 2})
}
export function normalPadding1Wrapper() : RenderWrapper {
    return boxWrapper({padding: 1})
}
export function containerMaxXsWrapper(props?: ComponentProps<typeof Container>) : RenderWrapper {
    return containerWrapper({maxWidth: "xs", sx: {padding: 2}, ...props})
}
export function containerMaxSmWrapper(props?: ComponentProps<typeof Container>) : RenderWrapper {
    return containerWrapper({maxWidth: "sm", sx: {padding: 2}, ...props})
}
export function containerMaxMdWrapper(props?: ComponentProps<typeof Container>) : RenderWrapper {
    return containerWrapper({maxWidth: "md", sx: {padding: 2}, ...props})
}
export function containerMaxLgWrapper(props?: ComponentProps<typeof Container>) : RenderWrapper {
    return containerWrapper({maxWidth: "lg", sx: {padding: 2}, ...props})
}
export function containerGridMaxSmWrapper() : RenderWrapper {
    return containerGridWrapper({container: {maxWidth: "sm"}})
}
export function containerGridMaxMdWrapper() : RenderWrapper {
    return containerGridWrapper({container: {maxWidth: "md"}})
}

export function withFixedProps<Props, FixedProps extends Partial<Props> = Partial<Props>>(Component: React.ComponentType<Props>, fixedProps: FixedProps) {
    const newComponent: React.FC<Omit<Props, keyof FixedProps>> = (props) => {
        // @ts-ignore
        return <Component {...fixedProps} {...props} />;
    };
    newComponent.displayName = `withFixedProps(${getDisplayName(Component)})`
    return newComponent
}
