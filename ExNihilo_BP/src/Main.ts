import {system} from "@minecraft/server";
import {BarrelComponent} from "./components/BarrelComponent";

system.beforeEvents.startup.subscribe((initEvent) => {
    initEvent.blockComponentRegistry.registerCustomComponent('exnihilo:barrel', new BarrelComponent());
});