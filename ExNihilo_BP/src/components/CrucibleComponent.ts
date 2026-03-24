import {
    Block,
    BlockComponentBlockBreakEvent,
    BlockComponentPlayerInteractEvent,
    BlockCustomComponent,
    EntityVariantComponent
} from "@minecraft/server";
import {getTileEntity} from "../Utils";
import {CRUCIBLE_TILE_ID} from "../data/TileList";
import {CRUCIBLE_CONSTANTS, CrucibleInput, InputGravel, VARIANT_STATE_MAP} from "../data/CrucibleData";

export class CrucibleComponent implements BlockCustomComponent {
    onPlayerInteract(e: BlockComponentPlayerInteractEvent): void {
        setInputBlock(e.block, InputGravel);
    }

    onBreak(e: BlockComponentBlockBreakEvent): void {
        getTileEntity(e.block, CRUCIBLE_TILE_ID)?.remove();
    }
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

    return tile.getDynamicProperty("filling") as number;
}