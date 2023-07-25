import { ButtonBuilder, ButtonStyle } from 'discord.js';

const confirm = new ButtonBuilder()
	.setCustomId('confirm')
	.setLabel('Yes')
	.setStyle(ButtonStyle.Success);

const cancel = new ButtonBuilder()
	.setCustomId('cancel')
	.setLabel('No')
	.setStyle(ButtonStyle.Danger);

/**
 * Returns confirmation components [Yes/No] to be used in a discord ActionRow
 * @returns ButtonBuilder[]
 */
function confirm_components(): ButtonBuilder[] {
	return [confirm, cancel];
}

export { confirm_components };
