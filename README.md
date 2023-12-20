<img width="500" alt="HEADER" src="https://github.com/196Sebastian/OP-Rank-Discord-Bot/assets/87108242/0fb08544-a5eb-4077-a626-692fd6ad0d18">

# 🌟 Project Description
I've developed an innovative rank bot on Discord for the One Piece card game. This dynamic bot excels in game initiation, providing users with a seamless setup process for various gaming scenarios. The challenge initiation module, tailored to consider voice channel constraints, enhances user engagement, ensuring a smooth transition into the gaming experience. Its sophisticated result reporting system ensures accurate representation of game outcomes through user reactions and confirmation mechanisms. A standout feature is the implementation of an Elo-based leaderboard, showcasing my deep understanding of gaming mechanics and user interactions by efficiently ranking users based on their performance.

<img width="775" alt="GIT01" src="https://github.com/196Sebastian/OP-Rank-Discord-Bot/assets/87108242/675aa9c3-26c8-443e-91eb-066a3bee7864">

# 🔧Key Features
challengeCommand:
* Checks if the command is used in the designated channel and mentions another user for a challenge.
* Verifies that users are not challenging themselves or bots and are not currently in an ongoing game.
* Ensures that both users are in the same voice channel within a specified category.
* Generates a challenge message with reactions and awaits responses.
* Initiates a game session if the challenge is accepted, updating Elo values and game states.

reportCommand:
* Ensures the command is used in the designated channel for reporting game results.
* Validates that the mentioned opponent user is not the same as the command executor and is not a bot.
* Checks for the existence of an ongoing game with the mentioned opponent.
* Validates the reported result as either 'win' or 'lost.'
* Sends a confirmation message to the opponent, allowing them to confirm or reject the reported result.
* Processes the opponent's reaction, finalizing the game outcome if confirmed, or notifying of rejection.
* Handles timeout scenarios, providing appropriate error messages.

leaderboardCommand:
* Retrieves leaderboard data from the SQLite database, ordering users by Elo in descending order.
* Groups users by rank, considering their relative Elo scores.
* Constructs an embedded message (EmbedBuilder) to visually represent the top 5 users for each rank.
* Utilizes Discord.js to fetch usernames, avatars, and additional user information.
* Handles errors gracefully, providing informative messages in case of any issues during data retrieval.




<img width="775" alt="GIT02" src="https://github.com/196Sebastian/OP-Rank-Discord-Bot/assets/87108242/a6d180ef-6b90-435c-b1cd-4b622a66e50c">


# 🔔 Contact Me!
[💼 Linkedin](https://www.linkedin.com/in/sebastian-correa-b6858b177/) • [📱 Check Out Another Project!](https://github.com/196Sebastian/yugioh-deck-builder)
