import React, {PropsWithChildren} from "react";
import {Observable} from "@reactivex/rxjs/dist/package";
import _ from "lodash";
import {fromPromise} from "@reactivex/rxjs/dist/package/internal/observable/fromPromise";
import {EnumLike} from "../../util/commonType";

export type Nullable<T> = T | null
export type Nilable<T> = T | null | undefined
export type Optional<T> = T | undefined;

export type PureRender<Data, Extra = {}> = (data: Data, extra: Extra) => React.ReactNode
export type Render<Data = void, Extra = {}, Props extends RenderComponentProps<Data, Extra> = RenderComponentProps<Data, Extra>> = (
    PureRender<Data, Extra>
    | ["render", PureRender<Data, Extra>]
    | ["component", React.ComponentType<Props>]
    | ["propsComponent", React.ComponentType<Props>, Omit<Props, "data">]
    | ["children", React.ReactNode]
    )
export type RenderComponentProps<Data, Extra = {}> = keyof Extra extends never
    ? { data: Data }
    : { data: Data, extra: Extra };

export function toPureRender<Data, Extra>(render: Render<Data, Extra>): PureRender<Data, Extra> {
    if (!_.isArray(render)) {
        return render;
    } else {
        if (render[0] === "render") {
            return render[1];
        } else if (render[0] === "component") {
            const RenderComponent = render[1];
            // @ts-ignore
            return (data) => <RenderComponent data={data}/>;
        } else if (render[0] === "propsComponent") {
            const [, RenderPropsComponent, props] = render;
            // @ts-ignore
            return (data) => <RenderPropsComponent data={data} {...props}/>;
        } else {
            return () => render[1];
        }
    }
}

export type RenderWrapper = (node: React.ReactNode) => React.ReactNode

export type ItemRender<Data> = (
    PureItemRender<Data>
    | ["render", PureItemRender<Data>]
    | ["component", React.ComponentType<RenderComponentProps<Data>>]
    )
export type PureItemRender<Item> = (item: Item, index: number) => React.ReactNode

export function toPureItemRender<Data>(render: ItemRender<Data>): PureItemRender<Data> {
    if (!_.isArray(render)) {
        return render;
    } else {
        if (render[0] === "render") {
            return render[1];
        } else {
            const ItemRenderComponent = render[1];
            return (data, index) => <ItemRenderComponent data={data}/>;
        }
    }
}

export type ListRenderComponentProps<Data> = { data: Data[], itemRender: ItemRender<Data> };
export type ListRender<Data, Extra = undefined> = (
    PureListRender<Data, Extra>
    | ["render", PureListRender<Data, Extra>]
    | ["component", React.ComponentType<ListRenderComponentProps<Data>>]
    | ["parentComponent", React.ComponentType<PropsWithChildren<{}>>]
    )
export type PureListRender<Data, Extra = undefined> = (items: Data[], itemRender: ItemRender<Data>, extra: Extra) => React.ReactNode

export function toPureListRender<Data, Extra>(render: ListRender<Data, Extra>): PureListRender<Data, Extra> {
    if (!_.isArray(render)) {
        return render;
    } else {
        if (render[0] === "render") {
            return render[1];
        } else if (render[0] === "component") {
            const ListRenderComponent = render[1];
            return (data, itemRender) => <ListRenderComponent data={data} itemRender={itemRender}/>;
        } else {
            const ParentListRenderComponent = render[1];
            return (data, itemRender) => <ParentListRenderComponent
                children={data.map((item, index) => toPureItemRender(itemRender)(item, index))}/>;
        }
    }
}

export type PagerDataProvider<Data> = (p: number, each: number) => Promise<Data[]> | Observable<Data[]>
export type PurePagerDataProvider<Data> = (p: number, each: number) => Observable<Data[]>

export function toPurePagerDataProvider<Data>(dataProvider: PagerDataProvider<Data>): PurePagerDataProvider<Data> {
    return _toPureDataProvider(dataProvider);
}

export type SearchPagerDataProvider<Data> = (keyword: string | undefined, p: number, each: number) => Promise<Data[]> | Observable<Data[]>
export type PureSearchPagerDataProvider<Data> = (keyword: string | undefined, p: number, each: number) => Observable<Data[]>

export function toPureSearchPagerDataProvider<Data>(dataProvider: SearchPagerDataProvider<Data>): PureSearchPagerDataProvider<Data> {
    return _toPureDataProvider(dataProvider);
}

export type DataProvider<Data> = () => (Promise<Data> | Observable<Data>)
export type PureDataProvider<Data> = () => Observable<Data>

export function toPureDataProvider<Data>(dataProvider: DataProvider<Data>): PureDataProvider<Data> {
    return _toPureDataProvider(dataProvider);
}

export type SearchDataProvider<Data> = (keyword: string | undefined) => (Promise<Data> | Observable<Data>)
export type PureSearchDataProvider<Data> = (keyword: string | undefined) => Observable<Data>

export function toPureSearchDataProvider<Data>(dataProvider: SearchDataProvider<Data>): PureSearchDataProvider<Data> {
    return _toPureDataProvider(dataProvider);
}

function _toPureDataProvider<DataProvider extends (...args: any) => Promise<any> | Observable<any>>(dataProvider: DataProvider): any {
    return (...args: any) => {
        const provider = dataProvider(args);
        if (provider instanceof Promise) {
            return fromPromise(provider)
        } else {
            return provider;
        }
    }
}

export function enumEntries<E extends EnumLike>(enumObj: E): [keyof E, E[keyof E]][] {
    const keys: [keyof E, E[keyof E]][] = [];

    const objectValues = Object.values(enumObj);
    if (objectValues.every(value => typeof value === "string")) {
        return Object.entries(enumObj) as [keyof E, E[keyof E]][]
    }

    for (let key in enumObj) {
        if (typeof enumObj[key] === 'number') {
            keys.push([key, enumObj[key]])
        }
    }
    return keys;
}
export function enumKeys<E extends EnumLike>(enumObj: E): (keyof E)[] {
    return enumEntries(enumObj).map(([key]) => key);
}
export function enumValues<E extends EnumLike>(enumObj: E) : E[keyof E][] {
    return enumEntries(enumObj).map(([,value]) => value);
}