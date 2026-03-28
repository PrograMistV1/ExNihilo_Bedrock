import {
    Block,
    BlockInventoryComponent,
    Dimension,
    EntityComponentTypes,
    EntityItemComponent,
    GameMode,
    ItemComponentMineBlockEvent,
    ItemCustomComponent,
    ItemStack,
    Player,
    Vector3
} from "@minecraft/server";
import {damageSelectedItem, getSelectedItemContext} from "../../Utils";
import {HAMMERABLE_BLOCKS_MAP} from "../../data/HammerData";

export class HammerComponent implements ItemCustomComponent {
    onMineBlock(e: ItemComponentMineBlockEvent): void {
        if (!(e.source instanceof Player) || e.source.matches({gameMode: GameMode.Creative})) return;

        const player = e.source;
        const dim = e.block.dimension;
        const block = e.block;
        const blockTypeId = e.minedBlockPermutation.type.id;
        const result = HAMMERABLE_BLOCKS_MAP.get(blockTypeId);

        if (!result) return;

        damageSelectedItem(getSelectedItemContext(player), player);

        const loc = {x: block.x + 0.5, y: block.y + 0.5, z: block.z + 0.5};

        //This is supposed to replace the block’s drop. It works a bit wonky, but it’s better than nothing.
        if (handleItemEntity(dim, block, blockTypeId, result, loc)) return;
        handleHopper(dim, block, blockTypeId, result, loc);
    }
}

function handleItemEntity(dim: Dimension, block: Block, blockTypeId: string, result: string, loc: Vector3) {
    for (const entity of dim.getEntitiesAtBlockLocation(block)) {
        if (!entity.matches({type: EntityComponentTypes.Item})) continue;

        const item = entity.getComponent(EntityItemComponent.componentId).itemStack;
        if (item.typeId !== blockTypeId) continue;

        entity.remove();
        dim.spawnItem(new ItemStack(result, 1), loc);
        return true;
    }
    return false;
}

function handleHopper(dim: Dimension, block: Block, blockTypeId: string, result: string, loc: Vector3) {
    const below = dim.getBlock({x: block.x, y: block.y - 1, z: block.z});
    if (!below || below.typeId !== "minecraft:hopper") return;

    const container = below.getComponent(BlockInventoryComponent.componentId)?.container;
    if (!container) return;

    const slot = container.find(new ItemStack(blockTypeId));
    if (!slot) return;

    const item = container.getItem(slot);
    const newAmount = item.amount - 1;

    if (newAmount > 0) {
        container.setItem(slot, new ItemStack(blockTypeId, newAmount));
    } else {
        container.setItem(slot, null);
    }

    if (container.emptySlotsCount > 0) {
        container.addItem(new ItemStack(result, 1));
    } else {
        dim.spawnItem(new ItemStack(result, 1), loc);
    }
}