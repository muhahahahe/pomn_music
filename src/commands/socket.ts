import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import Main from '../classes/Main';
import { GuildToken } from '../interfaces';

export default {
	data: new SlashCommandBuilder()
		.setName('socket')
		.setDescription('Sets a token for this guilds socket connection.')
		.addStringOption((option) =>
			option.setName('token').setDescription('The token to set, minimum 8 characters.').setMinLength(8).setRequired(true)
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDMPermission(false),
	help: {
		name: 'Socket',
		description: 'Sets a token for this guilds socket connection.',
		arguments: 'token - the token to set',
		usage: '/socket <token>',
	},
	execute: async (interaction: ChatInputCommandInteraction, main: Main) => {
		const token = interaction.options.getString('token', true).trim();
		const data: GuildToken = {
			guildId: interaction.guildId!,
			token: token,
		};
		let config = main.config;
		if (config.websocket.guildtokens.find((t) => t.guildId === data.guildId)) {
			config.websocket.guildtokens = config.websocket.guildtokens.filter((t) => t.guildId !== data.guildId);
		}
		config.websocket.guildtokens.push(data);
		main.setConfig(config);
		main.socketServer?.setTokens(config.websocket.guildtokens);

		interaction.reply({ content: `Token for this guild set to:\n${token}`, ephemeral: true });
	},
};
