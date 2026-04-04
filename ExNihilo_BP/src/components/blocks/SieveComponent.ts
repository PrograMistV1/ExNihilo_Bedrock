import {
    Block,
    BlockComponentBlockBreakEvent,
    BlockComponentPlayerBreakEvent,
    BlockComponentPlayerInteractEvent,
    BlockCustomComponent,
    ButtonState,
    InputButton,
    ItemStack,
    ItemUseAfterEvent,
    Player,
    system,
    VanillaEntityIdentifier,
    world
} from "@minecraft/server";
import {BlockStateSuperset} from "@minecraft/vanilla-data";
import {consumeSelectedItem, getSelectedItemContext, getTileEntity} from "../../Utils";
import {
    MESH_ITEM_BY_TYPE,
    MESH_TYPE_BY_ITEM,
    MeshType,
    SIEVE_CONSTANTS,
    SIFTABLE_BLOCK_STATES,
    VARIANT_STATE_MAP
} from "../../data/SieveData";
import {SIEVE_TILE_ID} from "../../data/TileList";
import {DROP_BY_MESH, rollDrops} from "../../data/loot/SieveLoot";

export class SieveComponent implements BlockCustomComponent {
    onBreak(e: BlockComponentBlockBreakEvent): void {
        removeInputBlock(e.block);
    }

    onPlayerInteract(e: BlockComponentPlayerInteractEvent): void {
        handleMesh(e.player, e.block);
        handleProgress(e.block);
        handleInput(e.player, e.block);
    }

    onPlayerBreak(e: BlockComponentPlayerBreakEvent): void {
        const mesh = e.brokenBlockPermutation.getState("exnihilo:mesh" as keyof BlockStateSuperset) as MeshType;
        if (mesh === "null") return;

        e.dimension.spawnItem(new ItemStack(MESH_ITEM_BY_TYPE[mesh]),
            {
                x: e.block.x + 0.5,
                y: e.block.y + 0.5,
                z: e.block.z + 0.5
            }
        );
    }
}

function handleProgress(block: Block): void {
    for (const targetBlock of getSieveNeighbors(block)) {
        if (!isReadyToSieve(targetBlock)) continue;

        const progress = getProgress(targetBlock) + (1 / SIEVE_CONSTANTS.maxSieveClicks);
        if (progress >= SIEVE_CONSTANTS.completeProgress) {
            rollDrops(getMeshType(targetBlock), getInputBlock(targetBlock)).forEach(drop => {
                targetBlock.dimension.spawnItem(drop, {
                    x: targetBlock.location.x + 0.5,
                    y: targetBlock.location.y + 1,
                    z: targetBlock.location.z + 0.5
                });
            });
            removeInputBlock(targetBlock);
            continue;
        }
        setProgress(targetBlock, progress);
    }
}

function handleInput(player: Player, block: Block): void {
    const selectedItem = getSelectedItemContext(player);
    if (!selectedItem?.item) return;

    const state = blockToState(selectedItem.item.typeId);
    if (!state) return;

    for (const targetBlock of getSieveNeighbors(block)) {
        const mesh = getMeshType(targetBlock);
        const input = getInputBlock(targetBlock);
        if (mesh === "null" || input !== undefined || !canBeSifted(state, mesh)) continue;

        setInputBlock(targetBlock, state);
        if (consumeSelectedItem(selectedItem) === 0) break;
    }
}

function canBeSifted(input: string, mesh: MeshType): boolean {
    return Object.keys(DROP_BY_MESH[mesh]).includes(input);
}

function handleMesh(player: Player, block: Block): void {
    const selectedItem = getSelectedItemContext(player);
    if (!selectedItem) return;

    const oldMesh = getMeshType(block);
    if (oldMesh === "null" && isMeshItemId(selectedItem.item?.typeId)) {
        setMeshType(block, itemToMeshType(selectedItem.item.typeId));
        selectedItem.container.setItem(selectedItem.slot, null);
        return;
    }

    const lastInteractTick = (player.getDynamicProperty("last_sieve_interact") as number | undefined) ?? 0;
    if (system.currentTick - lastInteractTick < SIEVE_CONSTANTS.interactCooldownTicks) return;

    if (oldMesh !== "null"
        && player.inputInfo.getButtonState(InputButton.Sneak) === ButtonState.Pressed
        && selectedItem.item == null
        && getInputBlock(block) === undefined
    ) {
        setMeshType(block, "null");
        selectedItem.container.setItem(selectedItem.slot, meshTypeToItem(oldMesh));
    }
}

world.afterEvents.itemUse.subscribe((event: ItemUseAfterEvent) => {
    const player = event.source;
    const selectedItem = getSelectedItemContext(player);
    if (!selectedItem?.item) return;

    const block = player.getBlockFromViewDirection({maxDistance: SIEVE_CONSTANTS.maxViewDistance})?.block;

    if (!isSieveBlock(block) || !isMeshItemId(selectedItem.item.typeId)) return;

    const oldMesh = getMeshType(block);
    setMeshType(block, itemToMeshType(selectedItem.item.typeId));
    selectedItem.container.setItem(selectedItem.slot, meshTypeToItem(oldMesh));
    player.setDynamicProperty("last_sieve_interact", system.currentTick);
});

function* getSieveNeighbors(block: Block): Generator<Block> {
    const radius = SIEVE_CONSTANTS.neighborRadius;
    const origin = block.location;
    //center offset
    let x = 0;
    let z = 0;
    //vector (1,0)-right, (-1,0)-left, (0,1)-up, (0,-1)-down
    let dx = 1;
    let dz = 0;

    let segmentLength = 1;
    let segmentPassed = 0;
    let segmentCount = 0;

    const maxSteps = (radius * 2 + 1) ** 2;

    for (let i = 0; i < maxSteps; i++) {
        if (Math.abs(x) <= radius && Math.abs(z) <= radius) {
            const targetBlock = block.dimension.getBlock({
                x: origin.x + x,
                y: origin.y,
                z: origin.z + z
            });

            if (isSieveBlock(targetBlock)) {
                yield targetBlock;
            }
        }

        x += dx;
        z += dz;
        segmentPassed++;

        if (segmentPassed === segmentLength) {
            segmentPassed = 0;

            const temp = dx;
            dx = -dz;
            dz = temp;

            segmentCount++;

            if (segmentCount % 2 === 0) {
                segmentLength++;
            }
        }
    }
}

function getInputBlock(sieve: Block): string | undefined {
    const tile = getTileEntity(sieve, SIEVE_TILE_ID);
    if (!tile) return undefined;

    return VARIANT_STATE_MAP[tile.getComponent("minecraft:variant").value];
}

function setInputBlock(sieve: Block, input: string): void {
    if (getTileEntity(sieve, SIEVE_TILE_ID) !== undefined) return;

    const pos = sieve.location;
    sieve.dimension.spawnEntity(SIEVE_TILE_ID as keyof VanillaEntityIdentifier, {
        x: pos.x + SIEVE_CONSTANTS.inputEntityCenterOffset,
        y: pos.y + SIEVE_CONSTANTS.inputEntityHeightOffset,
        z: pos.z + SIEVE_CONSTANTS.inputEntityCenterOffset
    }, {spawnEvent: input});
}

function removeInputBlock(sieve: Block): void {
    getTileEntity(sieve, SIEVE_TILE_ID)?.remove();
}

function getProgress(sieve: Block): number | undefined {
    const tile = getTileEntity(sieve, SIEVE_TILE_ID);
    if (!tile) return undefined;

    return tile.getProperty("exnihilo:progress") as number;
}

function setProgress(sieve: Block, progress: number): void {
    const tile = getTileEntity(sieve, SIEVE_TILE_ID);
    if (!tile) return;

    tile.setProperty("exnihilo:progress", progress);
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

function isSieveBlock(block?: Block): block is Block {
    return !!block?.getComponent("exnihilo:sieve");
}

function isMeshItemId(itemId?: string): itemId is keyof typeof MESH_TYPE_BY_ITEM {
    return itemId !== undefined && Object.prototype.hasOwnProperty.call(MESH_TYPE_BY_ITEM, itemId);
}

function blockToState(blockId?: string): string | undefined {
    if (!blockId) return undefined;
    return SIFTABLE_BLOCK_STATES[blockId];
}

function meshTypeToItem(type: MeshType): ItemStack | null {
    if (type === "null") return null;
    return new ItemStack(MESH_ITEM_BY_TYPE[type], 1);
}

function itemToMeshType(itemId?: string): MeshType {
    if (!isMeshItemId(itemId)) return "null";
    return MESH_TYPE_BY_ITEM[itemId];
}