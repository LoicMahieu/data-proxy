import React from "react";
import ReactDOM from "react-dom";
import App from "./App";

const root = document.createElement("div");
document.body.appendChild(root);

import { createRoot } from "react-dom/client";
const reactRoot = createRoot(root);
reactRoot.render(<App />);
