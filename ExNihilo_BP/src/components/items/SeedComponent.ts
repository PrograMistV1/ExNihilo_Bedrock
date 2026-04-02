import {
    CustomComponentParameters,
    Direction,
    GameMode,
    ItemComponentUseOnEvent,
    ItemCustomComponent,
    Player
} from "@minecraft/server";
import {consumeSelectedItem, getSelectedItemContext} from "../../Utils";

export class SeedComponent implements ItemCustomComponent {
    onUseOn(e: ItemComponentUseOnEvent, p: CustomComponentParameters): void {
        const canBePlantedOn = p.params["can_be_planted_on"] as string[];
        console.log(e.usedOnBlockPermutation.type.id)
        if (!canBePlantedOn.includes(e.usedOnBlockPermutation.type.id)) return;

        const allowedFaces = p.params["allowed_faces"] as Direction[] | undefined;
        if (allowedFaces && !allowedFaces.includes(e.blockFace)) return;

        const basePos = {x: e.block.x, y: e.block.y, z: e.block.z};
        const offsets: Record<Direction, typeof basePos> = {
            [Direction.Down]: {...basePos, y: basePos.y - 1},
            [Direction.East]: {...basePos, x: basePos.x + 1},
            [Direction.North]: {...basePos, z: basePos.z + 1},
            [Direction.South]: {...basePos, z: basePos.z - 1},
            [Direction.Up]: {...basePos, y: basePos.y + 1},
            [Direction.West]: {...basePos, x: basePos.x - 1},
        };

        const offset = allowedFaces ? offsets[e.blockFace] : basePos;
        e.block.dimension.setBlockType(offset, p.params["block"] as string);

        if (!e.source.matches({gameMode: GameMode.Creative})) {
            consumeSelectedItem(getSelectedItemContext(e.source as Player));
        }
    }
}