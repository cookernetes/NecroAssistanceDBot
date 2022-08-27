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

		if (gameID.length !== 5) {
			interaction.createMessage("The game ID must be 5 characters long!");
			return;
		}

		const selectedGame = await RankedGame.findOne({
			gameRef: gameID,
		});

		if (!selectedGame) {
			interaction.createMessage("There is no such game with that ID.");
			return;
		}

		if (selectedGame.scoreSubmitted) {
			interaction.createMessage(
				"This game has already been submitted and cannot be re-submitted/altered without appropriate permissions."
			);
			return;
		}

		//* Team user stuff
		const teamA = selectedGame.teamA.map((player) => player.replace(/[<@!>]/g, ""));

		let teamAUsers = await User.find({
			discordID: {
				$in: teamA,
			},
		});

		const teamB = selectedGame.teamB.map((player) => player.replace(/[<@!>]/g, ""));

		let teamBUsers = await User.find({
			discordID: {
				$in: teamB,
			},
		});

		//* Sorting to be balanced for elo calculations
		teamAUsers.sort((a, b) => a.elorating - b.elorating);
		teamBUsers.sort((a, b) => a.elorating - b.elorating);

		//* Actual code to change scores etc
		for (let i = 0; i < teamAUsers.length; i++) {
			const userA = teamAUsers[i];
			const userB = teamBUsers[i];

			// Unconditional changes
			if (!doubleOrNothing) {
				userA.gamesPlayed++;
				userB.gamesPlayed++;
			}

			userA.ratingBefore = userA.elorating;
			userB.ratingBefore = userB.elorating;

			if (winningTeam === "team-a") {
				let expectedScoreA = elo.getExpected(userA.elorating, userB.elorating);
				let expectedScoreB = elo.getExpected(userB.elorating, userA.elorating);

				if (!doubleOrNothing) {
					if (userA.doublePotentialElo > 0) {
						if (userA.doubleDidLastWin) {
							userA.elorating += userA.doublePotentialElo * 2;
							userB.elorating -= userB.doublePotentialElo * 2;
						} else if (!userA.doubleDidLastWin) {
							userB.elorating -= userB.doublePotentialElo;
						}
					} else {
						userA.elorating = elo.updateRating(expectedScoreA, 0, userA.elorating);
						userB.elorating = elo.updateRating(expectedScoreB, 1, userB.elorating);
					}

					userA.wins++;
					userB.losses++;

					userA.gamehistory.push(1);
					userB.gamehistory.push(0);

					const winstreak = calculateWinstreak(userA);

					if (winstreak === 3) {
						userA.elorating += 5;
					} else if (winstreak === 4) {
						userA.elorating += 6;
					} else if (winstreak === 5) {
						userA.elorating += 7;
					} else if (winstreak >= 6) {
						userA.elorating += 8;
					}
				} else {
					userA.doubleDidLastWin = true;
					userB.doubleDidLastWin = false;

					userA.doublePotentialElo = Math.abs(userA.elorating - elo.updateRating(expectedScoreA, 1, userA.elorating));
					userB.doublePotentialElo = Math.abs(userB.elorating - elo.updateRating(expectedScoreA, 0, userA.elorating));
				}
			} else {
				let expectedScoreA = elo.getExpected(userA.elorating, userB.elorating);
				let expectedScoreB = elo.getExpected(userB.elorating, userA.elorating);

				if (!doubleOrNothing) {
					if (userB.doublePotentialElo > 0) {
						if (userB.doubleDidLastWin) {
							userB.elorating += userB.doublePotentialElo * 2;
							userA.elorating -= userA.doublePotentialElo * 2;
						} else if (!userB.doubleDidLastWin) {
							userA.elorating -= userB.doublePotentialElo;
						}
					} else {
						userA.elorating = elo.updateRating(expectedScoreA, 1, userA.elorating);
						userB.elorating = elo.updateRating(expectedScoreB, 0, userB.elorating);
					}

					userB.wins++;
					userA.losses++;

					userA.gamehistory.push(0);
					userB.gamehistory.push(1);

					const winstreak = calculateWinstreak(userB);

					if (winstreak === 3) {
						userB.elorating += 5;
					} else if (winstreak === 4) {
						userB.elorating += 6;
					} else if (winstreak === 5) {
						userB.elorating += 7;
					} else if (winstreak >= 6) {
						userB.elorating += 8;
					}
				} else {
					userA.doubleDidLastWin = false;
					userB.doubleDidLastWin = true;

					userA.doublePotentialElo = Math.abs(userA.elorating - elo.updateRating(expectedScoreA, 0, userA.elorating));
					userB.doublePotentialElo = Math.abs(userB.elorating - elo.updateRating(expectedScoreA, 1, userA.elorating));
				}
			}

			userA.rank = eloToRank(userA.elorating);
			userB.rank = eloToRank(userB.elorating);

			await userA.save();
			await userB.save();
		}

		if (doubleOrNothing) {
			await interaction.createMessage(
				"**Double or nothing has been selected!** The stats for this game has not affected current ratings like ELO and rank, however a new game is being generated to contest the one you just played!"
			);

			//* Generate a new game with the *same* teams as last time, just with a new randomly selected map.
			const { bannedAgents, gameMap, gameRef, selectedmapimage, teamA, teamB } = makeTeams(
				[...selectedGame.teamA, ...selectedGame.teamB],
				true,
				{
					teamA: selectedGame.teamA,
					teamB: selectedGame.teamB,
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

		selectedGame.scoreSubmitted = true;
		await selectedGame.save();
	},
});
