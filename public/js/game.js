const userCoinsDisplay = document.getElementById('user-coins');
const resultTextDisplay = document.getElementById('result-text');
const computerScoreDisplay = document.getElementById('computer-score');

let userCoins = 10;
let computerScore = 0;

function getComputerChoice() {
    const choices = [1, 2, 3, 4];
    return choices[Math.floor(Math.random() * choices.length)];
}

function convertChoice(choice) {
    const choiceDict = {1: 'Stone', 2: 'Paper', 3: 'Pencil', 4: 'Scissor'};
    return choiceDict[choice];
}

function playGame(userChoiceStr) {
    if (userCoins <= 0) {
        resultTextDisplay.textContent = "Game Over! You have no coins.";
        return;
    }

    const userChoice = {'stone': 1, 'paper': 2, 'pencil': 3, 'scissor': 4}[userChoiceStr];
    const computerChoice = getComputerChoice();

    const userChoiceName = convertChoice(userChoice);
    const computerChoiceName = convertChoice(computerChoice);

    let result = '';

    if (
        (computerChoice === 1 && userChoice === 2) ||
        (computerChoice === 2 && userChoice === 3) ||
        (computerChoice === 3 && userChoice === 1) ||
        (computerChoice === 1 && userChoice === 4) ||
        (computerChoice === 4 && userChoice === 1) ||
        (computerChoice === 2 && userChoice === 4) ||
        (computerChoice === 4 && userChoice === 2) ||
        (computerChoice === 3 && userChoice === 4) ||
        (computerChoice === 4 && userChoice === 3)
    ) {
        result = "You Win";
        userCoins++;
    } else if (computerChoice === userChoice) {
        result = "It's a Draw";
    } else {
        result = "You Lose";
        userCoins--;
    }

    userCoinsDisplay.textContent = userCoins;
    resultTextDisplay.textContent = `You chose ${userChoiceName}, Computer chose ${computerChoiceName}. ${result}!`;
}