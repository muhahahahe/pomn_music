import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder, VoiceChannel } from 'discord.js';
import {
	checkURL,
	getMediaFile,
	getMusicChannelMessage,
	getPlayerManager,
	getSoundcloud,
	getYoutube,
	getYoutubePlaylist,
	searchYoutube,
} from '../utils/utils';
import Main from '../classes/Main';
import { MediaTrack } from '../interfaces';

export default {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Joins the voice channel and plays the provided track')
		.addStringOption((option) => option.setName('track').setDescription('Link to the track or search phrase').setRequired(true))
		.setDMPermission(false),
	help: {
		name: 'Play',
		description: 'Plays the provided track',
		arguments: '[track] - Link to the track or search phrase',
		usage: '/play `track:`https://www.youtube.com/watch?v=dQw4w9WgXcQ',
	},
	execute: async (interaction: ChatInputCommandInteraction, main: Main) => {
		const member = interaction.member as GuildMember;
		const musicMessage = await getMusicChannelMessage(interaction.guildId!, main);
		if (musicMessage && musicMessage.channelId === interaction.channelId)
			return interaction.reply({ content: 'Use the music player functions instead of slash commands in this channel!', ephemeral: true });
		const playerManager = getPlayerManager(member, main, musicMessage);
		if (typeof playerManager === 'string') return interaction.reply({ content: playerManager, ephemeral: true });

		const track = interaction.options.getString('track', true);
		const trackType = await checkURL(track);

		let track_info: MediaTrack | MediaTrack[] | string = '';
		let url: string = '';
		switch (trackType) {
			case 'not resolvable':
				return interaction.reply({ content: 'Media could not be resolved', ephemeral: true });
			case 'youtube':
				url = track;
				if (!track.startsWith('https')) url = 'https://' + track;
				track_info = await getYoutube(url, interaction.user, member.voice.channel as VoiceChannel);
				if (typeof track_info === 'string') return interaction.reply({ content: track_info, ephemeral: true });
				playerManager.addTrack(track_info);
				if (playerManager.isStopped()) playerManager.play();

				break;
			case 'youtube_playlist':
				url = track;
				if (!track.startsWith('https')) url = 'https://' + track;
				track_info = await getYoutubePlaylist(url, interaction.user, member.voice.channel as VoiceChannel);
				if (typeof track_info === 'string') return interaction.reply({ content: track_info, ephemeral: true });
				track_info.forEach((track) => {
					playerManager.addTrack(track);
				});
				if (playerManager.isStopped()) playerManager.play();

				break;
			case 'soundcloud':
				return interaction.reply({ content: 'Soundcloud is not supported yet', ephemeral: true });
				// try {
				// 	track_info = await getSoundcloud(track, interaction.user, member.voice.channel as VoiceChannel);
				// 	playerManager.addTrack(track_info);
				// 	if (playerManager.isStopped()) playerManager.play();
				// } catch (error) {
				// 	return interaction.reply({ content: `An error occurred while enqueueing *${track}*`, ephemeral: true }).catch(console.error);
				// }

				break;
			case 'spotify':
				//handle spotify
				return interaction.reply({ content: 'Spotify is not supported yet', ephemeral: true });

				break;
			case 'media':
				track_info = await getMediaFile(track, interaction.user, member.voice.channel as VoiceChannel);
				playerManager.addTrack(track_info);
				if (playerManager.isStopped()) playerManager.play();

				break;
			default:
				track_info = await searchYoutube(track, interaction.user, member.voice.channel as VoiceChannel);
				if (typeof track_info === 'string') return interaction.reply({ content: track_info, ephemeral: true });
				playerManager.addTrack(track_info);
				if (playerManager.isStopped()) playerManager.play();

				break;
		}
		if (!track_info) return interaction.reply({ content: `An error occurred while searching for *${track}*`, ephemeral: true });
		let title: string = 'unknown';
		if (track_info instanceof Object && 'title' in track_info) title = track_info.title;
		if (track_info instanceof Object && 'name' in track_info) title = track_info.name as string;
		if (track_info instanceof Array) title = `${track_info.length} tracks`;
		return interaction.reply({ content: `Added *${title}* to the queue` });
	},
};
