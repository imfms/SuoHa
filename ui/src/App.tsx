import React from 'react';
import './App.css';
import {MuiTheme} from "./theme/muiTheme";
import {ThemeProvider} from "@mui/material";
import {AdapterDateFns} from "@mui/x-date-pickers/AdapterDateFns";
import {LocalizationProvider, zhCN} from "@mui/x-date-pickers";

function App() {
    return (
        <LocalizationProvider adapterLocale={zhCN} dateAdapter={AdapterDateFns}>
            <ThemeProvider theme={MuiTheme}>

            </ThemeProvider>
        </LocalizationProvider>
    );
}

export default App;
