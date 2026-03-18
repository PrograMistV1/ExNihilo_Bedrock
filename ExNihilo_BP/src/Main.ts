import {system, world} from "@minecraft/server";
import {BarrelComponent} from "./components/BarrelComponent";
import {BARREL_TILE_ID} from "./data/TileList";

system.beforeEvents.startup.subscribe((initEvent) => {
    initEvent.blockComponentRegistry.registerCustomComponent('exnihilo:barrel', new BarrelComponent());

    system.runTimeout(() => {
        clearBuggedTiles();
    }, 100);
    // Check all tiles for blocks every 5 minutes
    system.runInterval(() => {
        clearBuggedTiles();
    }, 6000)
});

function clearBuggedTiles() {
    for (const dimension of ["minecraft:nether", "minecraft:overworld", "minecraft:the_end"]) {
        world.getDimension(dimension).getEntities({type: BARREL_TILE_ID}).forEach(entity => {
            const comp = entity.dimension.getBlock(entity.location).getComponent("exnihilo:barrel");
            if (!comp) {
                console.log(`Removing bugged barrel tile at ${Math.floor(entity.location.x)}, ${Math.floor(entity.location.y)}, ${Math.floor(entity.location.z)} in dimension ${dimension}`);
                entity.remove();
            }
        });
    }
}