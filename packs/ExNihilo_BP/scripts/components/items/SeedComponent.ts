import {
    CustomComponentParameters,
    Direction,
    GameMode,
    ItemComponentUseOnEvent,
    ItemCustomComponent,
    Player,
    Vector3
} from "@minecraft/server";
import {consumeItem, getSelectedItemContext} from "../../utils/Utils";

type SeedParams = {
    can_be_planted_on?: string[];
    allowed_faces?: Direction[];
    block: string;
    conditions?: {
        emptyAround?: boolean;
        nearWater?: boolean;
        inWater?: boolean;
    };
};

/**
 * SeedComponent — a custom component for seeds.
 *
 * Allows planting blocks (for example, crops or cacti) on specific surfaces
 * with optional conditions.
 *
 * Supported parameters in JSON:
 *
 * - can_be_planted_on?: string[] — an array of block IDs where the seed can be planted.
 * - allowed_faces?: Direction[] — an array of allowed directions to plant (["Up", "Down", "East", "North", "South", "West"]).
 *     - If not specified, the seed will replace the target block.
 * - block: string — the ID of the block that will be placed when using the seed.
 * - conditions?: { emptyAround?: boolean; nearWater?: boolean; inWater?: boolean }
 *     - emptyAround: true — no other blocks should be around the selected block.
 *     - nearWater: true — there must be a water source nearby (horizontally).
 *     - inWater: true — planting must occur in water.
 *
 * Example usage in JSON:
 *
 * "exnihilo:seed": {
 *     "can_be_planted_on": ["minecraft:sand"],
 *     "allowed_faces": ["Up"],
 *     "block": "example:cactus",
 *     "conditions": {
 *         "emptyAround": true,
 *         "nearWater": true,
 *         "inWater": false
 *     }
 * }
 *
 * In this example, seeds can be planted on sand only upwards,
 * there should be no blocks around the selected block, water must be nearby,
 * but the block itself does not need to be in water.
 *
 * Note:
 * All conditions are optional — if the conditions field is missing, planting
 * will occur without additional checks.
 */
export class SeedComponent implements ItemCustomComponent {
    onUseOn = (e: ItemComponentUseOnEvent, p: CustomComponentParameters): void => {
        const params = p.params as SeedParams;

        const canBePlantedOn = params.can_be_planted_on;
        if (canBePlantedOn && !canBePlantedOn.includes(e.usedOnBlockPermutation.type.id)) return;

        const allowedFaces = params.allowed_faces;
        if (allowedFaces && !allowedFaces.includes(e.blockFace)) return;

        const conditions = params.conditions;

        const basePos = {x: e.block.x, y: e.block.y, z: e.block.z};
        const dimension = e.block.dimension;
        const offsets: Record<Direction, typeof basePos> = {
            [Direction.Down]: {...basePos, y: basePos.y - 1},
            [Direction.East]: {...basePos, x: basePos.x + 1},
            [Direction.North]: {...basePos, z: basePos.z + 1},
            [Direction.South]: {...basePos, z: basePos.z - 1},
            [Direction.Up]: {...basePos, y: basePos.y + 1},
            [Direction.West]: {...basePos, x: basePos.x - 1},
        };
        const offset = allowedFaces ? offsets[e.blockFace] : basePos;

        if (conditions?.emptyAround && !this.isEmptyAround(dimension, offset)) return;
        if (conditions?.nearWater && !this.isNearWater(dimension, basePos)) return;
        if (conditions?.inWater && !this.isInWater(dimension, offset)) return;

        dimension.setBlockType(offset, params.block);

        if (!e.source.matches({gameMode: GameMode.Creative})) {
            const itemCtx = getSelectedItemContext(e.source as Player);
            if (itemCtx) consumeItem(itemCtx);
        }
    }

    private isEmptyAround(dimension: any, pos: Vector3): boolean {
        const offsets = [
            {x: 1, y: 0, z: 0}, {x: -1, y: 0, z: 0},
            {x: 0, y: 0, z: 1}, {x: 0, y: 0, z: -1},
            {x: 0, y: 1, z: 0}
        ];
        return offsets.every(off => dimension.getBlock({
            x: pos.x + off.x, y: pos.y + off.y, z: pos.z + off.z
        }).isAir);
    }

    private isNearWater(dimension: any, pos: Vector3): boolean {
        const offsets = [
            {x: 1, y: 0, z: 0}, {x: -1, y: 0, z: 0},
            {x: 0, y: 0, z: 1}, {x: 0, y: 0, z: -1},
        ];
        return offsets.some(off => dimension.getBlock({
            x: pos.x + off.x, y: pos.y + off.y, z: pos.z + off.z
        }).type.id === "minecraft:water");
    }

    private isInWater(dimension: any, pos: Vector3): boolean {
        return dimension.getBlock(pos).type.id === "minecraft:water";
    }
}