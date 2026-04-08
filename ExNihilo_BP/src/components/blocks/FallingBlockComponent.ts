import {
    BlockComponentPlayerInteractEvent,
    BlockComponentPlayerPlaceBeforeEvent,
    BlockCustomComponent,
    EquipmentSlot,
    GameMode
} from "@minecraft/server";
import {isWater, resolvePowderPermutation} from "../../utils/FallingBlockUtils";
import {FallingBlocks} from "../../utils/FallingBlocks";
import {FALLING_BLOCK_LAYER_STATE} from "utils/FallingBlocksManager";
import {BlockStateSuperset} from "@minecraft/vanilla-data";

export class FallingBlockComponent implements BlockCustomComponent {
    beforeOnPlayerPlace(e: BlockComponentPlayerPlaceBeforeEvent) {
        if (!isWater(e.block)) return;
        const blockId = e.permutationToPlace.type.id;
        e.permutationToPlace = resolvePowderPermutation(blockId, FallingBlocks[blockId]?.config?.solidBlock, true);
    }

    onPlayerInteract(e: BlockComponentPlayerInteractEvent) {
        if (!e.player) return;
        const equippable = e.player.getComponent('equippable');
        const item = equippable.getEquipment(EquipmentSlot.Mainhand);
        if (item?.typeId !== e.block.typeId) return;

        const currentLayers = e.block.permutation.getState(FALLING_BLOCK_LAYER_STATE) as number;
        e.block.setPermutation(e.block.permutation.withState(
            FALLING_BLOCK_LAYER_STATE as keyof BlockStateSuperset,
            currentLayers + 1
        ));

        if (e.player.getGameMode() === GameMode.Creative) return;
        if (item.amount <= 1) equippable.setEquipment(EquipmentSlot.Mainhand, null);
        else {
            item.amount--;
            equippable.setEquipment(EquipmentSlot.Mainhand, item);
        }
    }
}