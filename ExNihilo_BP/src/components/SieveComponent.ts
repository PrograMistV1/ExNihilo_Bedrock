import {
    Block,
    BlockComponentBlockBreakEvent,
    BlockComponentPlayerInteractEvent,
    BlockCustomComponent,
    Entity
} from "@minecraft/server";
import {BlockStateSuperset} from "@minecraft/vanilla-data";
import {getTileEntity} from "../Utils";
import {SIEVE_TILE_ID} from "../data/TileList";

type MeshType =
    "null"
    | "string"
    | "flint"
    | "iron"
    | "diamond"
    | "emerald"
    | "netherite";

export class SieveComponent implements BlockCustomComponent {
    onBreak(e: BlockComponentBlockBreakEvent): void {
        getInputBlock(e.block)?.remove();
    }

    onPlayerInteract(e: BlockComponentPlayerInteractEvent): void {
        console.log(isReadyToSieve(e.block));
        setInputBlock(e.block, "exnihilo:dirt");
    }
}

function getInputBlock(block: Block): Entity | undefined {
    return getTileEntity(block, SIEVE_TILE_ID);
}

function setInputBlock(sieve: Block, input: string): void {
    if (getInputBlock(sieve) !== undefined) return;

    const pos = sieve.location;
    sieve.dimension.spawnEntity(SIEVE_TILE_ID, {
        x: pos.x + 0.5,
        y: pos.y + 0.69,
        z: pos.z + 0.5
    }, {spawnEvent: input});
}

function getMeshType(block: Block): MeshType {
    return block.permutation.getState("exnihilo:mesh" as keyof BlockStateSuperset) as MeshType;
}

function setMeshType(block: Block, mesh: MeshType): void {
    block.setPermutation(block.permutation.withState("exnihilo:mesh" as keyof BlockStateSuperset, mesh));
}

function isReadyToSieve(block: Block): boolean {
    return getMeshType(block) !== "null" && (getInputBlock(block) !== undefined);
}