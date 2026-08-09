const totalSeconds = sessionDuration * 60;
let remainingSeconds = totalSeconds;
let timerRunning = true;

const timerDisplay = document.getElementById("timer");
const pauseBtn = document.getElementById("pauseBtn");
const finishBtn = document.getElementById("finishBtn");
const clockHand = document.getElementById("clockHand");
const clockProgress = document.getElementById("clockProgress");
const clockWrap = document.getElementById("clockWrap");
const clockScene = document.getElementById("clockScene");

const CIRCUMFERENCE = 552.9; // 2 * PI * 88

function updateTimer() {

    const minutes = Math.floor(Math.max(remainingSeconds, 0) / 60);
    const seconds = Math.max(remainingSeconds, 0) % 60;

    timerDisplay.textContent =
        remainingSeconds > 0
            ? `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
            : "TIME'S UP";

    const elapsedFraction = 1 - (Math.max(remainingSeconds, 0) / totalSeconds);
    const remainingFraction = 1 - elapsedFraction;

    // Hand sweeps a full turn over the session, like a countdown clock face
    const angle = elapsedFraction * 360;
    clockHand.setAttribute("transform", `rotate(${angle} 100 100)`);

    // Ring depletes as time passes
    clockProgress.style.strokeDashoffset = CIRCUMFERENCE * elapsedFraction;

    // Urgency staging
    let color = "var(--accent)";
    let state = "";

    if (remainingFraction < 0.11) {
        color = "var(--danger)";
        state = "state-critical";
    } else if (remainingFraction < 0.22) {
        color = "var(--revision)";
    } else if (remainingFraction < 0.44) {
        color = "var(--accent-strong)";
    }

    clockWrap.style.setProperty("--clock-color", color);
    clockScene.classList.toggle("state-critical", state === "state-critical");
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
