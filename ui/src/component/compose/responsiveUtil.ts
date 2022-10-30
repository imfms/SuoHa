import {useMedia} from "react-use";

export const useIsWide = () => {
    return useMedia("(min-width: 700px)")
}