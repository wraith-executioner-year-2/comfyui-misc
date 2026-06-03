import { app } from "../../scripts/app.js";
import { installLiteGraphTypeCompatibility } from "./utils/litegraph-type-compat.js";

app.registerExtension({
  name: "comfyui-misc.TypeCompat",
  init() {
    installLiteGraphTypeCompatibility();
  }
});
