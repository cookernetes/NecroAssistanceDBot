declare global {
	namespace NodeJS {
		interface ProcessEnv {
			botToken: string;
			guildID: string;
			mongoURI: string;
			rosterChannelID: string;
			rapidAPIKey: string;
		}
	}
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
