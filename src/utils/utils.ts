import {
	EmojiIdentifierResolvable,
	GuildMember,
	Message,
	MessageReaction,
	PartialMessageReaction,
	PartialUser,
	REST,
	RESTPostAPIApplicationCommandsJSONBody,
	Routes,
	TextChannel,
	User,
	VoiceChannel,
} from 'discord.js';
import { AudioPlayer, AudioResource, NoSubscriberBehavior, createAudioPlayer, createAudioResource, demuxProbe } from '@discordjs/voice';
import { InfoData, SoundCloud, YouTubeVideo, playlist_info, search, soundcloud, stream, video_basic_info } from 'play-dl';
import axios from 'axios';
import { IAudioMetadata, parseStream } from 'music-metadata';
import path from 'path';
import fs from 'fs';
import { Command, Config, MediaTrack, MusicChannelData, Playlist, ResolvedReaction } from '../interfaces';
import PlayerManager from '../classes/PlayerManager';
import Main from '../classes/Main';

const playableTypes = [
	'audio/aac',
	'audio/flac',
	'audio/m4a',
	'audio/mpeg',
	'audio/mp4',
	'audio/ogg',
	'audio/opus',
	'audio/wav',
	'audio/webm',
	'audio/x-flac',
	'video/mpeg',
	'video/mp4',
	'video/ogg',
	'video/quicktime',
	'video/webm',
	'video/x-msvideo',
	'video/3gpp',
];

const basicMusicChannelData = {
	guildId: '0',
	channelId: '0',
	messageId: '0',
};

const defaultThumbnail = 'https://www.dropbox.com/scl/fi/fmbn0x9r4uwhposciz9n5/black_thumbnail.png?rlkey=uaen00ozi5rk483e2hzsxjovi&dl=1';

/**
 * Returns all commands in from the commands folder.
 *
 * @returns {Command[]} - Returns an array of commands.
 * @throws {Error} - Throws an error if no commands are found.
 */
function getCommands(): Command[] {
	const commands: Command[] = [];
	const folderPath = path.join(__dirname, '../commands');
	const files = fs.readdirSync(folderPath).filter((file) => file.endsWith('.js'));

	for (const file of files) {
		const command = require(path.join(folderPath, file));
		if ('data' in command.default && 'execute' in command.default) {
			commands.push(command.default);
		} else {
			console.log(`Command ${file} is missing "data" or "execute" in property`);
		}
	}

	if (commands.length === 0) {
		throw new Error('No commands found');
	}

	return commands;
}

/**
 * Registers all commands passed in
 *
 * @param {string} clientId - Id of the client
 * @param {CommandData[]} commands - Array of the commands data section
 */
function registerCommands(clientId: string, commands: RESTPostAPIApplicationCommandsJSONBody[]): void {
	const rest = new REST().setToken(process.env.TOKEN!);

	(async () => {
		console.log('Registering commands...');
		try {
			await rest.put(Routes.applicationCommands(clientId), { body: commands });
			console.log(`Successfully registered ${commands.length} commands`);
			const configJSON = fs.readFileSync(path.join(__dirname, '../data/config.json'), 'utf8');
			const config: Config = JSON.parse(configJSON);
			config.reg_commands = true;
			writeConfig(config);
		} catch (error) {
			console.error(error);
		}
	})();
}

/**
 * Gets an updated config file for the music channel
 *
 * @param {MusicChannelData} data - Music channel data
 * @returns {Config} - Returns the config with the updated music channel data
 */
function updateMusicChannelConfig(data: MusicChannelData, old?: boolean): Config | false {
	let configJSON;
	try {
		configJSON = fs.readFileSync(path.join(__dirname, '../data/config.json'), 'utf8');
	} catch (error) {
		console.error('Reading config failed: ', error);
		return false;
	}
	const config: Config = JSON.parse(configJSON);
	if (config.music_channels[0].guildId === '0') {
		config.music_channels[0] = data;
	} else if (old) {
		const index = config.music_channels.findIndex((channel) => channel.guildId === data.guildId);
		config.music_channels[index] = data;
	} else {
		config.music_channels.push(data);
	}
	return config;
}

/**
 * Gets an updated config file for the music channel
 *
 * @param {string} guildId - Music channel data
 * @returns {Config} - Returns the config with the updated music channel data
 */
function removeMusicChannelConfig(guildId: string): Config | false {
	let configJSON;
	try {
		configJSON = fs.readFileSync(path.join(__dirname, '../data/config.json'), 'utf8');
	} catch (error) {
		console.error('Reading config failed: ', error);
		return false;
	}
	const config: Config = JSON.parse(configJSON);
	if (config.music_channels.length > 1) {
		const newChannels = config.music_channels.filter((channel) => channel.guildId !== guildId);
		config.music_channels = newChannels;
	} else {
		config.music_channels = [basicMusicChannelData];
	}
	return config;
}

/**
 * Writes the config to file
 *
 * @param {Config} config - The config file
 */
function writeConfig(config: Config): void {
	try {
		fs.writeFileSync(path.join(__dirname, '../data/config.json'), JSON.stringify(config));
	} catch (error) {
		console.error('Writing config failed: \n', error);
	}
}

/**
 * Writes the playlists to file
 *
 * @param {Playlist[]} playlists - The playlists data
 */
function writePlaylists(playlists: Playlist[]): void {
	try {
		fs.writeFileSync(path.join(__dirname, '../data/playlists.json'), JSON.stringify(playlists));
	} catch (error) {
		console.error('Writing playlists failed: \n', error);
	}
}

/**
 * Resolves a reaction and user partial.
 *
 * @param {MessageReaction | PartialMessageReaction} reaction -The reaction to resolve.
 * @param {User | PartialUser} user - The user to resolve.
 * @returns {Promise<ResolvedReaction | false>} - Returns the resolved reaction or false if it failed.
 */
async function resolveReactionPartials(
	reaction: MessageReaction | PartialMessageReaction,
	user: User | PartialUser
): Promise<ResolvedReaction | false> {
	if (reaction.partial) {
		try {
			reaction = await reaction.fetch();
		} catch (error) {
			console.error('Fetching reaction failed: ', error);
			return false;
		}
	}
	if (user.partial) {
		try {
			user = await user.fetch();
		} catch (error) {
			console.error('Fetching user failed: ', error);
			return false;
		}
	}
	return {
		reaction,
		user,
	};
}

/**
 * Removes the reaction from the provided user
 *
 * @param {MessageReaction} reaction - The discord MessageReaction to remove from.
 * @param {User} user - The discord User to remove from the reaction.
 */
async function removeReaction(reaction: MessageReaction, user: User): Promise<void> {
	try {
		await reaction.users.remove(user);
	} catch (error) {
		console.error('Removing reaction failed: ', error);
	}
}

/**
 * Adds reactions to a message.
 *
 * @param {Message} message - The message to add reactions to.
 * @param {EmojiIdentifierResolvable[]} emojis - The emojis to add to the message.
 */
function addReaction(message: Message, emojis: EmojiIdentifierResolvable[]): void {
	emojis.forEach((emoji) => {
		message.react(emoji).catch(console.error);
	});
}

/**
 * Gets the instance of the PlayerManager for the provided GuildMembers Guild and establishes a voice connection.
 *
 * @param {GuildMember} member - The discord.js Guildmember.
 * @param {Message} message - *Optional* The discord.js Message of the music player.
 * @returns {PlayerManager} - Returns the PlayerManager.
 */
function getPlayerManager(member: GuildMember, main: Main, playerEmbed: false | Message): PlayerManager | string {
	const playerManager = PlayerManager.getInstance(member, main);
	if (member.voice.channel === null) {
		return 'You must be in a voice channel.';
	}
	const connection = playerManager.createVoiceConnection(member, playerEmbed);
	if (connection.joinConfig.channelId !== member.voice.channelId) {
		//check if the player is idle for more than 10 minutes
		if (Date.now() - playerManager.getIdletime() > 600000) {
			playerManager.destroyVoiceConnection();
			playerManager.createVoiceConnection(member, playerEmbed);
			return playerManager;
		}
		return 'Currently playing in a different voice channel.';
	}
	return playerManager;
}

/**
 * Checks if the provided link resolves in a playable media file
 *
 * @param {string} url - The URL of the file
 * @returns {boolean}
 */
async function isPlayableFile(url: string): Promise<boolean> {
	try {
		const response = await axios.head(url);
		if (response.status !== 200) return false;
		const contentType = response.headers['content-type'];
		return playableTypes.some((type) => contentType.startsWith(type));
	} catch (error) {
		return false;
	}
}

/**
 * Checks if the provided string is a URL or a search string.
 * If it's a URL, it checks if it's a YouTube, Spotify, or SoundCloud link.
 *
 * @param {string} url - The string to check.
 * @returns {Promise<string>} - Returns 'youtube', 'youtube_playlist', 'spotify', 'soundcloud', 'media', or 'search' depending on the provided string.
 */
async function checkURL(url: string): Promise<string> {
	const urlRegex =
		/^(https?:\/\/)?((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(\:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(\#[-a-z\\d_]*)?$/i;
	if (!urlRegex.test(url)) {
		return 'search';
	}

	const youtubeUrlRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
	const youtubePlaylistRegex = /list=/;
	const spotifyUrlRegex = /^(https?:\/\/)?(www\.)?(open\.spotify\.com)\/.+$/;
	const soundcloudUrlRegex = /^(https?:\/\/)?(www\.)?(soundcloud\.com)\/.+$/;

	if (youtubeUrlRegex.test(url)) {
		if (youtubePlaylistRegex.test(url)) {
			return 'youtube_playlist';
		}
		return 'youtube';
	} else if (spotifyUrlRegex.test(url)) {
		return 'spotify';
	} else if (soundcloudUrlRegex.test(url)) {
		return 'soundcloud';
	} else if (await isPlayableFile(url)) {
		return 'media';
	} else {
		return 'not resolvable';
	}
}

/**
 * Searches for the first result of the provided search string on YouTube.
 *
 * @param {string} query - Search string for the YouTube query.
 * @returns {Promise<MediaTrack | string>} - Returns a promise with a MediaTrack or string.
 */
async function searchYoutube(query: string, user: User, channel: VoiceChannel): Promise<MediaTrack | string> {
	let result: YouTubeVideo | null = null;
	try {
		result = (
			await search(query, {
				limit: 1,
				source: {
					youtube: 'video',
				},
			})
		)[0];
	} catch (error) {
		return 'No results found.';
	}
	if (!result) {
		return 'No results found.';
	}
	const data: MediaTrack = {
		requester: user,
		voiceChannel: channel,
		title: result.title || 'unknown',
		durationInSec: result.durationInSec || 0,
		url: result.url,
		thumbnail: result.thumbnails[0].url || defaultThumbnail,
		type: 'youtube',
	};
	return data;
}

/**
 * Gets a MediaTrack from a Youلإube URL.
 *
 * @param url - URL or ID of the YouTube video.
 * @param user - The discord user who requested the track.
 * @param channel - The discord voice channel the user is in.
 * @returns {Promise<MediaTrack | false>} - Returns a promise with a MediaTrack object.
 */
async function getYoutube(url: string, user: User, channel?: VoiceChannel): Promise<MediaTrack | string> {
	let result: InfoData | null = null;
	try {
		result = await video_basic_info(url);
	} catch (error) {
		console.error(error);
		return 'Error while fetching YouTube.';
	}
	const data: MediaTrack = {
		requester: user,
		voiceChannel: channel,
		title: result.video_details.title || 'unknown',
		durationInSec: result.video_details.durationInSec || 0,
		url: result.video_details.url,
		thumbnail: result.video_details.thumbnails[0].url || defaultThumbnail,
		type: 'youtube',
	};
	return data;
}

/**
 * Gets an array of MediaTrack objects from a YouTube playlist URL.
 *
 * @param url - URL to the YouTube playlist.
 * @param user - The discord user who requested the playlist.
 * @param channel - The discord voice channel the user is in.
 * @returns {Promise<MediaTrack[] | string>} - Returns a promise with an array of MediaTrack objects.
 */
async function getYoutubePlaylist(url: string, user: User, channel: VoiceChannel): Promise<MediaTrack[] | string> {
	let data: MediaTrack[] = [];
	try {
		const result = await playlist_info(url, { incomplete: true });
		const videos = await result.all_videos();
		videos.forEach((video) => {
			data.push({
				requester: user,
				voiceChannel: channel,
				title: video.title || 'unknown',
				durationInSec: video.durationInSec || 0,
				url: video.url,
				thumbnail: video.thumbnails[0].url || defaultThumbnail,
				type: 'youtube',
			});
		});
	} catch (error) {
		return 'Error while fetching YouTube playlist.';
	}
	if (data.length === 0) {
		return 'Playlist is empty.';
	}
	return data;
}

/**
 * Gets a MediaTrack from a Soundcloud URL.
 *
 * @param {string} url - Thumbail URL of the Soundcloud track.
 * @param {User} user - The discord user who requested the track.
 * @param {VoiceChannel} channel - The discord voice channel the user is in.
 * @returns {Promise<MediaTrack | string>} - Returns a promise with a MediaTrack object.
 */
async function getSoundcloud(url: string, user: User, channel: VoiceChannel): Promise<MediaTrack | string> {
	let result: SoundCloud | null = null;
	try {
		result = await soundcloud(url);
	} catch (error) {
		return 'Error while fetching Soundcloud track.';
	}

	const data: MediaTrack = {
		requester: user,
		voiceChannel: channel,
		title: result.name || 'unknown',
		durationInSec: result.durationInSec || 0,
		url: result.url,
		thumbnail: result.user.thumbnail || defaultThumbnail,
		type: 'soundcloud',
	};
	return data;
}

/**
 * Gets the metadata and stream info from the provided link.
 *
 * @param {string} url - Link to the media file.
 * @param {User} user - The discord.js User who requested the media.
 * @param {VoiceChannel} channel - The discord.js VoiceChannel the user is in.
 * @returns {Promise<MediaTrack>} - Returns a promise with a MediaTrack object.
 */
async function getMediaFile(url: string, user: User, channel?: VoiceChannel): Promise<MediaTrack> {
	const metadata = await getMediaInfo(url);
	const mediaTrack: MediaTrack = {
		requester: user,
		voiceChannel: channel,
		url,
		title: metadata?.common.title || 'unknown',
		durationInSec: metadata?.format.duration || 0,
		thumbnail: defaultThumbnail,
		type: 'media',
	};
	return mediaTrack;
}
async function getMediaInfo(url: string): Promise<IAudioMetadata | null> {
	let metadata: IAudioMetadata | null = null;
	try {
		metadata = await parseStream((await axios.get(url, { responseType: 'stream' })).data);
	} catch (error) {}
	return metadata;
}

/**
 * Creates an AudioResource from the provided URL turned into a stream with play-dl.
 *
 * @param {MediaTrack} media - link to the YouTube or Soundcloud resource.
 * @returns {Promise<AudioResource>} - Returns a promise with an AudioResource.
 */
async function createResourceStream(media: MediaTrack, volume: number): Promise<AudioResource> {
	let resource;
	if (media.type === 'youtube' || media.type === 'soundcloud') {
		const strm = await stream(media.url);
		resource = createAudioResource(strm.stream, {
			inputType: strm.type,
			inlineVolume: true,
		});
		resource.volume!.setVolume(volume / 100);
	} else if (media.type === 'media') {
		const strm = await demuxProbe((await axios.get(media.url, { responseType: 'stream' })).data);
		resource = createAudioResource(strm.stream, {
			inputType: strm.type,
			inlineVolume: true,
		});
		resource.volume!.setVolume(volume / 100);
	}
	if (!resource) throw new Error('Could not create Resource from stream');
	return resource;
}

/**
 * Creates an AudioPlayer with discordjs/voice
 *
 * @param {NoSubscriberBehavior} behavior - Behavior of the player when an audio packet is played but there are no available voice connections to play to.
 * @returns {AudioPlayer} - Returns an AudioPlayer with the provided behavior.
 */
function createPlayer(behavior: NoSubscriberBehavior): AudioPlayer {
	return createAudioPlayer({
		behaviors: {
			noSubscriber: behavior,
		},
	});
}

/**
 * Gets the discord message object for the music channel.
 *
 * @param {string} guildId - The id of the guild.
 * @param {Main} main - The Main class.
 * @returns {Promise<Message | false>} - Returns a promise with a discord Message object or false.
 */
async function getMusicChannelMessage(guildId: string, main: Main): Promise<Message | false> {
	if (!main.config.player_embed) return false;
	const music = main.config.music_channels.find((guild) => guild.guildId === guildId);
	if (!music?.channelId || music.channelId === '0') return false;
	const channel = (await main.client.channels.fetch(music.channelId)) as TextChannel;
	if (!channel) return false;
	const message = await channel.messages.fetch(music.messageId);
	if (!message) return false;
	return message;
}

/**
 * Deletes a message.
 *
 * @param {Message} message - The message to delete.
 */
function deleteMessage(message: Message): void {
	message.delete().catch(console.error);
}

/**
 * Creates a time string for the provided number of seconds.
 *
 * @param {number} seconds - Number of seconds to convert to a time string.
 * @returns {string} - Returns a string of the form "hh:mm:ss or mm:ss".
 */
function secondsToTime(seconds: number): string {
	const date = new Date(0);
	date.setSeconds(seconds);
	let time = date.toISOString().substr(11, 8);
	if (time.startsWith('00:')) time = time.substr(3);
	return time;
}

export {
	getCommands,
	registerCommands,
	updateMusicChannelConfig,
	removeMusicChannelConfig,
	writeConfig,
	writePlaylists,
	resolveReactionPartials,
	removeReaction,
	addReaction,
	getPlayerManager,
	checkURL,
	searchYoutube,
	getYoutube,
	getYoutubePlaylist,
	getSoundcloud,
	getMediaFile,
	createResourceStream,
	createPlayer,
	getMusicChannelMessage,
	deleteMessage,
	secondsToTime,
};
