import { APIActionRowComponent, APITextInputComponent, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

/**
 * Gets the ActionRow component ready for use in a modal.
 *
 * @param {TextInputBuilder} textInput - The TextInputBuilder to use in the ActionRow.
 * @returns {APIActionRowComponent<APITextInputComponent>} - The ActionRow with the TextInputBuilder.
 */
function getActionRowTextInput(textInput: TextInputBuilder): APIActionRowComponent<APITextInputComponent> {
	const actionRow = new ActionRowBuilder().addComponents(textInput);
	return actionRow.toJSON() as APIActionRowComponent<APITextInputComponent>;
}

/**
 * Creates a ModalBuilder for adding a character to the initiative list.
 *
 * @param lang - The LanguageData to use for the modal.
 * @returns {ModalBuilder}.
 */
function createAddTrackModal(): ModalBuilder {
	const modal = new ModalBuilder().setCustomId('add').setTitle('Add Track');

	const url = new TextInputBuilder().setCustomId('url').setLabel('URL').setStyle(TextInputStyle.Short).setRequired(true);

	modal.addComponents(getActionRowTextInput(url));

	return modal;
}

export { createAddTrackModal };
