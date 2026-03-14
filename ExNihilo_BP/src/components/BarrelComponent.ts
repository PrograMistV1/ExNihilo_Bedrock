import {
    BlockCustomComponent,
    BlockComponentStepOnEvent,
    CustomComponentParameters,
    world
} from "@minecraft/server";

export class BarrelComponent implements BlockCustomComponent {
    onStepOn(e: BlockComponentStepOnEvent, p: CustomComponentParameters): void {
        world.sendMessage("Hello World");
    }
}
