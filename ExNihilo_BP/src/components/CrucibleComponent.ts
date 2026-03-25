import {
    Block,
    BlockComponentBlockBreakEvent,
    BlockComponentPlayerInteractEvent,
    BlockCustomComponent,
    EntityVariantComponent,
    Player
} from "@minecraft/server";
import {consumeSelectedItem, getSelectedItemContext, getTileEntity} from "../Utils";
import {CRUCIBLE_TILE_ID} from "../data/TileList";
import {CRUCIBLE_CONSTANTS, CrucibleInput, InputGravel, MeltableBlocks, VARIANT_STATE_MAP} from "../data/CrucibleData";

export class CrucibleComponent implements BlockCustomComponent {
    onPlayerInteract(e: BlockComponentPlayerInteractEvent): void {
        handleMeltable(e.block, e.player);
    }

    onBreak(e: BlockComponentBlockBreakEvent): void {
        getTileEntity(e.block, CRUCIBLE_TILE_ID)?.remove();
    }
}

function handleMeltable(block: Block, player: Player): void {
    const selectedItem = getSelectedItemContext(player);
    const canInsertMeltable = getInputBlock(block) === undefined || getInputBlock(block) === InputGravel;
    const fillAmount = MeltableBlocks[selectedItem.item?.typeId] ?? 0;
    if (!selectedItem.item || !canInsertMeltable || fillAmount === 0 || getFilling(block) === 100) return;

    setInputBlock(block, InputGravel);
    setFilling(block, getFilling(block) + 10);
    consumeSelectedItem(selectedItem);
}

function getInputBlock(crucible: Block): CrucibleInput | undefined {
    const tile = getTileEntity(crucible, CRUCIBLE_TILE_ID);
    if (!tile) return undefined;

    return VARIANT_STATE_MAP[tile.getComponent(EntityVariantComponent.componentId).value];
}

function setInputBlock(crucible: Block, input: CrucibleInput): void {
    if (getTileEntity(crucible, CRUCIBLE_TILE_ID) !== undefined) return;

    const pos = crucible.location;
    const tile = crucible.dimension.spawnEntity(CRUCIBLE_TILE_ID, {
        x: pos.x + CRUCIBLE_CONSTANTS.inputEntityCenterOffset,
        y: pos.y + CRUCIBLE_CONSTANTS.inputEntityHeightOffset,
        z: pos.z + CRUCIBLE_CONSTANTS.inputEntityCenterOffset
    }, {spawnEvent: input});
    tile.setDynamicProperty("filling", 0);
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
        y: Math.floor(pos.y) + CRUCIBLE_CONSTANTS.inputEntityHeightOffset + (filling / 100) * 0.75,
        z: pos.z,
    });
    tile.setDynamicProperty("filling", filling);
}