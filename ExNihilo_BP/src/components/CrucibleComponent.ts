import {
    Block,
    BlockComponentBlockBreakEvent,
    BlockComponentPlayerInteractEvent,
    BlockComponentTickEvent,
    BlockCustomComponent,
    EntityVariantComponent,
    ItemStack,
    Player
} from "@minecraft/server";
import {consumeSelectedItem, getSelectedItemContext, getTileEntity} from "../Utils";
import {CRUCIBLE_TILE_ID} from "../data/TileList";
import {
    CRUCIBLE_CONSTANTS,
    CrucibleInput,
    HeatRate,
    InputDefault,
    InputGravel,
    InputLava,
    MeltableBlocks,
    VARIANT_STATE_MAP
} from "../data/CrucibleData";

export class CrucibleComponent implements BlockCustomComponent {
    onPlayerInteract(e: BlockComponentPlayerInteractEvent): void {
        handleMeltable(e.block, e.player);
        handleExtractLava(e.block, e.player);
    }

    onBreak(e: BlockComponentBlockBreakEvent): void {
        getTileEntity(e.block, CRUCIBLE_TILE_ID)?.remove();
    }

    onTick(e: BlockComponentTickEvent): void {
        handleMeltingTick(e.block);
    }
}

function handleMeltingTick(block: Block): void {
    const input = getInputBlock(block);
    const filling = getFilling(block);
    if (input !== InputGravel || filling !== 100) return;

    const heatRate = HeatRate[block.dimension.getBlock({x: block.x, y: block.y - 1, z: block.z}).typeId] ?? 0;
    if (heatRate === 0) return;

    if (incrementTimer(block, heatRate) > CRUCIBLE_CONSTANTS.MELTING_TIME_TICKS) {
        setInputBlock(block, InputLava);
        resetTimer(block);
    }
}

function handleMeltable(block: Block, player: Player): void {
    const selectedItem = getSelectedItemContext(player);
    const canInsertMeltable = getInputBlock(block) === InputDefault || getInputBlock(block) === InputGravel;
    const fillAmount = MeltableBlocks[selectedItem.item?.typeId] ?? 0;
    if (!selectedItem.item || !canInsertMeltable || fillAmount === 0 || getFilling(block) === 100) return;

    setInputBlock(block, InputGravel);
    setFilling(block, getFilling(block) + 10);
    consumeSelectedItem(selectedItem);
}

function handleExtractLava(block: Block, player: Player): void {
    const selectedItem = getSelectedItemContext(player);
    if (!selectedItem.item
        || selectedItem.item.typeId !== "minecraft:bucket"
        || getInputBlock(block) !== InputLava
        || getFilling(block) !== 100) return;

    setInputBlock(block, InputDefault);
    selectedItem.container.setItem(selectedItem.slot, new ItemStack("minecraft:lava_bucket", 1));
    block.dimension.playSound("bucket.fill_lava", block);
}

function getInputBlock(crucible: Block): CrucibleInput {
    const tile = getTileEntity(crucible, CRUCIBLE_TILE_ID);
    if (!tile) return InputDefault;

    return VARIANT_STATE_MAP[tile.getComponent(EntityVariantComponent.componentId).value];
}

function setInputBlock(block: Block, input: CrucibleInput): void {
    let tile = getTileEntity(block, CRUCIBLE_TILE_ID);
    if (tile !== undefined) {
        if (input === InputDefault) {
            tile.remove();
            return;
        }
        tile.triggerEvent(input);
    } else {
        tile = block.dimension.spawnEntity(CRUCIBLE_TILE_ID, {
            x: block.x + CRUCIBLE_CONSTANTS.CENTER_OFFSET,
            y: block.y + CRUCIBLE_CONSTANTS.HEIGHT_OFFSET,
            z: block.z + CRUCIBLE_CONSTANTS.CENTER_OFFSET
        }, {spawnEvent: input});
        tile.setDynamicProperty("filling", 0);
        tile.setDynamicProperty("timer", 0);
    }
}

function getFilling(crucible: Block): number {
    const tile = getTileEntity(crucible, CRUCIBLE_TILE_ID);
    if (!tile) return 0;

    return tile.getDynamicProperty("filling") as number ?? 0;
}

function setFilling(crucible: Block, filling: number): void {
    const tile = getTileEntity(crucible, CRUCIBLE_TILE_ID);
    if (!tile) return;

    filling = Math.max(Math.min(filling, 100), 0);
    const pos = tile.location;
    tile.teleport({
        x: pos.x,
        y: Math.floor(pos.y) + CRUCIBLE_CONSTANTS.HEIGHT_OFFSET + (filling / 100) * 0.75,
        z: pos.z,
    });
    tile.setDynamicProperty("filling", filling);
}

function incrementTimer(block: Block, amount: number): number {
    const tile = getTileEntity(block, CRUCIBLE_TILE_ID);
    if (!tile) return;

    const currTime = tile.getDynamicProperty("timer") as number;
    const newTime = currTime + amount;
    tile.setDynamicProperty("timer", newTime);
    return newTime;
}

function resetTimer(block: Block): void {
    const tile = getTileEntity(block, CRUCIBLE_TILE_ID);
    if (!tile) return;

    tile.setDynamicProperty("timer", 0);
}