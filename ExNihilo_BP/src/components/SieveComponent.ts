import {
    Block,
    BlockComponentBlockBreakEvent,
    BlockComponentOnPlaceEvent,
    BlockComponentPlayerInteractEvent,
    BlockCustomComponent,
    Entity
} from "@minecraft/server";
import {BlockStateSuperset} from "@minecraft/vanilla-data";
import {getTileEntity} from "../Utils";
import {SIEVE_TILE_ID} from "../data/TileList";

export class SieveComponent implements BlockCustomComponent {
    onPlace(e: BlockComponentOnPlaceEvent): void {
        const block = e.block;
        const permutation = block.permutation
            .withState("exnihilo:mesh" as keyof BlockStateSuperset, "emerald");
        block.setPermutation(permutation);

        const pos = e.block.location;
        const tile = e.block.dimension.spawnEntity(SIEVE_TILE_ID, {
            x: pos.x + 0.5,
            y: pos.y + 0.69,
            z: pos.z + 0.5
        });
    }

    onBreak(e: BlockComponentBlockBreakEvent): void {
        getSieveTile(e.block)?.remove();
    }

    onPlayerInteract(e: BlockComponentPlayerInteractEvent): void {
        const tile = getSieveTile(e.block);
        tile.setProperty("exnihilo:progress", Math.random());
    }
}

function getSieveTile(block: Block): Entity | null {
    return getTileEntity(block, SIEVE_TILE_ID);
}