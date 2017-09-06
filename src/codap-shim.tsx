import * as React from "react";
import * as ReactDOM from "react-dom";
import { CodapShim } from "./components/codap-shim"

ReactDOM.render(
    <CodapShim />,
    document.getElementById("app")
);