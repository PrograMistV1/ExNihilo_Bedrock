import {system, world} from "@minecraft/server";
import {BarrelComponent} from "./components/blocks/BarrelComponent";
import {BARREL_TILE_ID, CRUCIBLE_TILE_ID, SIEVE_TILE_ID} from "./data/TileList";
import {SieveComponent} from "./components/blocks/SieveComponent";
import {CrucibleComponent} from "./components/blocks/CrucibleComponent";
import {InfestedLeavesComponent} from "./components/blocks/InfestedLeavesComponent";
import {CrookComponent} from "./components/items/CrookComponent";
import {HammerComponent} from "./components/items/HammerComponent";
import {SilkwormComponent} from "./components/items/SilkwormComponent";
import {SeedComponent} from "./components/items/SeedComponent";
import {progressCheckers} from "./ProgressRegistry";

system.beforeEvents.startup.subscribe((initEvent) => {
    initEvent.blockComponentRegistry.registerCustomComponent('exnihilo:barrel', new BarrelComponent());
    initEvent.blockComponentRegistry.registerCustomComponent('exnihilo:sieve', new SieveComponent());
    initEvent.blockComponentRegistry.registerCustomComponent('exnihilo:crucible', new CrucibleComponent());
    initEvent.blockComponentRegistry.registerCustomComponent('exnihilo:infested_leaves', new InfestedLeavesComponent());

    initEvent.itemComponentRegistry.registerCustomComponent('exnihilo:crook', new CrookComponent());
    initEvent.itemComponentRegistry.registerCustomComponent('exnihilo:hammer', new HammerComponent());
    initEvent.itemComponentRegistry.registerCustomComponent('exnihilo:silkworm', new SilkwormComponent());
    initEvent.itemComponentRegistry.registerCustomComponent('exnihilo:seed', new SeedComponent());

    system.runTimeout(() => {
        clearBuggedTiles();
    }, 100);
    // Check all tiles for blocks every 5 minutes
    system.runInterval(() => {
        clearBuggedTiles();
    }, 6000)
});

system.runInterval(() => {
    world.getPlayers().forEach(player => {
        const block = player.getBlockFromViewDirection({maxDistance: 6})?.block;
        if (!block) return;

        for (const [component, callback] of progressCheckers) {
            if (block.getComponent(component)) {
                try {
                    player.onScreenDisplay.setActionBar(callback(block));
                } catch (e) {
                    console.error(`Error in ${component} progress checker:`, e);
                }
                break;
            }
        }
    });
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
        world.getDimension(dimension).getEntities({type: SIEVE_TILE_ID}).forEach(entity => {
            const comp = entity.dimension.getBlock(entity.location).getComponent("exnihilo:sieve");
            if (!comp) {
                console.log(`Removing bugged sieve tile at ${Math.floor(entity.location.x)}, ${Math.floor(entity.location.y)}, ${Math.floor(entity.location.z)} in dimension ${dimension}`);
                entity.remove();
            }
        });
        world.getDimension(dimension).getEntities({type: CRUCIBLE_TILE_ID}).forEach(entity => {
            const comp = entity.dimension.getBlock(entity.location).getComponent("exnihilo:crucible");
            if (!comp) {
                console.log(`Removing bugged crucible tile at ${Math.floor(entity.location.x)}, ${Math.floor(entity.location.y)}, ${Math.floor(entity.location.z)} in dimension ${dimension}`);
                entity.remove();
            }
        });
    }
}
