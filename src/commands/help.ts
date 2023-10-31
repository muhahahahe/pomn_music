import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import Main from '../classes/Main';
import HelpEmbedHandler from '../classes/HelpEmbedHandler';

const commands = ['Music Player', 'Pause', 'Play', 'Playlist', 'Queue', 'Repeat', 'Skip', 'Stop', 'Volume', 'Setup'];
export default {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Shows an overview of all commands, what they do, and how to use them.')
		.addStringOption((option) =>
			option
				.setName('command')
				.setDescription('Command to get help on')
				.setRequired(false)
				.addChoices(
					...commands.map((c) => {
						return { name: c, value: c };
					})
				)
		)
		.setDMPermission(true),
	help: {
		name: 'Help',
		description: '',
		arguments: '',
		usage: '',
	},
	execute: async (interaction: ChatInputCommandInteraction, main: Main) => {
		const command = interaction.options.getString('command') || undefined;
		const helpEmbedHandler = new HelpEmbedHandler(
			interaction,
			main.commands.filter((c) => c.help.name !== 'Help')
		);
		helpEmbedHandler.createEmbed(command);
	},
};
