import {
	APIActionRowComponent,
	APIMessageActionRowComponent,
	ActionRowBuilder,
	AnyComponentBuilder,
	ButtonBuilder,
	ButtonStyle,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} from 'discord.js';

const confirm = new ButtonBuilder().setCustomId('confirm').setLabel('Yes').setStyle(ButtonStyle.Success);
const cancel = new ButtonBuilder().setCustomId('cancel').setLabel('No').setStyle(ButtonStyle.Danger);

const previous = new ButtonBuilder().setCustomId('prev').setEmoji('⬅️').setStyle(ButtonStyle.Primary);
const next = new ButtonBuilder().setCustomId('next').setEmoji('➡️').setStyle(ButtonStyle.Primary);

/**
 * Gets the ActionRow component ready for use in a interaction or message
 *
 * @param {AnyComponentBuilder[]} components - The Array of component builder
 * @returns {APIActionRowComponent<APIMessageActionRowComponent>} - Returns the APIActionRowComponent
 */
function getActionRow(components: AnyComponentBuilder[]): APIActionRowComponent<APIMessageActionRowComponent> {
	const actionRow = new ActionRowBuilder().setComponents(components);
	return actionRow.toJSON() as APIActionRowComponent<APIMessageActionRowComponent>;
}

/**
 * Returns confirmation components [Yes/No] to be used in a discord ActionRow
 *
 * @returns {ButtonBuilder[]}
 */
function confirm_components(): ButtonBuilder[] {
	return [confirm, cancel];
}

/**
 * Returns page components [Previous/Next] to be used in a discord ActionRow
 *
 * @returns {ButtonBuilder[]}
 */
function page_components(): ButtonBuilder[] {
	return [previous, next];
}

/**
 * Creates a select menu with the given array of strings
 *
 * @param array - Array of strings to build the select menu from
 * @returns {StringSelectMenuBuilder} - Returns the StringSelectMenuBuilder
 */
function select_components(array: string[]): StringSelectMenuBuilder {
	const select = new StringSelectMenuBuilder()
		.setCustomId('select')
		.setPlaceholder('Select an option')
		.addOptions(array.map((option) => new StringSelectMenuOptionBuilder().setLabel(option).setValue(option)));

	return select;
}

export { getActionRow, confirm_components, page_components, select_components };
