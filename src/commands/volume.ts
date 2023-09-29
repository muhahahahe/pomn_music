import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import Main from '../classes/Main';
import PlayerManager from '../classes/PlayerManager';
import { getMusicChannelMessage } from '../utils/utils';

export default {
	data: new SlashCommandBuilder()
		.setName('volume')
		.setDescription('Sets the volume of the current track.')
		.addIntegerOption((option) =>
			option.setName('volume').setDescription('The volume to set the track to (1-100)').setMinValue(1).setMaxValue(100).setRequired(true)
		)
		.setDMPermission(false),
	help: {
		name: 'Volume',
		description: 'Sets the volume of the current track.',
		arguments: '[volume] - The volume to set the track to (1-100)',
		usage: '/volume `volume:`20',
	},
	execute: async (interaction: ChatInputCommandInteraction, main: Main) => {
		const member = interaction.member as GuildMember;
		const musicMessage = await getMusicChannelMessage(interaction.guildId!, main);
		if (musicMessage && musicMessage.channelId === interaction.channelId)
			return interaction.reply({ content: 'Use the music player functions instead of slash commands in this channel!', ephemeral: true });
		const playerManager = PlayerManager.getInstance(member);
		const volume = interaction.options.getInteger('volume', true);
		if (playerManager.isPaused() || playerManager.isPlaying()) {
			playerManager.volume(volume);

			return interaction.reply({ content: `Set the volume to ${volume}` }).catch(console.error);
		}

		return interaction.reply({ content: 'Nothing is playing', ephemeral: true }).catch(console.error);
	},
};
