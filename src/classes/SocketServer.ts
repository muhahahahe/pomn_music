import { GuildToken, MediaTrack, SocketData } from '../interfaces';
import { Server } from 'socket.io';
import PlayerManager from './PlayerManager';
import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { checkURL, getYoutube, getYoutubePlaylist, searchYoutube } from '../utils/utils';
import Main from './Main';
import { VoiceChannel } from 'discord.js';
import PlaylistManager from './PlaylistManager';

export default class SocketServer {
	private tokens: GuildToken[];
	public io: Server;
	public main: Main;

	constructor(private data: SocketData, main: Main) {
		this.tokens = data.guildtokens;
		this.main = main;
		let server;

		if (data.secure) {
			let privateKey = fs.readFileSync(path.join(__dirname, '../ssl/key.pem'));
			let certificate = fs.readFileSync(path.join(__dirname, '../ssl/cert.pem'));

			const options = {
				key: privateKey,
				cert: certificate,
			};

			server = https.createServer(options);

			privateKey = null!;
			certificate = null!;
		} else {
			server = http.createServer();
		}

		this.io = new Server(server, {
			cors: {
				origin: '*',
				methods: ['GET', 'POST'],
			},
		});

		this.io.use((socket, next) => {
			const token = socket.handshake.auth.token;
			const client = socket.handshake.auth.client;
			const guildId = socket.handshake.auth.guildId;
			console.log(`Incoming connection from ${socket.handshake.address}`);

			if (!token || !client || !guildId) {
				console.log('  Connection refused due to missing data!');
				return next(new Error('Authentication Error'));
			}

			const guildToken = this.tokens.find((t) => t.guildId === guildId);
			if (!guildToken) {
				console.log('  Connection refused due to token not set in Discord guild!');
				return next(new Error('Token not set'));
			}

			if (guildToken.token !== token) {
				console.log('  Connection refused due to invalid token!');
				return next(new Error('Invalid Token'));
			}

			socket.data.guildId = guildToken.guildId;
			socket.data.client = client;
			console.log(`  Connection allowed for ${socket.data.client} to guild: ${socket.data.guildId}`);
			next();
		});

		this.io.on('connection', (socket) => {
			socket.join(socket.data.guildId);
			let playerManager: PlayerManager | undefined = undefined;
			if (PlayerManager.instances.has(socket.data.guildId)) {
				playerManager = PlayerManager.instances.get(socket.data.guildId)!;
				socket.emit('statechange', playerManager.state, playerManager.current);
			} else {
				socket.emit('disconnected');
			}

			socket.on('test', () => {
				socket.emit('success');
				console.log(`  Connection test for ${socket.data.client} to guild: ${socket.data.guildId} successful!`);
				socket.disconnect();
				return;
			});

			socket.on('pause', () => {
				playerManager = PlayerManager.instances.get(socket.data.guildId);
				if (playerManager) playerManager.pause();
			});

			socket.on('stop', () => {
				playerManager = PlayerManager.instances.get(socket.data.guildId);
				if (playerManager) playerManager.stop(false);
			});

			socket.on('skip', () => {
				playerManager = PlayerManager.instances.get(socket.data.guildId);
				if (playerManager) {
					if (!playerManager.isRepeated() && !playerManager.isRepeatedAll()) playerManager.play();
					if (playerManager.isRepeated()) playerManager.repeatPlay();
					if (playerManager.isRepeatedAll()) playerManager.repeatAllPlay();
				}
			});

			socket.on('repeat', () => {
				playerManager = PlayerManager.instances.get(socket.data.guildId);
				if (playerManager) playerManager.repeat();
			});

			socket.on('repeatall', () => {
				playerManager = PlayerManager.instances.get(socket.data.guildId);
				if (playerManager) playerManager.repeatAll();
			});

			socket.on('shuffle', () => {
				playerManager = PlayerManager.instances.get(socket.data.guildId);
				if (playerManager) playerManager.shuffle();
			});

			socket.on('volume', (volume: number) => {
				playerManager = PlayerManager.instances.get(socket.data.guildId);
				if (playerManager) playerManager.volume(volume);
			});

			socket.on('search', async (query: string) => {
				playerManager = PlayerManager.instances.get(socket.data.guildId);
				if (!playerManager) return;
				const check = await checkURL(query);
				let track: MediaTrack | string = '';
				if (check === 'search') {
					if (query.startsWith('+')) {
						track = await searchYoutube(query, this.main.client.user, playerManager.voiceChannel as VoiceChannel);
						if (typeof track === 'string') return;
						playerManager.addTrack(track);
						if (playerManager.isStopped()) playerManager.play();
						else if (playerManager.playerEmbedHandler) playerManager.playerEmbedHandler.info(`Added *${track.title}*`);
					}

					if (query.startsWith('!')) {
						const name = query.replace('!', '').trim();
						const playlistManager = new PlaylistManager(this.main);
						playlistManager.playSocket(name, socket.data.guildId);
					}
				}

				if (check === 'youtube') {
					let url = query;
					if (!query.startsWith('https')) url = 'https://' + url;
					const track = await getYoutube(url, this.main.client.user, playerManager.voiceChannel as VoiceChannel);
					if (typeof track === 'string') return;
					playerManager.addTrack(track);
					if (playerManager.isStopped()) playerManager.play();
					else if (playerManager.playerEmbedHandler) playerManager.playerEmbedHandler.info(`Added *${track.title}*`);
				}

				if (check === 'youtube_playlist') {
					let url = query;
					if (!query.startsWith('https')) url = 'https://' + url;
					const tracks = await getYoutubePlaylist(url, this.main.client.user, playerManager.voiceChannel as VoiceChannel);
					if (typeof tracks === 'string') return;
					tracks.forEach((track) => {
						playerManager!.addTrack(track);
					});
					if (playerManager.isStopped()) playerManager.play();
					else if (playerManager.playerEmbedHandler) playerManager.playerEmbedHandler.info(`Added *${tracks.length} tracks*`);
				}
			});
		});

		server.listen(data.port, () => {
			console.log(`Socket listening on *:${data.port}`);
		});
	}

	public setTokens(tokens: GuildToken[]) {
		this.tokens = tokens;
	}
}
