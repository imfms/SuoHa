import React, {useState} from 'react';
import './App.css';
import {MuiTheme} from "./theme/muiTheme";
import {ThemeProvider} from "@mui/material";
import {AdapterDateFns} from "@mui/x-date-pickers/AdapterDateFns";
import {LocalizationProvider, zhCN} from "@mui/x-date-pickers";
import {PublicMeAnyTypeComponent} from "./schema/MeTypes";

function App() {

    const [value, setValue] = useState(undefined);

    return (
        <LocalizationProvider adapterLocale={zhCN} dateAdapter={AdapterDateFns}>
            <ThemeProvider theme={MuiTheme}>
                <PublicMeAnyTypeComponent value={value} onChange={value => {
                    setValue(value);
                    console.log(value)
                }} />
            </ThemeProvider>
        </LocalizationProvider>
    );
}

export default App;
