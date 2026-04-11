import {
    Block,
    BlockComponentBlockBreakEvent,
    BlockComponentPlayerBreakEvent,
    BlockComponentPlayerInteractEvent,
    BlockComponentTickEvent,
    BlockCustomComponent,
    Entity,
    GameMode,
    ItemStack,
    Player
} from "@minecraft/server";
import {applyLavaEffects, consumeItem, getSelectedItemContext} from "../../utils/Utils";
import {CRUCIBLE_TIMINGS, HeatRate, MeltableBlocks} from "../../data/CrucibleData";
import {addProgressChecker} from "../../utils/ProgressRegistry";
import {
    BlockInput,
    FilledTileEntityBlock,
    InputDefault,
    InputGravel,
    InputLava,
    TileContext
} from "./tiles/FilledTileEntityBlock";

export class CrucibleComponent extends FilledTileEntityBlock implements BlockCustomComponent {
    static readonly TILE_ID: string = "exnihilo:crucible_tile";
    static readonly VARIANT_STATE_MAP: Record<number, BlockInput> = {
        0: "exnihilo:default",
        1: "exnihilo:gravel",
        2: "exnihilo:lava"
    };

    constructor() {
        super(CrucibleComponent.TILE_ID, CrucibleComponent.VARIANT_STATE_MAP);
        addProgressChecker("exnihilo:crucible", (block: Block) => {
            const input = this.getInputBlock(block);
            const filling = this.getFilling(block);
            if (input === InputLava) {
                return {translate: "gui.done"};
            } else if (filling === 100) {
                return Math.floor(this.getTimer(block) / CRUCIBLE_TIMINGS.meltingUpdates * 100) + "%";
            } else {
                return parseFloat(filling.toFixed(1)).toString() + "/100"
            }
        });
    }

    onPlayerInteract = (e: BlockComponentPlayerInteractEvent) => {
        const ctx = this.getTileContext(e.block);
        this.handleMeltable(e.block, e.player, ctx);
        this.handleExtractLava(e.block, e.player, ctx);
    };

    onBreak = (e: BlockComponentBlockBreakEvent) => {
        this.getTileEntity(e.block)?.remove();
    };

    onTick = (e: BlockComponentTickEvent) => {
        const ctx = this.getTileContext(e.block);
        this.handleMeltingTick(e.block, ctx);
        this.handleLavaEntities(e.block, ctx);
    };

    onPlayerBreak = (e: BlockComponentPlayerBreakEvent) => {
        const selectedItem = getSelectedItemContext(e.player);
        if (!selectedItem.item) return;

        if (selectedItem.item.hasTag("minecraft:is_pickaxe")) {
            e.dimension.spawnItem(new ItemStack(e.brokenBlockPermutation.type.id), e.block.center());
        }
    };

    protected yResolver(filling: number): number {
        return 3 / 16 + filling / 100 * 0.75;
    }

    private handleMeltable(block: Block, player: Player, ctx: TileContext): void {
        const selectedItem = getSelectedItemContext(player);
        const canInsertMeltable = ctx.input === InputDefault || ctx.input === InputGravel;
        const fillAmount = MeltableBlocks[selectedItem.item?.typeId] ?? 0;
        if (!selectedItem.item || !canInsertMeltable || fillAmount === 0 || ctx.filling === 100) return;

        this.setInputBlock(block, InputGravel);
        this.setFilling(block, ctx.filling + fillAmount);
        consumeItem(selectedItem);
    }

    private handleExtractLava(block: Block, player: Player, ctx: TileContext): void {
        const selectedItem = getSelectedItemContext(player);
        if (!selectedItem.item
            || selectedItem.item.typeId !== "minecraft:bucket"
            || ctx.input !== InputLava
            || ctx.filling !== 100) return;

        this.setInputBlock(block, InputDefault);
        block.dimension.playSound("bucket.fill_lava", block);

        if (player.getGameMode() === GameMode.Creative) return;
        if (consumeItem(selectedItem) === 0) {
            selectedItem.container.setItem(selectedItem.slot, new ItemStack("minecraft:lava_bucket", 1));
        } else {
            const stackToDrop = selectedItem.container.addItem(new ItemStack("minecraft:lava_bucket", 1));
            if (!stackToDrop) return;
            player.dimension.spawnItem(stackToDrop, player.location);
            player.dimension.playSound("random.pop", player.location);
        }
    }

    private handleMeltingTick(block: Block, ctx: TileContext): void {
        if (ctx.input !== InputGravel || ctx.filling !== 100) return;

        const heatRate = HeatRate[block.below()?.typeId] ?? 0;
        if (heatRate === 0) return;

        if (this.incrementTimer(block, heatRate) > CRUCIBLE_TIMINGS.meltingUpdates) {
            this.setInputBlock(block, InputLava);
            this.resetTimer(block);
        }
    }

    private handleLavaEntities(block: Block, ctx: TileContext): void {
        if (ctx.input !== InputLava) return;

        this.getContainedEntities(block).forEach((entity: Entity) => {
            applyLavaEffects(entity);
        });
    }
}