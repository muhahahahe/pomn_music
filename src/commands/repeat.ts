import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import Main from '../classes/Main';
import PlayerManager from '../classes/PlayerManager';
import { getMusicChannelMessage } from '../utils/utils';

export default {
	data: new SlashCommandBuilder().setName('repeat').setDescription('Repeats the current song.').setDMPermission(false),
	help: {
		name: 'Repeat',
		description: 'Repeats the current song.',
		arguments: '',
		usage: '/repeat',
	},
	execute: async (interaction: ChatInputCommandInteraction, main: Main) => {
		const member = interaction.member as GuildMember;
		const musicMessage = await getMusicChannelMessage(interaction.guildId!, main);
		if (musicMessage && musicMessage.channelId === interaction.channelId)
			return interaction.reply({ content: 'Use the music player functions instead of slash commands in this channel!', ephemeral: true });
		const playerManager = PlayerManager.getInstance(member);
		if (!playerManager.current) return interaction.reply({ content: 'There is no song playing.', ephemeral: true }).catch(console.error);
		playerManager.setRepeat(true);
		return interaction.reply({ content: 'Repeating the current song', ephemeral: true }).catch(console.error);
	},
};