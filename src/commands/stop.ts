import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import Main from '../classes/Main';
import { getMusicChannelMessage, getPlayerManager } from '../utils/utils';

export default {
	data: new SlashCommandBuilder()
		.setName('stop')
		.setDescription('Stops the playback and empties the queue.')
		.addBooleanOption((option) => option.setName('force').setDescription('Leaves the voice channel.').setRequired(false))
		.setDMPermission(false),
	help: {
		name: 'Stop',
		description: 'Stops the playback and empties the queue.',
		arguments: '[force: boolean] - Leaves the voice channel. *not required*',
		usage: '/stop `force:` boolean',
	},
	execute: async (interaction: ChatInputCommandInteraction, main: Main) => {
		const member = interaction.member as GuildMember;
		const musicMessage = await getMusicChannelMessage(interaction.guildId!, main);
		if (musicMessage && musicMessage.channelId === interaction.channelId)
			return interaction
				.reply({ content: 'Use the music player functions instead of slash commands in this channel!', ephemeral: true })
				.catch(() => {});
		const playerManager = getPlayerManager(member, main, musicMessage);
		if (typeof playerManager === 'string') return interaction.reply({ content: playerManager, ephemeral: true }).catch(() => {});
		if (!playerManager.isConnected())
			return interaction.reply({ content: 'Not connected to a voice channel.', ephemeral: main.config.silent_mode }).catch(() => {});
		const force = interaction.options.getBoolean('force') || false;
		playerManager.stop(force);
		return interaction.reply({ content: 'Stopped playback.', ephemeral: main.config.silent_mode }).catch(() => {});
	},
};
