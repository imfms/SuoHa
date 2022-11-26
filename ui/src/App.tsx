import React, {useState} from 'react';
import './App.css';
import {MuiTheme} from "./theme/muiTheme";
import {IconButton, ThemeProvider} from "@mui/material";
import {AdapterDateFns} from "@mui/x-date-pickers/AdapterDateFns";
import {LocalizationProvider, zhCN} from "@mui/x-date-pickers";
import {PublicMeAnyTypeComponent} from "./schema/MeTypes";
import {DialogProvider} from "./component/Dialog";
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import Grid2 from "@mui/material/Unstable_Grid2";

function App() {

    const [value, setValue] = useState(undefined);

    return (
        <LocalizationProvider adapterLocale={zhCN} dateAdapter={AdapterDateFns}>
            <ThemeProvider theme={MuiTheme}>
                <DialogProvider>
                    <Grid2 padding={2}>
                        <Grid2 container justifyContent={"end"}>
                            <IconButton onClick={() => {
                                prompt(undefined, JSON.stringify(value))
                            }}>
                                <FileDownloadOutlinedIcon/>
                            </IconButton>
                            <IconButton onClick={() => {
                                setValue(
                                    JSON.parse(prompt(undefined, undefined) as any)
                                )
                            }}>
                                <FileUploadOutlinedIcon/>
                            </IconButton>
                        </Grid2>
                        <Grid2>
                            <PublicMeAnyTypeComponent value={value} onChange={value => {
                                setValue(value);
                                console.log(value)
                            }} />
                        </Grid2>
                    </Grid2>
                </DialogProvider>
            </ThemeProvider>
        </LocalizationProvider>
    );
}

export default App;
