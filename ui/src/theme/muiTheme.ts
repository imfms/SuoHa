import {createTheme} from "@mui/material";
import React from "react";
// noinspection ES6UnusedImports
import {} from '@mui/lab/themeAugmentation';
// noinspection ES6UnusedImports
// import {} from '@mui/x-date-pickers/themeAugmentation';

export const MuiTheme = createTheme({
    palette: {
        unimportant: {
            main: "#eeeeee",
            light: "#ffffff",
            dark: "#c7c7c7",
            contrastText: "#595959"
        },
        tertiary: {
            main: "#9bb1c1",
            light: "#cce3f4",
            dark: "#6c8291",
            contrastText: "#ffffff",
        },
    },
    typography: {
        h1: {fontSize: "2.75rem"},
        h2: {fontSize: "2.5rem"},
        h3: {fontSize: "2.25rem"},
        h4: {fontSize: "2rem"},
        h5: {fontSize: "1.75rem"},
        h6: {fontSize: "1.25rem"},
        subtitle1: {
            fontWeight: "bold",
        },
        subtitle2: {
            fontWeight: "bold",
        },
        body3: {fontSize: "0.75rem"},
    },
    components: {
        MuiAutocomplete: {
            defaultProps: {
                noOptionsText: "无结果",
                autoHighlight: true,
            }
        },
        MuiTypography: {
            defaultProps: {
                variantMapping: {
                    body3: "p",
                }
            }
        },
        MuiButtonBase: {
            styleOverrides: {}
        },
        MuiButton: {
            styleOverrides: {
                sizeExtraSmall: {
                    fontSize: "0.7rem",
                    paddingLeft: "7px",
                    paddingRight: "7px",
                    paddingTop: "2px",
                    paddingBottom: "2px",
                },
            },
        },
        // MuiDatePicker: {
        //     defaultProps: {
        //         showToolbar: false,
        //         inputFormat: "yyyy-MM-dd",
        //         mask: "____-__-__",
        //         // @ts-ignore
        //         inputProps: {
        //             placeholder: "年-月-日",
        //         },
        //         cancelText: "取消",
        //         clearText: "清空",
        //         clearable: true,
        //         okText: "选择",
        //         DialogProps: {fullWidth: false},
        //     }
        // },
        // MuiMobileDatePicker: {
        //     defaultProps: {
        //         showToolbar: false,
        //         inputFormat: "yyyy-MM-dd",
        //         cancelText: "取消",
        //         clearText: "清空",
        //         clearable: true,
        //         okText: "选择",
        //         DialogProps: {fullWidth: false},
        //     }
        // },
        // MuiMobileDateTimePicker: {
        //     defaultProps: {
        //         showToolbar: false,
        //         inputFormat: "yyyy-MM-dd HH:mm:ss",
        //         ampm: false,
        //         cancelText: "取消",
        //         clearText: "清空",
        //         clearable: true,
        //         okText: "选择",
        //         DialogProps: {fullWidth: false},
        //     }
        // },
        // MuiStaticTimePicker: {
        //     defaultProps: {
        //         showToolbar: false,
        //         ampm: false,
        //         cancelText: "取消",
        //         clearText: "清空",
        //         clearable: true,
        //         okText: "选择",
        //     }
        // },
        // MuiMobileTimePicker: {
        //     defaultProps: {
        //         showToolbar: false,
        //         inputFormat: "HH:mm:ss",
        //         ampm: false,
        //         cancelText: "取消",
        //         clearText: "清空",
        //         clearable: true,
        //         okText: "选择",
        //         DialogProps: {fullWidth: false},
        //     }
        // },
        MuiTable: {
            defaultProps: {
                sx: {
                    overflowWrap: "anywhere",
                }
            },
        },
        // MuiMasonry: {
        //     defaultProps: {
        //         sx: {}
        //     }
        // },
        MuiMenu: {
            defaultProps: {
                anchorOrigin: {vertical: "bottom", horizontal: "center"},
                transformOrigin: {
                    vertical: "top",
                    horizontal: "center",
                },
            }
        },
        MuiTextField: {
            defaultProps: {
                fullWidth: true,
            }
        },
        MuiDialog: {
            styleOverrides: {
                root: {
                    '& .MuiDialog-paperFullScreen': {
                        paddingTop: "var(--ion-safe-area-top)",
                        '& > div': {
                            height: "100%",
                        },
                    }
                }
            },
            defaultProps: {
                fullWidth: true,
            }
        },
        MuiDialogTitle: {
            styleOverrides: {
                root: {
                    fontSize: "1.2rem",
                    textAlign: "center",
                    paddingLeft: "12px", paddingRight: "12px",
                    paddingTop: "12px", paddingBottom: "12px", marginBottom: "6px",
                    borderBottom: "1px solid rgba(0, 0, 0, 0.12)"
                }
            },
        },
        MuiDialogContent: {
            styleOverrides: {
                root: {
                    paddingLeft: "12px",
                    paddingRight: "12px",
                    paddingBottom: "12px",
                    '& ': {
                        "--ion-safe-area-top": 0,
                    }
                }
            }
        },
        MuiDialogActions: {
            styleOverrides: {
                root: {
                    borderTop: "1px solid rgba(0, 0, 0, 0.12)",
                    padding: "2px",
                }
            }
        },
        MuiDialogContentText: {
            styleOverrides: {
                root: {
                    textAlign: "center",
                    color: "#262626",
                    fontSize: "1.1rem",
                }
            }
        },
        MuiCircularProgress: {
            defaultProps: {
                disableShrink: true,
            }
        },
        MuiContainer: {
            defaultProps: {
                maxWidth: false,
            }
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    minWidth: 0,
                }
            }
        }
    }
})

declare module '@mui/material/styles' {
    interface TypographyVariants {
        body3: React.CSSProperties;
    }

    // allow configuration using `createTheme`
    interface TypographyVariantsOptions {
        body3?: React.CSSProperties;
    }
}

// Update the Typography's variant prop options
declare module '@mui/material/Typography' {
    interface TypographyPropsVariantOverrides {
        body3: true;
    }
}

declare module '@mui/material/styles/createPalette' {
    interface Palette {
        unimportant: Palette['primary'];
        tertiary: Palette['primary'];
    }

    interface PaletteOptions {
        unimportant: PaletteOptions['primary'];
        tertiary: PaletteOptions['primary'];
    }
}

declare module "@mui/material/Button/Button" {
    export interface ButtonPropsColorOverrides {
        unimportant: true,
        tertiary: true,
    }

    export interface ButtonPropsSizeOverrides {
        extraSmall: true,
    }
}
declare module "@mui/material/Button/buttonClasses" {
    export interface ButtonClasses {
        sizeExtraSmall: string,
    }
}