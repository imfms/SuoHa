import {bindMenu, bindTrigger} from "material-ui-popup-state";
import {noPropagationDefault} from "./event";
import {PopupState} from "material-ui-popup-state/core";

export const bindTriggerNoPropagationDefault : typeof bindTrigger = popupState => {
    const trigger = bindTrigger(popupState);
    return {
        ...trigger,
        onClick: noPropagationDefault(trigger.onClick)
    }
}
export const bindMenuNoClosePropagationDefault = (popupState: PopupState) => {
    const menu = bindMenu(popupState);
    return {
        ...menu,
        onClose: (event: any, reason: any) => {
            if ("preventDefault" in event) {
                (event as any)?.preventDefault?.()
            }
            if ("stopPropagation" in event) {
                (event as any)?.stopPropagation?.()
            }
            menu.onClose()
        }
    }
}