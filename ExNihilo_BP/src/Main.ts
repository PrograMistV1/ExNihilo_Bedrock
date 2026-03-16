import {system, world} from "@minecraft/server";
import {BarrelComponent} from "./components/BarrelComponent";
import {BARREL_TILE_ID} from "./data/TileList";

system.beforeEvents.startup.subscribe((initEvent) => {
    initEvent.blockComponentRegistry.registerCustomComponent('exnihilo:barrel', new BarrelComponent());

    // Check all tiles for blocks every 5 minutes
    system.runTimeout(() => {
        for (const dimension of ["minecraft:nether", "minecraft:overworld", "minecraft:the_end"]) {
            world.getDimension(dimension).getEntities({type: BARREL_TILE_ID}).forEach(entity => {
                const comp = entity.dimension.getBlock(entity.location).getComponent("exnihilo:barrel");
                if (!comp) entity.remove();
            });
        }
    }, 6000)
});