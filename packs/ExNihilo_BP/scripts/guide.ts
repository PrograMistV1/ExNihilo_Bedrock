import {render} from '@bedrock-core/ui';
import {createGuide} from '@bedrock-core/guides';
import {createI18n} from '@bedrock-core/ui/i18n';

import guides from '@bedrock-core/generated/guides';
import i18n from '@bedrock-core/generated/i18n';
import {Player} from "@minecraft/server";

createI18n(i18n);

const Guide = createGuide(guides, {
    title: 'Guide'
});

export function openGuide(player: Player) {
    render(Guide, player);
}