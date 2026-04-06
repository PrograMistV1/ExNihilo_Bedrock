import {ItemComponentUseOnEvent, ItemCustomComponent, Player} from "@minecraft/server";
import {LEAVES_TO_INFESTED_MAP} from "../../data/InfestedLeavesData";
import {consumeItem, getSelectedItemContext} from "../../utils/Utils";

export class SilkwormComponent implements ItemCustomComponent {
    onUseOn(e: ItemComponentUseOnEvent): void {
        if (LEAVES_TO_INFESTED_MAP[e.usedOnBlockPermutation.type.id]) {
            e.block.setType(LEAVES_TO_INFESTED_MAP[e.usedOnBlockPermutation.type.id]);
            consumeItem(getSelectedItemContext(e.source as Player));
        }
    }
}