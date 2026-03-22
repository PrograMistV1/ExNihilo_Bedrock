import {
    Block,
    BlockComponentBlockBreakEvent,
    BlockComponentPlayerInteractEvent,
    BlockCustomComponent,
    ButtonState,
    Entity,
    InputButton,
    ItemStack,
    ItemUseAfterEvent,
    Player,
    system,
    world
} from "@minecraft/server";
import {BlockStateSuperset} from "@minecraft/vanilla-data";
import {consumeSelectedItem, getSelectedItemContext, getTileEntity} from "../Utils";
import {
    MESH_ITEM_BY_TYPE,
    MESH_TYPE_BY_ITEM,
    MeshType,
    SIEVE_CONSTANTS,
    SIFTABLE_BLOCK_STATES
} from "../data/SieveData";
import {SIEVE_TILE_ID} from "../data/TileList";

export class SieveComponent implements BlockCustomComponent {
    onBreak(e: BlockComponentBlockBreakEvent): void {
        getInputBlock(e.block)?.remove();
    }

    onPlayerInteract(e: BlockComponentPlayerInteractEvent): void {
        handleMesh(e.player, e.block);
        handleProgress(e.block);
        handleInput(e.player, e.block);
    }
}

function handleProgress(block: Block): void {
    forEachSieveNeighbor(block, true, (targetBlock) => {
        if (!isReadyToSieve(targetBlock)) return;

        const input = getInputBlock(targetBlock);
        if (!input) return;

        const progress = (input.getProperty("exnihilo:progress") as number) + (1 / SIEVE_CONSTANTS.maxSieveClicks);
        if (progress >= SIEVE_CONSTANTS.completeProgress) {
            input.remove();
            // todo drop
            return;
        }

        input.setProperty("exnihilo:progress", progress);
    });
}

function handleInput(player: Player, block: Block): void {
    const selectedItem = getSelectedItemContext(player);
    if (!selectedItem?.item) return;

    const state = blockToState(selectedItem.item.typeId);
    if (!state) return;

    if (getMeshType(block) === "null" || getInputBlock(block)) return;

    setInputBlock(block, state);
    if (consumeSelectedItem(selectedItem) === 0) return;

    forEachSieveNeighbor(block, false, (targetBlock) => {
        if (getMeshType(targetBlock) === "null" || isReadyToSieve(targetBlock)) return;

        setInputBlock(targetBlock, state);
        if (consumeSelectedItem(selectedItem) === 0) return "stop";
    });
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

    if (oldMesh !== "null" && player.inputInfo.getButtonState(InputButton.Sneak) === ButtonState.Pressed && selectedItem.item == null) {
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

function forEachSieveNeighbor(block: Block, includeCenter: boolean, visitor: (neighbor: Block) => void | "stop"): void {
    const radius = SIEVE_CONSTANTS.neighborRadius;
    const origin = block.location;

    for (let x = -radius; x <= radius; x++) {
        for (let z = -radius; z <= radius; z++) {
            if (!includeCenter && x === 0 && z === 0) continue;

            const targetBlock = block.dimension.getBlock({x: origin.x + x, y: origin.y, z: origin.z + z});
            if (!isSieveBlock(targetBlock)) continue;
            if (visitor(targetBlock) === "stop") return;
        }
    }
}

function getInputBlock(block: Block): Entity | undefined {
    return getTileEntity(block, SIEVE_TILE_ID);
}

function setInputBlock(sieve: Block, input: string): void {
    if (getInputBlock(sieve) !== undefined) return;

    const pos = sieve.location;
    sieve.dimension.spawnEntity(SIEVE_TILE_ID, {
        x: pos.x + SIEVE_CONSTANTS.inputEntityCenterOffset,
        y: pos.y + SIEVE_CONSTANTS.inputEntityHeightOffset,
        z: pos.z + SIEVE_CONSTANTS.inputEntityCenterOffset
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