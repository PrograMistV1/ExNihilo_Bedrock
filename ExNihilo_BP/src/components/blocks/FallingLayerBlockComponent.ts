import {BlockComponentPlayerInteractEvent, CustomComponentParameters, GameMode} from "@minecraft/server";
import {FALLING_BLOCK_LAYER_STATE} from "utils/FallingBlocksManager";
import {BlockStateSuperset} from "@minecraft/vanilla-data";
import {FallingBlockComponent} from "./FallingBlockComponent";
import {consumeItem, getItemContext} from "../../utils/Utils";

export class FallingLayerBlockComponent extends FallingBlockComponent {

    onPlayerInteract = (e: BlockComponentPlayerInteractEvent, param: CustomComponentParameters): void => {
        if (!e.player || !param.params["solidBlock"]) return;
        const itemCtx = getItemContext(e.player, e.player.selectedSlotIndex);
        if (itemCtx?.item.typeId !== e.block.typeId) return;

        const currentLayers = e.block.permutation.getState(FALLING_BLOCK_LAYER_STATE) as number | undefined;
        if (!currentLayers) return;
        e.block.setPermutation(e.block.permutation.withState(
            FALLING_BLOCK_LAYER_STATE as keyof BlockStateSuperset,
            currentLayers + 1
        ));

        if (e.player.getGameMode() === GameMode.Creative) return;
        consumeItem(itemCtx);
    };
}