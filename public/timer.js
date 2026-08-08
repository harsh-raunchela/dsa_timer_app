let totalSeconds = 10;

let remainingSeconds = totalSeconds;

let timerRunning = true;

const timerDisplay = document.getElementById("timer");
const pauseBtn = document.getElementById("pauseBtn");
const finishBtn = document.getElementById("finishBtn");

function updateTimer() {

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    timerDisplay.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

updateTimer();

const timer = setInterval(async () => {

    if (!timerRunning) {
        return;
    }

    remainingSeconds--;

    updateTimer();

   if (remainingSeconds <= 0) {

    clearInterval(timer);

    try {

        const response = await fetch(`/sessions/${sessionId}/expire`, {
            method: "POST"
        });

        if (!response.ok) {
            throw new Error("Failed to expire session");
        }

        window.location.href = await response.text();

    } catch (error) {

        console.error("Error expiring session:", error);

        alert("Something went wrong when the timer expired.");

    }
}

}, 1000);

pauseBtn.addEventListener("click", () => {

    timerRunning = !timerRunning;

    pauseBtn.textContent =
        timerRunning ? "Pause" : "Resume";
});

finishBtn.addEventListener("click", async () => {

    clearInterval(timer);

    try {

        const response = await fetch(`/sessions/${sessionId}/finish`, {
            method: "POST"
        });

        if (!response.ok) {
            throw new Error("Failed to finish session");
        }

        window.location.href = await response.text();

    } catch (error) {

        console.error("Error finishing session:", error);

        alert("Something went wrong while finishing the session.");

    }

});