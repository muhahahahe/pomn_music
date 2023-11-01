import { Server } from 'socket.io';
import http from 'http';
import https from 'https';
import { GuildToken, SocketData } from '../interfaces';
import PlayerManager from './PlayerManager';

export default class SocketServer {
	private tokens: GuildToken[];
	public io: Server;

	constructor(private data: SocketData) {
		this.tokens = data.guildtokens;
		let server;

		if (data.secure) {
			if (process.env.PRIVATEKEY?.length === 0 || process.env.CERTIFICATE?.length === 0) {
				throw new Error('No private key or certificate provided');
			}
			let privateKey = Buffer.from(process.env.PRIVATEKEY!, 'base64').toString('utf8');
			let certificate = Buffer.from(process.env.CERTIFICATE!, 'base64').toString('utf8');

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

		this.io = new Server(server);

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
				socket.emit('state', playerManager.state, playerManager.current);
			} else {
				socket.emit('disconnected');
			}

			socket.on('disconnect', () => {
				socket.leave(socket.data.guildId);
				console.log(`Client: ${socket.data.client} disconnected from guild: ${socket.data.guildId}`);
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
		});

		server.listen(data.port, () => {
			console.log(`Socket listening on *:${data.port}`);
		});
	}

	public setTokens(tokens: GuildToken[]) {
		this.tokens = tokens;
	}
}
