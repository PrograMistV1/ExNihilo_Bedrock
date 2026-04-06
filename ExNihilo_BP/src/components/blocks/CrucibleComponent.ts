import {
    Block,
    BlockComponentBlockBreakEvent,
    BlockComponentPlayerBreakEvent,
    BlockComponentPlayerInteractEvent,
    BlockComponentTickEvent,
    BlockCustomComponent,
    Entity,
    ItemStack,
    Player,
    VanillaEntityIdentifier
} from "@minecraft/server";
import {applyLavaEffects, consumeSelectedItem, getSelectedItemContext, getTileEntity} from "../../utils/Utils";
import {
    CRUCIBLE_CONSTANTS,
    CrucibleInput,
    HeatRate,
    InputDefault,
    InputGravel,
    InputLava,
    MeltableBlocks
} from "../../data/CrucibleData";
import {BlockStateSuperset} from "@minecraft/vanilla-data";
import {addProgressChecker} from "../../utils/ProgressRegistry";
import {TileEntityBlock} from "../../utils/TileEntityBlock";

interface TileContext {
    tile: Entity | undefined;
    filling: number;
    input: CrucibleInput;
}

export class CrucibleComponent extends TileEntityBlock implements BlockCustomComponent {
    static readonly TILE_ID: string = "exnihilo:crucible_tile";
    static readonly VARIANT_STATE_MAP: Record<number, CrucibleInput> = {
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
                return Math.floor(this.getTimer(block) / CRUCIBLE_CONSTANTS.MELTING_TIME_TICKS * 100) + "%";
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
        getTileEntity(e.block, this.tileId)?.remove();
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

    private yResolver(filling: number): number {
        return 3 / 16 + filling / 100 * 0.75;
    }

    private getTileContext(block: Block): TileContext {
        const tile = getTileEntity(block, this.tileId);

        return {
            tile,
            filling: this.getFilling(block),
            input: this.getInputBlock(block) as CrucibleInput
        };
    }

    private handleMeltable(block: Block, player: Player, ctx: TileContext): void {
        const selectedItem = getSelectedItemContext(player);
        const canInsertMeltable = ctx.input === InputDefault || ctx.input === InputGravel;
        const fillAmount = MeltableBlocks[selectedItem.item?.typeId] ?? 0;
        if (!selectedItem.item || !canInsertMeltable || fillAmount === 0 || ctx.filling === 100) return;

        this.setInputBlock(block, InputGravel);
        this.setFilling(block, ctx.filling + fillAmount, this.yResolver);
        consumeSelectedItem(selectedItem);
    }

    private handleExtractLava(block: Block, player: Player, ctx: TileContext): void {
        const selectedItem = getSelectedItemContext(player);
        if (!selectedItem.item
            || selectedItem.item.typeId !== "minecraft:bucket"
            || ctx.input !== InputLava
            || ctx.filling !== 100) return;

        this.setInputBlock(block, InputDefault);
        if (selectedItem.item.amount === 1) {
            selectedItem.container.setItem(selectedItem.slot, new ItemStack("minecraft:lava_bucket", 1));
        } else {
            consumeSelectedItem(selectedItem);
            if (selectedItem.container.emptySlotsCount > 0) {
                selectedItem.container.addItem(new ItemStack("minecraft:lava_bucket", 1));
            } else {
                player.dimension.spawnItem(new ItemStack("minecraft:lava_bucket", 1), player.location);
                player.dimension.playSound("random.pop", player.location);
            }
        }
        block.dimension.playSound("bucket.fill_lava", block);
    }

    private handleMeltingTick(block: Block, ctx: TileContext): void {
        if (ctx.input !== InputGravel || ctx.filling !== 100) return;

        const heatRate = HeatRate[block.below()?.typeId] ?? 0;
        if (heatRate === 0) return;

        if (this.incrementTimer(block, heatRate) > CRUCIBLE_CONSTANTS.MELTING_TIME_TICKS) {
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

    private setInputBlock(block: Block, input: CrucibleInput): void {
        const isLava = input === InputLava;
        const isDefault = input === InputDefault;

        block.setPermutation(block.permutation.withState('exnihilo:emit_light' as keyof BlockStateSuperset, isLava));

        const tile = getTileEntity(block, this.tileId);
        if (tile) {
            isDefault ? tile.remove() : tile.triggerEvent(input);
            return;
        }
        if (!isDefault) {
            const newTile = block.dimension.spawnEntity(
                this.tileId as keyof VanillaEntityIdentifier,
                {...block.bottomCenter(), y: block.y + this.yResolver(0)},
                {spawnEvent: input}
            );
            newTile.setDynamicProperty("filling", 0);
            newTile.setDynamicProperty("timer", 0);
        }
    }
}