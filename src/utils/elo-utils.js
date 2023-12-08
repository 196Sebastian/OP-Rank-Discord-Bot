// Function to calculate Elo change
function calculateEloChange(winnerElo, loserElo) {
  const kFactor = 32; // Adjust this value as needed

  // Log the values for debugging
  console.log("Winner Elo:", winnerElo);
  console.log("Loser Elo:", loserElo);

  // Ensure that winnerElo and loserElo are valid numbers
  if (isNaN(winnerElo) || isNaN(loserElo)) {
    console.error("Invalid Elo values for calculation.");
    return { winner: 0, loser: 0, winnerDifference: 0, loserDifference: 0 };
  }

  const expectedWinnerScore = 1 / (1 + 10 ** ((loserElo - winnerElo) / 400));
  const expectedLoserScore = 1 / (1 + 10 ** ((winnerElo - loserElo) / 400));

  const winnerEloChange = Math.round(kFactor * (1 - expectedWinnerScore));
  const loserEloChange = Math.round(kFactor * (0 - expectedLoserScore));

  const winnerNewElo = Math.round(winnerElo + winnerEloChange);
  const loserNewElo = Math.round(loserElo + loserEloChange);

  return {
    winner: winnerNewElo,
    loser: loserNewElo,
    winnerDifference: winnerEloChange,
    loserDifference: loserEloChange,
  };
}

// Function to calculate Elo change with penalty
function calculateEloChangeWithPenalty(winnerElo, loserElo) {
  const kFactor = 32;
  const timeoutPenalty = 0.2;

  // Log the values for debugging
  console.log("Winner Elo:", winnerElo);
  console.log("Loser Elo:", loserElo);

  // Ensure that winnerElo and loserElo are valid numbers
  if (isNaN(winnerElo) || isNaN(loserElo)) {
    console.error("Invalid Elo values for calculation.");
    return { winner: 0, loser: 0 }; // Return default values or handle accordingly
  }

  const expectedWinnerScore = 1 / (1 + 10 ** ((loserElo - winnerElo) / 400));
  const expectedLoserScore = 1 / (1 + 10 ** ((winnerElo - loserElo) / 400));

  // Calculate Elo changes with timeout penalty
  const eloChange =
    kFactor * (1 - expectedWinnerScore - timeoutPenalty * expectedWinnerScore);
  // Apply the Elo changes with the penalty

  const winnerNewElo = Math.round(winnerElo - eloChange);
  const loserNewElo = Math.round(loserElo - eloChange);

  // Log additional information for debugging
  console.log("Expected Winner Score:", expectedWinnerScore);
  console.log("Expected Loser Score:", expectedLoserScore);
  console.log("Winner New Elo:", winnerNewElo);
  console.log("Loser New Elo:", loserNewElo);

  return { winner: winnerNewElo, loser: loserNewElo };
}

// Function to get rank based on Elo
function getRankByElo(elo) {
  if (elo >= 1200) {
    return "Pirate King";
  } else if (elo >= 1100) {
    return "Yonko";
  } else if (elo >= 1000) {
    return "Seven Warlords of the Sea";
  } else if (elo >= 900) {
    return "Supernova";
  } else {
    return "East Blue Pirates";
  }
}

module.exports = {
  calculateEloChange,
  calculateEloChangeWithPenalty,
  getRankByElo,
};
