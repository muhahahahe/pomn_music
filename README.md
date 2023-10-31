# POMN Music

POMN Music is a Discord bot that serves as a music player for any media file link it is provided with or YouTube, SoundCloud, and Spotify links. It offers a unique player function that provides quick control for the player within Discord.


## Installation

### On Your Local Machine or Server

To run POMN Music on your computer or server, you will need the following prerequisites:

- Node.js version 18+
- FFMPEG

If you have a previous version installed, make sure to make a backup of your data folder and dont overwrite the `.env` file. after extracting copy the data folder back in.

You can install POMN Music by following these steps:

1. Download the release ZIP-File `pomn_music.zip` and extract the contents of the folder `no-docker` in a directory of your choice

2. Install dependencies:
   run this command in the directory
   
   `npm install`

3. Paste your token in the `.env` file. You can create a Discord application and obtain the token in the [Discord Developer Portal](https://discord.com/developers/applications). Also add the bot to your server via the OAuth2 > URL Generator.
   The file should look like this:
   
   `TOKEN=YourTokenHere`

4. Configure any settings in the `data/config.json` if necessary.
   name - the name you want to set for the bot
   avatar - a link to an image you want to set as the avatar
   silent_mode - whether you want the bots command responses to be [ephemerals](https://support.discord.com/hc/en-us/articles/1500000580222-Ephemeral-Messages-FAQ#:~:text=An%20%22Ephemeral%20Message%22%20is%20a,long%20enough%2C%20or%20restart%20Discord.)
   player_embed - whether you want to use the bots special player
   playlists - whether you want the playlist feature activated

5. Start the bot:
   
   `npm start`


### Using Docker

If you prefer to use Docker to run POMN Music, follow these steps:

1. Download and extract the contents of the folder `docker` in the release ZIP-File `pomn-music.zip` into a folder on your server.

2. Navigate to the extracted folder:

   `cd /path/to/extracted/folder`

3. Paste your token in the `src/.env` file. You can create a Discord application and obtain the token in the [Discord Developer Portal](https://discord.com/developers/applications). Also add the bot to your server via the OAuth2 > URL Generator.
   The file should look like this:
   
   `TOKEN=YourTokenHere`

4. Configure any settings in the `data/config.json` if necessary.
   name - the name you want to set for the bot
   avatar - a link to an image you want to set as the avatar
   silent_mode - whether you want the bots command responses to be [ephemerals](https://support.discord.com/hc/en-us/articles/1500000580222-Ephemeral-Messages-FAQ#:~:text=An%20%22Ephemeral%20Message%22%20is%20a,long%20enough%2C%20or%20restart%20Discord.)
   player_embed - whether you want to use the bots special player
   playlists - whether you want the playlist feature activated

5. Build the Docker image:
   
   `docker build -t pomn_music .`

6. Create a docker-compose.yml file in the same folder with the following content:
   
   ```
   version: '3'
   
   services:
     pomn_music:
       image: pomn_music # Replace with your custom image name if needed
       volumes:
         - /path/to/extracted/folder/data:/usr/src/bot/data # adjust for your folder path
       restart: unless-stopped
   ```
   Ensure that the image field matches the name you provided in the docker build command if you customized it.

7. Use the following command to start the Docker container:
   
   `docker-compose up -d`

8. Ensure that the container has internet access, as it's required for POMN Music to function properly.

If you prefer using a tool like Portainer, you can use its web interface to create the container with the binded volume. Simply provide the same configuration settings as mentioned in the docker-compose.yml file.


## Usage

To use POMN Music, follow these steps:

1. Set up the music player channel in a Discord TextChannel by running the `/setup create` command. (requires the option player_embed set to true)

2. Use the `/help` command to see all available functions and how to control the music player.


## Contributing

If you'd like to contribute to the project, you can do so via standard GitHub methods such as forking the repository, making your changes, and submitting a pull request.


## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.


## Credits

POMN Music relies on the [play-dl](https://www.npmjs.com/package/play-dl) npm package for YouTube, SoundCloud, Spotify handling.
also not to forget the discord.js


## Contact

If you have any questions or issues with POMN Music, you can join my [Discord server](https://discord.com/invite/YnvBJ76Ajn) for support.

---
