import {
    CommandPermissionLevel,
    CustomCommandOrigin,
    CustomCommandParamType,
    CustomCommandStatus,
    Player,
    system,
    world
} from "@minecraft/server";
import {BarrelComponent} from "./components/blocks/BarrelComponent";
import {SieveComponent} from "./components/blocks/SieveComponent";
import {CrucibleComponent} from "./components/blocks/CrucibleComponent";
import {InfestedLeavesComponent} from "./components/blocks/InfestedLeavesComponent";
import {CrookComponent} from "./components/items/CrookComponent";
import {HammerComponent} from "./components/items/HammerComponent";
import {SilkwormComponent} from "./components/items/SilkwormComponent";
import {SeedComponent} from "./components/items/SeedComponent";
import {setProgressVisibility} from "./utils/ProgressRegistry";
import {FallingBlockComponent} from "./components/blocks/FallingBlockComponent";
import {MeshComponent} from "./components/items/MeshComponent";

system.beforeEvents.startup.subscribe((initEvent) => {
    initEvent.blockComponentRegistry.registerCustomComponent('exnihilo:barrel', new BarrelComponent());
    initEvent.blockComponentRegistry.registerCustomComponent('exnihilo:sieve', new SieveComponent());
    initEvent.blockComponentRegistry.registerCustomComponent('exnihilo:crucible', new CrucibleComponent());
    initEvent.blockComponentRegistry.registerCustomComponent('exnihilo:infested_leaves', new InfestedLeavesComponent());
    initEvent.blockComponentRegistry.registerCustomComponent('exnihilo:falling_block', new FallingBlockComponent());

    initEvent.itemComponentRegistry.registerCustomComponent('exnihilo:crook', new CrookComponent());
    initEvent.itemComponentRegistry.registerCustomComponent('exnihilo:hammer', new HammerComponent());
    initEvent.itemComponentRegistry.registerCustomComponent('exnihilo:silkworm', new SilkwormComponent());
    initEvent.itemComponentRegistry.registerCustomComponent('exnihilo:seed', new SeedComponent());
    initEvent.itemComponentRegistry.registerCustomComponent('exnihilo:mesh', new MeshComponent());

    initEvent.customCommandRegistry.registerCommand({
        name: "exnihilo:showprogress",
        description: "command.exnihilo.showprogress.description",
        cheatsRequired: false,
        permissionLevel: CommandPermissionLevel.Any,
        mandatoryParameters: [{name: "show", type: CustomCommandParamType.Boolean}]
    }, (origin: CustomCommandOrigin, show: boolean) => {
        if (!(origin.sourceEntity instanceof Player)) return {
            status: CustomCommandStatus.Failure,
            message: "command.exnihilo.invalidPlayer"
        };
        setProgressVisibility(origin.sourceEntity, show);
        return {status: CustomCommandStatus.Success}
    });

    system.runTimeout(clearBuggedTiles, 100);
    system.runInterval(clearBuggedTiles, 6000) // Check all tiles for blocks every 5 minutes
});

function clearBuggedTiles() {
    const TILE_TYPES = [
        {tileId: BarrelComponent.TILE_ID, blockComp: "exnihilo:barrel", name: "barrel"},
        {tileId: SieveComponent.TILE_ID, blockComp: "exnihilo:sieve", name: "sieve"},
        {tileId: CrucibleComponent.TILE_ID, blockComp: "exnihilo:crucible", name: "crucible"},
    ];

    const DIMENSIONS = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];

    for (const dimensionId of DIMENSIONS) {
        const dimension = world.getDimension(dimensionId);
        const {min, max} = dimension.heightRange;

        for (const {tileId, blockComp, name} of TILE_TYPES) {
            dimension.getEntities({type: tileId}).forEach(entity => {
                const {x, y, z} = entity.location;
                const outOfBounds = y < min || y > max;
                const missingComp = !outOfBounds && !dimension.getBlock(entity.location)?.getComponent(blockComp);

                if (outOfBounds || missingComp) {
                    console.log(`Removing bugged ${name} tile at ${Math.floor(x)}, ${Math.floor(y)}, ${Math.floor(z)} in dimension ${dimensionId}`);
                    entity.remove();
                }
            });
        }
    }
}