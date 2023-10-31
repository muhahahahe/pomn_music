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

const back = new ButtonBuilder().setCustomId('back').setEmoji('🔙').setStyle(ButtonStyle.Primary);

const add = new ButtonBuilder().setCustomId('add').setLabel('➕').setStyle(ButtonStyle.Success);

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
 * Returns back component [Back] to be used in a discord ActionRow
 *
 * @returns {ButtonBuilder[]}
 */
function back_component(): ButtonBuilder[] {
	return [back];
}

/**
 * Returns add component [Add] to be used in a discord ActionRow
 *
 * @returns {ButtonBuilder[]}
 */
function add_component(): ButtonBuilder[] {
	return [add];
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

/**
 * Creates a select menu for the given playlist name array.
 *
 * @param array - Array of strings to build the select menu from
 * @returns {StringSelectMenuBuilder} - Returns the StringSelectMenuBuilder
 */
function selectplaylist_components(array: string[]): StringSelectMenuBuilder {
	const select = new StringSelectMenuBuilder()
		.setCustomId('playlist')
		.setPlaceholder('Select a Playlist')
		.addOptions(array.map((option, i) => new StringSelectMenuOptionBuilder().setLabel(option.substring(0, 100)).setValue(i.toString())));

	return select;
}

/**
 * Creates a select menu for the given tracks in a playlist.
 *
 * @param array - Array of strings to build the select menu from.
 * @returns {StringSelectMenuBuilder} - Returns the StringSelectMenuBuilder.
 */
function removetrack_components(array: string[]): StringSelectMenuBuilder {
	const select = new StringSelectMenuBuilder()
		.setCustomId('remove')
		.setPlaceholder('Remove a Track')
		.addOptions(array.map((option, i) => new StringSelectMenuOptionBuilder().setLabel(option.substring(0, 100)).setValue(i.toString())));

	return select;
}

export {
	getActionRow,
	confirm_components,
	page_components,
	back_component,
	add_component,
	select_components,
	selectplaylist_components,
	removetrack_components,
};
