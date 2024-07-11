if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
} else {
    document.documentElement.setAttribute('data-bs-theme', 'light');
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    const newColorScheme = event.matches ? "dark" : "light";
    document.documentElement.setAttribute('data-bs-theme', newColorScheme);
});

/***************************
 * Game logic starts here  *
 ***************************/ 
$(document).ready(function() {

    // Constant keys for local storage
    let SCORES_KEY = "score_";
    let SCORE_LIST_KEY = "score_list";
    let TURN_KEY = "turn";
    let TURN_TIMESTAMP_KEY = "turn_timestamp";
    let PAUSE_TIMESTAMP_KEY = "pause_timestamp";
    let CURRENT_CARD_KEY = "current_card";

    // Default game settings
    let DEFAULT_TIMER = 90;
    let DEFAULT_FIRST_TURN = "glad";

    // Game variables
    var cardsDatabase = [];
    var currentCard = [-1, -1];
    var scores = {"mad": 0, "glad": 0};
    var score_list = [];
    var turn_timestamp = 0;
    var pause_timestamp = 0;
    var turn = DEFAULT_FIRST_TURN;

    function processData(csv) {
        cardsDatabase = $.csv.toObjects(csv);
    }

    function secondsToTime(seconds) {
        var minutes = Math.floor(seconds / 60);
        var remainingSeconds = seconds % 60;
        return minutes + ":" + remainingSeconds.toString().padStart(2, "0");
    }

    function drawCard() {
        // select random row
        let row = Math.floor(Math.random() * cardsDatabase.length);
        // select random column
        // random int between 1 and 3
        let col = 1 + Math.floor(Math.random() * 3);
        currentCard = [row, col];
        localStorage.setItem(CURRENT_CARD_KEY, JSON.stringify(currentCard));
        showCard();
    }

    function getCard(card) {
        if (card[0] == -1 || card[1] === -1) {
            var easy = "";
            var hard = "";
        } else {
            var randomRow = cardsDatabase[card[0]];
            var easy = randomRow["Easy"];
            var hard = randomRow[Object.keys(randomRow)[card[1]]];
        }
        return [easy, hard];
    }

    function showCard() {
        let [easy, hard] = getCard(currentCard);
        $(".top").text(easy);
        $(".bottom").text(hard);
    }

    function showScoreListItem(card, points) {
        let type = (points > 0 ? "plus-" : "minus-") + Math.abs(points);
        let [easy, hard] = getCard(card);
        let word = (points === 3) ? hard : easy;
        $("#score-list ul").prepend("<li><i class='bi bi-" + type + "'></i> " + word + "</li>");
    }

    function showScoreList() {
        $("#score-list ul").empty();
        for (let i = 0; i < score_list.length; i++) {
            let card = score_list[i][0];
            let points = score_list[i][1];
            showScoreListItem(card, points);
        }
    }

    function updateScore(team, points) {
        scores[team] += points;
        localStorage.setItem(SCORES_KEY + team, scores[team]);
        $("#score-" + team + " span").html(scores[team]);
        showScoreListItem(currentCard, points);
        score_list.push([currentCard, points]);
        localStorage.setItem(SCORE_LIST_KEY, JSON.stringify(score_list));
    }

    function resetScoreList() {
        score_list = [];
        localStorage.setItem(SCORE_LIST_KEY, JSON.stringify(score_list));
        showScoreList();
    }

    function updateTimer() {
        let timeElapsed = $.now() - turn_timestamp;
        if (pause_timestamp !== -1) {
            timeElapsed -= $.now() - pause_timestamp;
        }
        let timeLeft = Math.max(0, DEFAULT_TIMER - Math.max(0, Math.floor(timeElapsed / 1000)));
        $("#timer").html(secondsToTime(timeLeft));
        if (timeLeft < 10) {
            $("#timer").css("color", "red");
        } else {
            $("#timer").css("color", "");
        }
        
        if (timeLeft === 0) {
            $("#score-btns").addClass("d-none");
            $("#btn-pause-resume").addClass("d-none");
            $("#btn-next-team").removeClass("d-none");
            $("#btn-reset").removeClass("d-none");
        } else {
            $("#score-btns").removeClass("d-none");
            $("#btn-pause-resume").removeClass("d-none");
            $("#btn-next-team").addClass("d-none");
            $("#btn-reset").addClass("d-none");
        }
    }

    function updateTurn() {
        $("#team").html((turn === "glad" ? "Glad" : "Mad") + "'s turn");
        $("#team").removeClass("glad mad");
        $("#team").addClass(turn);
    }

    function switchTurn() {
        turn = turn === "glad" ? "mad" : "glad";
        localStorage.setItem(TURN_KEY, turn);
        turn_timestamp = $.now();
        localStorage.setItem(TURN_TIMESTAMP_KEY, turn_timestamp);
        updateTurn();
        resetScoreList();
    }

    function pauseResumeGame() {
        if (pause_timestamp === -1) {
            // pause game
            pause_timestamp = $.now();
        } else {
            // resume game
            turn_timestamp += $.now() - pause_timestamp;
            pause_timestamp = -1;
            if (currentCard[0] === -1 || currentCard[1] === -1) {
                drawCard();
            }
        }
        localStorage.setItem(TURN_TIMESTAMP_KEY, turn_timestamp);
        localStorage.setItem(PAUSE_TIMESTAMP_KEY, pause_timestamp);
    }

    function updatePauseResumeButton() {
        if (pause_timestamp === -1) {
            // game is running
            $("#btn-pause-resume i").addClass("bi-pause-fill");
            $("#btn-pause-resume i").removeClass("bi-play-fill");
            $("#score-btns .btn").prop("disabled", false);
        } else {
            // game is paused
            $("#btn-pause-resume i").addClass("bi-play-fill");
            $("#btn-pause-resume i").removeClass("bi-pause-fill");
            $("#score-btns .btn").prop("disabled", true);
        }
    }

    $.ajax({
        type: "GET",
        url: "assets/csv/spanish.csv",
        dataType: "text",
        success: function(data) {
            processData(data);
            // localStorage.clear();
                               
            for (let key in scores) {
                scores[key] = Number(localStorage.getItem(SCORES_KEY + key)) ?? scores[key];
                $("#score-" + key + " span").html(scores[key]);
            }
            score_list = localStorage.getItem(SCORE_LIST_KEY) ?? "[]";
            score_list = JSON.parse(score_list);
            showScoreList();
            turn_timestamp = Number(localStorage.getItem(TURN_TIMESTAMP_KEY)) ?? turn_timestamp;
            pause_timestamp = Number(localStorage.getItem(PAUSE_TIMESTAMP_KEY)) ?? pause_timestamp;
            updateTimer();
            updatePauseResumeButton();
            turn = localStorage.getItem(TURN_KEY) ?? "glad";
            updateTurn();
        
            currentCard = localStorage.getItem(CURRENT_CARD_KEY) ?? "[-1,-1]";
            currentCard = JSON.parse(currentCard);
            showCard();
        
            $("#btn-plus-3").click(function() {
                updateScore(turn, 3);
                drawCard();
            });

            $("#btn-plus-1").click(function() {
                updateScore(turn, 1);
                drawCard();
            });  

            $("#btn-minus-1").click(function() {
                updateScore(turn, -1);
                drawCard();
            });

            $("#btn-next-team").click(function() {
                switchTurn();
                drawCard();
                updateTimer();
                updatePauseResumeButton();
            });

            $("#btn-reset-confirm").click(function() {
                for (let key in scores) {
                    scores[key] = 0;
                    localStorage.setItem(SCORES_KEY + key, scores[key]);
                    $("#score-" + key + " span").html(scores[key]);
                }
                resetScoreList();
                currentCard = [-1, -1];
                turn = DEFAULT_FIRST_TURN;
                turn_timestamp = 0;
                pause_timestamp = 0;
                localStorage.setItem(TURN_KEY, turn);
                localStorage.setItem(TURN_TIMESTAMP_KEY, turn_timestamp);
                localStorage.setItem(PAUSE_TIMESTAMP_KEY, pause_timestamp);
                localStorage.setItem(CURRENT_CARD_KEY, JSON.stringify(currentCard));
                updateTurn();
                updateTimer();
                updatePauseResumeButton();
                showCard();
            });

            $("#btn-pause-resume").click(function() {
                pauseResumeGame();
                updatePauseResumeButton();
            });

            setInterval(updateTimer, 1000);
        }
    });
});