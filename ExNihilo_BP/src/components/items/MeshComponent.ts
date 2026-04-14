import {
    CustomComponentParameters,
    GameMode,
    ItemComponentUseOnEvent,
    ItemCustomComponent,
    Player,
    system
} from "@minecraft/server";
import {BlockStateSuperset} from "@minecraft/vanilla-data";
import {consumeItem, getSelectedItemContext} from "../../utils/Utils";
import {SIEVE_CONSTANTS} from "../../data/SieveData";

export class MeshComponent implements ItemCustomComponent {
    onUseOn(e: ItemComponentUseOnEvent, p: CustomComponentParameters): void {
        if (!e.block.hasComponent("exnihilo:sieve") || !(e.source instanceof Player)) return;
        if (!e.source.matches({gameMode: GameMode.Creative})) {
            const lastInteractTick = (e.source.getDynamicProperty("lastSieveInteract") as number | undefined) ?? 0;
            if (system.currentTick - lastInteractTick < SIEVE_CONSTANTS.interactCooldownTicks) return;
        }

        if (e.block.permutation.getState("exnihilo:mesh" as keyof BlockStateSuperset) !== "null") return;
        e.block.setPermutation(e.block.permutation.withState("exnihilo:mesh" as keyof BlockStateSuperset, p.params["type"]));
        e.source.dimension.playSound(p.params["sound"], e.block.center());
        consumeItem(getSelectedItemContext(e.source))
        e.source.setDynamicProperty("lastSieveInteract", system.currentTick);
    }
}