import {GameMode, ItemComponentMineBlockEvent, ItemCustomComponent, ItemStack, Player} from "@minecraft/server";
import {DROP_CHANCES, INFESTED_LEAVES, LEAVES} from "../../data/InfestedLeavesData";
import {damageSelectedItem, getSelectedItemContext} from "../../Utils";
import {INFESTED_STATE} from "../blocks/InfestedLeavesComponent";

export class CrookComponent implements ItemCustomComponent {
    onMineBlock(e: ItemComponentMineBlockEvent): void {
        if (e.source.matches({gameMode: GameMode.Creative}) || !(e.source instanceof Player)) return;
        damageSelectedItem(getSelectedItemContext(e.source), e.source);

        const perm = e.minedBlockPermutation;
        if (LEAVES.includes(perm.type.id) && Math.random() <= DROP_CHANCES.SILKWORM_FROM_LEAVES) {
            e.block.dimension.spawnItem(new ItemStack("exnihilo:silkworm"), e.block);
            return;
        }
        if (INFESTED_LEAVES.includes(perm.type.id) && perm.getState(INFESTED_STATE)) {
            if (Math.random() <= DROP_CHANCES.SILKWORM_FROM_INFESTED_LEAVES) {
                e.block.dimension.spawnItem(new ItemStack("exnihilo:silkworm"), e.block);
            }
            if (Math.random() <= DROP_CHANCES.STRING_FROM_INFESTED_LEAVES) {
                e.block.dimension.spawnItem(new ItemStack("minecraft:string"), e.block);
            }
        }
    }
}