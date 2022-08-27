import { BCommand } from "../../structures/Command";

import EloRank from "elo-rank";
const elo = new EloRank(25);

import RankedGame from "../../schemas/RankedGame";
import User from "../../schemas/User";
import eloToRank from "../../functions/eloToRank";
import Eris from "eris";
import makeTeams from "../../functions/teamsGenerator";

const calculateWinstreak = (user: any): number => {
	let winstreak = 0;

	for (let i = 0; i < user.gamehistory.length; i++) {
		if (user.gamehistory[i] === 1) {
			winstreak++;
		} else {
			winstreak = 0;
		}
	}

	return winstreak;
};

export default new BCommand({
	name: "submit-score",
	description: "Submit the score for a ranked game!",
	type: Eris.Constants.ApplicationCommandTypes.CHAT_INPUT,
	options: [
		{
			name: "game-id",
			description: "The game reference for the ranked game",
			type: Eris.Constants.ApplicationCommandOptionTypes.STRING,
			required: true,
		},
		{
			name: "winning-team",
			description: "Which team won?",
			type: Eris.Constants.ApplicationCommandOptionTypes.STRING,
			required: true,
			choices: [
				{
					name: "Team A",
					value: "team-a",
				},
				{
					name: "Team B",
					value: "team-b",
				},
			],
		},
		{
			name: "double-or-nothing",
			description: "Would you like to play double or nothing?",
			type: Eris.Constants.ApplicationCommandOptionTypes.BOOLEAN,
			required: true,
		},
	],

	run: async ({ interaction }) => {
		const gameID = interaction.data.options.find((o) => o.name === "game-id").value as string;
		const winningTeam = interaction.data.options.find((o) => o.name === "winning-team").value as string;
		const doubleOrNothing = interaction.data.options.find((o) => o.name === "double-or-nothing").value as string;

		const dbGame = await RankedGame.findOne({ gameRef: gameID });
		if (!dbGame) return interaction.createMessage({ flags: 64, content: "There is no game found in the system with that ID" });

		const teamA = dbGame.teamA.map((u) => u.replace(/[<@!>]/g, ""));
		const teamB = dbGame.teamB.map((u) => u.replace(/[<@!>]/g, ""));

		const dbTeamA = await User.find({ discordID: { $in: teamA } });
		const dbTeamB = await User.find({ discordID: { $in: teamB } });

		if (!dbTeamA || !dbTeamB)
			return interaction.createMessage(
				"One or more users were not found in the database. Please locate the user and ask them to run /register."
			);

		if (dbTeamA.length !== dbTeamB.length) {
			return interaction.createMessage(
				"There is invalid (inequal) team data on the ranked game specified.\nPlease contact deadhash for support if this issue persists."
			);
		}

		if (dbGame.scoreSubmitted)
			return interaction.createMessage(
				"This game has already been submitted.\nIf you believe this to be an issue, contact deadhash directly."
			);

		for (let i = 0; i < dbTeamA.length; i++) {
			const playerA = dbTeamA[i];
			const playerB = dbTeamB[i];

			let expectedScoreA = elo.getExpected(playerA.elorating, playerB.elorating);
			let expectedScoreB = elo.getExpected(playerB.elorating, playerA.elorating);

			// Both player *UNCONDITIONAL* CHANGES
			playerA.ratingBefore = playerA.elorating;
			playerB.ratingBefore = playerA.elorating;

			if (winningTeam === "team-a") {
				if (!doubleOrNothing) {
					playerA.wins++;
					playerB.losses++;

					if (playerA.doublePotentialElo > 0 && playerA.doubleDidLastWin) {
						playerA.gamehistory.push(2);
						playerB.gamehistory.push(3);
					} else {
						playerA.gamehistory.push(1);
						playerB.gamehistory.push(0);
					}

					playerA.gamesPlayed++;
					playerB.gamesPlayed++;

					//* Elo affecting logic
					if (playerA.doublePotentialElo > 0) {
						if (playerA.doubleDidLastWin) {
							playerA.elorating += playerA.doublePotentialElo * 2;
							playerB.elorating -= playerB.doublePotentialElo * 2;
						} else if (!playerA.doubleDidLastWin) {
							playerB.elorating -= playerB.doublePotentialElo;
						}
					} else {
						playerA.elorating = elo.updateRating(expectedScoreA, 1, playerA.elorating);
						playerB.elorating = elo.updateRating(expectedScoreB, 0, playerB.elorating);

						playerA.doublePotentialElo = 0;
						playerB.doublePotentialElo = 0;
					}
				} else {
					playerA.doubleDidLastWin = true;
					playerB.doubleDidLastWin = false;

					playerA.doublePotentialElo = Math.abs(playerA.elorating - elo.updateRating(expectedScoreA, 1, playerA.elorating));
					playerB.doublePotentialElo = Math.abs(playerB.elorating - elo.updateRating(expectedScoreB, 0, playerB.elorating));
				}
			} else {
				if (!doubleOrNothing) {
					playerB.wins++;
					playerA.losses++;

					if (playerB.doublePotentialElo > 0 && playerB.doubleDidLastWin) {
						playerA.gamehistory.push(3);
						playerB.gamehistory.push(2);
					} else {
						playerA.gamehistory.push(0);
						playerB.gamehistory.push(1);
					}

					playerA.gamesPlayed++;
					playerB.gamesPlayed++;

					//* Elo affecting logic
					if (playerB.doublePotentialElo > 0) {
						if (playerB.doubleDidLastWin) {
							playerB.elorating += playerB.doublePotentialElo * 2;
							playerB.elorating -= playerB.doublePotentialElo * 2;
						} else if (!playerB.doubleDidLastWin) {
							playerB.elorating -= playerB.doublePotentialElo;
						}
					} else {
						playerB.elorating = elo.updateRating(expectedScoreB, 1, playerB.elorating);
						playerA.elorating = elo.updateRating(expectedScoreA, 0, playerA.elorating);

						playerA.doublePotentialElo = 0;
						playerB.doublePotentialElo = 0;
					}
				} else {
					playerA.doubleDidLastWin = false;
					playerB.doubleDidLastWin = true;

					playerA.doublePotentialElo = Math.abs(playerA.elorating - elo.updateRating(expectedScoreA, 0, playerA.elorating));
					playerB.doublePotentialElo = Math.abs(playerB.elorating - elo.updateRating(expectedScoreB, 1, playerB.elorating));
				}
			}

			await playerA.save();
			await playerB.save();
		}

		if (doubleOrNothing) {
			await interaction.createMessage(
				"**Double or nothing has been selected!** The stats for this game has not affected current ratings like ELO and rank, however a new game is being generated to contest the one you just played!"
			);

			//* Generate a new game with the *same* teams as last time, just with a new randomly selected map.
			const { bannedAgents, gameMap, gameRef, selectedmapimage, teamA, teamB } = makeTeams(
				[...dbGame.teamA, ...dbGame.teamB],
				true,
				{
					teamA: dbGame.teamA,
					teamB: dbGame.teamB,
				}
			);

			new RankedGame({
				gameMap: gameMap,
				gameRef: gameRef,
				teamA: teamA,
				teamB: teamB,
				scoreSubmitted: false,
			}).save();

			// Banned agents variable is equal to "Nothing" if there are no banned agents
			const bannedAgentsString = bannedAgents.length ? bannedAgents.join(", ") : "No banned agents!";

			await interaction.channel.createMessage({
				embeds: [
					{
						title: `A **Ranked** Game Has Been Generated On ${gameMap}!`,
						description: `**This game __will__ affect ELO rating scores.**\nGood luck, and may the best team win!`,
						color: 0x09ff00,
						fields: [
							{
								name: `Team A (T → CT):`,
								value: `${teamA.join("\n")}`,
								inline: true,
							},
							{
								name: `Team B (CT → T):`,
								value: `${teamB.join("\n")}`,
								inline: true,
							},
							{
								name: `Game ID (To submit scores)`,
								value: `${gameRef}`,
								inline: false,
							},
							{
								name: `Banned Agents:`,
								value: `${bannedAgentsString}`,
								inline: false,
							},
						],
						image: {
							url: `${selectedmapimage}`,
						},
					},
				],
			});

			return;
		} else {
			await interaction.createMessage(
				"The scores have successfully been submitted, and ELO etc has been affected accordingly.\nWell done and good luck for next time!"
			);

			// LB Pos stuff
			let users = await User.find({});
			users.sort((a, b) => b.elorating - a.elorating);

			// Only users that have played a ranked game
			users = users.filter((user) => user.gamehistory.length > 0);

			for (let i = 0; i < users.length; i++) {
				users[i].lbpos = i + 1;
				users[i].save();
			}
		}

		dbGame.scoreSubmitted = true;
		await dbGame.save();
	},
});
