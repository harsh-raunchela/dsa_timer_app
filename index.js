const express = require("express");
const path = require("path");
const db = require("./db");
const methodOverride = require("method-override");

const app = express();

const PORT = 3000;


// ================================
// APP CONFIGURATION
// ================================

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


// ================================
// MIDDLEWARE
// ================================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(methodOverride("_method"));

app.use(express.static(path.join(__dirname, "public")));


// ================================
// HOME
// ================================

app.get("/", (req, res) => {

    res.render("home");

});


// ================================
// PROBLEM ROUTES
// ================================


// -------------------------------
// Add New Problem - Form
// -------------------------------

app.get("/problems/new", (req, res) => {

    res.render("new");

});


// -------------------------------
// Create New Problem
// -------------------------------

app.post("/problems", (req, res) => {

    let {
        title,
        difficulty,
        topic,
        platform,
        problem_url
    } = req.body;


    // Remove unnecessary spaces
    title = title ? title.trim() : "";
    difficulty = difficulty ? difficulty.trim().toLowerCase() : "";
    topic = topic ? topic.trim() : "";
    platform = platform ? platform.trim() : "";
    problem_url = problem_url ? problem_url.trim() : "";


    // -------------------------------
    // Validate title
    // -------------------------------

    if (!title) {
        return res.status(400).send("Problem title is required");
    }


    // -------------------------------
    // Validate difficulty
    // -------------------------------

    const validDifficulties = [
        "easy",
        "medium",
        "hard"
    ];

    if (!validDifficulties.includes(difficulty)) {
        return res.status(400).send(
            "Difficulty must be easy, medium, or hard"
        );
    }


    // -------------------------------
    // Validate URL
    // -------------------------------

    if (problem_url) {

        try {

            new URL(problem_url);

        } catch (error) {

            return res.status(400).send(
                "Invalid problem URL"
            );

        }

    }


    // -------------------------------
    // Insert into database
    // -------------------------------

    const sql = `
        INSERT INTO problems
        (
            title,
            difficulty,
            topic,
            platform,
            problem_url
        )
        VALUES (?, ?, ?, ?, ?)
    `;


    db.query(
        sql,
        [
            title,
            difficulty,
            topic || null,
            platform || null,
            problem_url || null
        ],
        (err, result) => {

            if (err) {

                console.error(
                    "Error inserting problem:",
                    err
                );

                return res
                    .status(500)
                    .send("Database error");
            }


            console.log(
                "Problem added:",
                result.insertId
            );


            res.redirect("/problems");

        }
    );

});


// -------------------------------
// All Problems
// -------------------------------

app.get("/problems", (req, res) => {

    const sql = `
        SELECT *
        FROM problems
        ORDER BY created_at DESC
    `;

    db.query(sql, (err, problems) => {

        if (err) {

            console.error(
                "Error fetching problems:",
                err
            );

            return res
                .status(500)
                .send("Database error");
        }

        res.render("problems", {
            problems
        });

    });

});


// -------------------------------
// Completed Problems
// IMPORTANT: Before /problems/:id
// -------------------------------

app.get("/problems/completed", (req, res) => {

    const sql = `
        SELECT *
        FROM problems
        WHERE status = 'completed'
        ORDER BY created_at DESC
    `;

    db.query(sql, (err, problems) => {

        if (err) {

            console.error(
                "Error fetching completed problems:",
                err
            );

            return res
                .status(500)
                .send("Database error");
        }

        res.render("completed", {
            problems
        });

    });

});


// -------------------------------
// Revision Problems
// IMPORTANT: Before /problems/:id
// -------------------------------

app.get("/problems/revision", (req, res) => {

    const sql = `
        SELECT *
        FROM problems
        WHERE status = 'revision'
        ORDER BY created_at DESC
    `;

    db.query(sql, (err, problems) => {

        if (err) {

            console.error(
                "Error fetching revision problems:",
                err
            );

            return res
                .status(500)
                .send("Database error");
        }

        res.render("revision", {
            problems
        });

    });

});


// ================================
// DASHBOARD
// ================================

app.get("/dashboard", (req, res) => {

    // -------------------------------
    // Overview
    // -------------------------------

    const overviewSQL = `
        SELECT

            SUM(
                CASE
                    WHEN status = 'completed'
                    THEN 1
                    ELSE 0
                END
            ) AS completed,

            SUM(
                CASE
                    WHEN status = 'revision'
                    THEN 1
                    ELSE 0
                END
            ) AS revision

        FROM problems
    `;

    db.query(
        overviewSQL,
        (err, overviewResults) => {

            if (err) {

                console.error(
                    "Error fetching overview:",
                    err
                );

                return res
                    .status(500)
                    .send("Database error");
            }

            const overview =
                overviewResults[0];


            // -------------------------------
            // Attempt Statistics
            // -------------------------------

            const attemptsSQL = `
                SELECT

                    COUNT(*) AS totalAttempts,

                    SUM(
                        CASE
                            WHEN result = 'solved'
                            THEN 1
                            ELSE 0
                        END
                    ) AS solved,

                    AVG(
                        CASE
                            WHEN result IS NOT NULL
                            THEN time_taken_seconds
                        END
                    ) AS averageTime,

                    MIN(
                        CASE
                            WHEN result = 'solved'
                            THEN time_taken_seconds
                        END
                    ) AS bestTime

                FROM sessions

                WHERE result IS NOT NULL
            `;

            db.query(
                attemptsSQL,
                (err, attemptResults) => {

                    if (err) {

                        console.error(
                            "Error fetching performance:",
                            err
                        );

                        return res
                            .status(500)
                            .send("Database error");
                    }

                    const attemptStats =
                        attemptResults[0];

                    const totalAttempts =
                        Number(
                            attemptStats.totalAttempts
                        ) || 0;

                    const solved =
                        Number(
                            attemptStats.solved
                        ) || 0;

                    const averageTime =
                        Number(
                            attemptStats.averageTime
                        ) || 0;

                    const successRate =
                        totalAttempts > 0
                            ? Math.round(
                                (solved / totalAttempts) * 100
                            )
                            : 0;

                    const averageMinutes =
                        Math.floor(
                            averageTime / 60
                        );

                    const averageSeconds =
                        Math.floor(
                            averageTime % 60
                        );


                    // -------------------------------
                    // Recent Activity
                    // -------------------------------

                    const recentSQL = `
                        SELECT

                            sessions.problem_id,
                            sessions.session_type,
                            sessions.time_taken_seconds,
                            sessions.result,
                            sessions.started_at,
                            problems.title

                        FROM sessions

                        JOIN problems
                            ON sessions.problem_id = problems.id

                        WHERE sessions.result IS NOT NULL

                        ORDER BY sessions.started_at DESC

                        LIMIT 5
                    `;

                    db.query(
                        recentSQL,
                        (err, recentSessions) => {

                            if (err) {

                                console.error(
                                    "Error fetching recent sessions:",
                                    err
                                );

                                return res
                                    .status(500)
                                    .send("Database error");
                            }

                            res.render(
                                "dashboard",
                                {

                                    overview: {

                                        completed:
                                            Number(
                                                overview.completed
                                            ) || 0,

                                        revision:
                                            Number(
                                                overview.revision
                                            ) || 0,

                                        totalAttempts:
                                            totalAttempts,

                                        solved:
                                            solved

                                    },

                                    performance: {

                                        successRate:
                                            successRate,

                                        averageMinutes:
                                            averageMinutes,

                                        averageSeconds:
                                            averageSeconds,

                                        bestTime:
                                            attemptStats.bestTime !== null
                                                ? Number(
                                                    attemptStats.bestTime
                                                )
                                                : null

                                    },

                                    recentSessions:
                                        recentSessions

                                }
                            );

                        }
                    );

                }
            );

        }
    );

});


// ================================
// SESSION ROUTES
// ================================


// -------------------------------
// Start Solving
// -------------------------------

app.get("/problems/:id/start", (req, res) => {

    const { id } = req.params;

    const sessionType =
        req.query.type || "initial";

    if (
        sessionType !== "initial" &&
        sessionType !== "revision"
    ) {

        return res
            .status(400)
            .send("Invalid session type");
    }


    const getProblemSQL = `
        SELECT *
        FROM problems
        WHERE id = ?
    `;

    db.query(
        getProblemSQL,
        [id],
        (err, results) => {

            if (err) {

                console.error(
                    "Error fetching problem:",
                    err
                );

                return res
                    .status(500)
                    .send("Database error");
            }

            if (results.length === 0) {

                return res
                    .status(404)
                    .send("Problem not found");
            }

            const problem =
                results[0];


            // -------------------------------
            // Determine Timer
            // -------------------------------

            let allowedMinutes;

            if (
                problem.difficulty === "easy"
            ) {

                allowedMinutes = 25;

            }
            else if (
                problem.difficulty === "medium"
            ) {

                allowedMinutes = 45;

            }
            else {

                allowedMinutes = 60;

            }


            // -------------------------------
            // Create Session
            // -------------------------------

            const createSessionSQL = `
                INSERT INTO sessions
                (
                    problem_id,
                    allowed_minutes,
                    session_type
                )
                VALUES (?, ?, ?)
            `;

            db.query(
                createSessionSQL,
                [
                    problem.id,
                    allowedMinutes,
                    sessionType
                ],
                (err, result) => {

                    if (err) {

                        console.error(
                            "Error creating session:",
                            err
                        );

                        return res
                            .status(500)
                            .send(
                                "Could not create session"
                            );
                    }

                    const sessionId =
                        result.insertId;

                    res.render(
                        "timer",
                        {
                            problem:
                                problem,

                            sessionId:
                                sessionId,

                            allowedMinutes:
                                allowedMinutes
                        }
                    );

                }
            );

        }
    );

});


// -------------------------------
// Finish Session
// -------------------------------

app.post("/sessions/:id/finish", (req, res) => {

    const sessionId = req.params.id;

    const getSessionSQL = `
        SELECT
            id,
            problem_id,
            started_at,
            finished_at,
            result
        FROM sessions
        WHERE id = ?
    `;

    db.query(
        getSessionSQL,
        [sessionId],
        (err, results) => {

            if (err) {
                console.error(
                    "Error fetching session:",
                    err
                );

                return res
                    .status(500)
                    .send("Database error");
            }

            if (results.length === 0) {
                return res
                    .status(404)
                    .send("Session not found");
            }

            const session = results[0];

            // Session has already finished
            if (
                session.finished_at !== null ||
                session.result !== null
            ) {

                return res
                    .status(400)
                    .send(
                        "Session has already been completed"
                    );
            }

            const updateSQL = `
                UPDATE sessions
                SET
                    finished_at = CURRENT_TIMESTAMP,
                    time_taken_seconds = TIMESTAMPDIFF(
                        SECOND,
                        started_at,
                        CURRENT_TIMESTAMP
                    )
                WHERE id = ?
                AND finished_at IS NULL
                AND result IS NULL
            `;

            db.query(
                updateSQL,
                [sessionId],
                (err, result) => {

                    if (err) {
                        console.error(
                            "Error updating session:",
                            err
                        );

                        return res
                            .status(500)
                            .send("Database error");
                    }

                    if (result.affectedRows === 0) {
                        return res
                            .status(400)
                            .send(
                                "Session has already been completed"
                            );
                    }

                    res.send(
                        `/sessions/${sessionId}/result`
                    );

                }
            );

        }
    );

});


// -------------------------------
// Session Result Page
// -------------------------------

app.get("/sessions/:id/result", (req, res) => {

    const sessionId =
        req.params.id;

    const sql = `
        SELECT

            sessions.id,
            sessions.time_taken_seconds,

            problems.title,
            problems.difficulty

        FROM sessions

        JOIN problems
            ON sessions.problem_id = problems.id

        WHERE sessions.id = ?
    `;

    db.query(
        sql,
        [sessionId],
        (err, results) => {

            if (err) {

                console.error(
                    "Error fetching result:",
                    err
                );

                return res
                    .status(500)
                    .send("Database error");
            }

            if (results.length === 0) {

                return res
                    .status(404)
                    .send("Session not found");
            }

            const session =
                results[0];

            const totalSeconds =
                session.time_taken_seconds || 0;

            const timeTakenMinutes =
                Math.floor(
                    totalSeconds / 60
                );

            const timeTakenSeconds =
                totalSeconds % 60;

            res.render(
                "result",
                {

                    problem:
                        session,

                    sessionId:
                        session.id,

                    timeTakenMinutes:
                        timeTakenMinutes,

                    timeTakenSeconds:
                        timeTakenSeconds

                }
            );

        }
    );

});


// -------------------------------
// Submit Session Result
// -------------------------------

app.post("/sessions/:id/result", (req, res) => {

    const sessionId = req.params.id;

    const { result } = req.body;

    // Validate result
    if (
        result !== "solved" &&
        result !== "not_solved"
    ) {
        return res
            .status(400)
            .send("Invalid result");
    }

    const getSessionSQL = `
        SELECT
            problem_id,
            finished_at,
            result AS current_result
        FROM sessions
        WHERE id = ?
    `;

    db.query(
        getSessionSQL,
        [sessionId],
        (err, results) => {

            if (err) {
                console.error(
                    "Error fetching session:",
                    err
                );

                return res
                    .status(500)
                    .send("Database error");
            }

            if (results.length === 0) {
                return res
                    .status(404)
                    .send("Session not found");
            }

            const session = results[0];

            // Session must be finished first
            if (session.finished_at === null) {
                return res
                    .status(400)
                    .send(
                        "Session must be finished before submitting a result"
                    );
            }

            // Result can only be submitted once
            if (session.current_result !== null) {
                return res
                    .status(400)
                    .send(
                        "Session result has already been recorded"
                    );
            }

            const problemId = session.problem_id;

            const updateSessionSQL = `
                UPDATE sessions
                SET result = ?
                WHERE id = ?
                AND finished_at IS NOT NULL
                AND result IS NULL
            `;

            db.query(
                updateSessionSQL,
                [result, sessionId],
                (err, updateResult) => {

                    if (err) {
                        console.error(
                            "Error updating session:",
                            err
                        );

                        return res
                            .status(500)
                            .send("Database error");
                    }

                    if (updateResult.affectedRows === 0) {
                        return res
                            .status(400)
                            .send(
                                "Could not record session result"
                            );
                    }

                    const problemStatus =
                        result === "solved"
                            ? "completed"
                            : "revision";

                    const updateProblemSQL = `
                        UPDATE problems
                        SET status = ?
                        WHERE id = ?
                    `;

                    db.query(
                        updateProblemSQL,
                        [
                            problemStatus,
                            problemId
                        ],
                        (err) => {

                            if (err) {
                                console.error(
                                    "Error updating problem:",
                                    err
                                );

                                return res
                                    .status(500)
                                    .send(
                                        "Database error"
                                    );
                            }

                            res.redirect("/problems");

                        }
                    );

                }
            );

        }
    );

});


// -------------------------------
// Expire Session
// -------------------------------

app.post("/sessions/:id/expire", (req, res) => {

    const sessionId = req.params.id;

    const getSessionSQL = `
        SELECT
            problem_id,
            finished_at,
            result
        FROM sessions
        WHERE id = ?
    `;

    db.query(
        getSessionSQL,
        [sessionId],
        (err, results) => {

            if (err) {
                console.error(
                    "Error fetching session:",
                    err
                );

                return res
                    .status(500)
                    .send("Database error");
            }

            if (results.length === 0) {
                return res
                    .status(404)
                    .send("Session not found");
            }

            const session = results[0];

            // Already completed
            if (
                session.finished_at !== null ||
                session.result !== null
            ) {
                return res
                    .status(400)
                    .send(
                        "Session has already been completed"
                    );
            }

            const problemId = session.problem_id;

            const updateSessionSQL = `
                UPDATE sessions
                SET
                    finished_at = CURRENT_TIMESTAMP,
                    time_taken_seconds = TIMESTAMPDIFF(
                        SECOND,
                        started_at,
                        CURRENT_TIMESTAMP
                    ),
                    result = 'expired'
                WHERE id = ?
                AND finished_at IS NULL
                AND result IS NULL
            `;

            db.query(
                updateSessionSQL,
                [sessionId],
                (err, updateResult) => {

                    if (err) {
                        console.error(
                            "Error updating expired session:",
                            err
                        );

                        return res
                            .status(500)
                            .send("Database error");
                    }

                    if (updateResult.affectedRows === 0) {
                        return res
                            .status(400)
                            .send(
                                "Session has already been completed"
                            );
                    }

                    const updateProblemSQL = `
                        UPDATE problems
                        SET status = 'revision'
                        WHERE id = ?
                    `;

                    db.query(
                        updateProblemSQL,
                        [problemId],
                        (err) => {

                            if (err) {
                                console.error(
                                    "Error updating problem:",
                                    err
                                );

                                return res
                                    .status(500)
                                    .send(
                                        "Database error"
                                    );
                            }

                            res.send(
                                "/problems/revision"
                            );

                        }
                    );

                }
            );

        }
    );

});


// ================================
// EDIT PROBLEM
// ================================


// -------------------------------
// Edit Problem - Form
// -------------------------------

app.get("/problems/:id/edit", (req, res) => {

    const { id } =
        req.params;

    const sql = `
        SELECT *
        FROM problems
        WHERE id = ?
    `;

    db.query(
        sql,
        [id],
        (err, results) => {

            if (err) {

                console.error(
                    "Error fetching problem:",
                    err
                );

                return res
                    .status(500)
                    .send("Database error");
            }

            if (results.length === 0) {

                return res
                    .status(404)
                    .send("Problem not found");
            }

            res.render(
                "edit",
                {
                    problem:
                        results[0]
                }
            );

        }
    );

});


// -------------------------------
// Update Problem
// -------------------------------

app.patch("/problems/:id", (req, res) => {

    const { id } =
        req.params;

    const {
        title,
        difficulty,
        topic,
        platform,
        problem_url
    } = req.body;


    const sql = `
        UPDATE problems

        SET

            title = ?,
            difficulty = ?,
            topic = ?,
            platform = ?,
            problem_url = ?

        WHERE id = ?
    `;

    db.query(
        sql,
        [
            title,
            difficulty,
            topic,
            platform,
            problem_url,
            id
        ],
        (err, result) => {

            if (err) {

                console.error(
                    "Error updating problem:",
                    err
                );

                return res
                    .status(500)
                    .send("Database error");
            }

            if (
                result.affectedRows === 0
            ) {

                return res
                    .status(404)
                    .send("Problem not found");
            }

            res.redirect(
                `/problems/${id}`
            );

        }
    );

});


// -------------------------------
// Delete Problem
// -------------------------------

app.delete("/problems/:id", (req, res) => {

    const { id } = req.params;

    db.beginTransaction((err) => {

        if (err) {
            console.error(
                "Error starting transaction:",
                err
            );

            return res
                .status(500)
                .send("Database error");
        }


        // --------------------------------
        // Step 1: Check if problem exists
        // --------------------------------

        const checkProblemSQL = `
            SELECT id
            FROM problems
            WHERE id = ?
        `;

        db.query(
            checkProblemSQL,
            [id],
            (err, results) => {

                if (err) {

                    return db.rollback(() => {

                        console.error(
                            "Error checking problem:",
                            err
                        );

                        res
                            .status(500)
                            .send("Database error");

                    });

                }


                if (results.length === 0) {

                    return db.rollback(() => {

                        res
                            .status(404)
                            .send("Problem not found");

                    });

                }


                // --------------------------------
                // Step 2: Delete sessions
                // --------------------------------

                const deleteSessionsSQL = `
                    DELETE FROM sessions
                    WHERE problem_id = ?
                `;

                db.query(
                    deleteSessionsSQL,
                    [id],
                    (err) => {

                        if (err) {

                            return db.rollback(() => {

                                console.error(
                                    "Error deleting sessions:",
                                    err
                                );

                                res
                                    .status(500)
                                    .send(
                                        "Database error"
                                    );

                            });

                        }


                        // --------------------------------
                        // Step 3: Delete problem
                        // --------------------------------

                        const deleteProblemSQL = `
                            DELETE FROM problems
                            WHERE id = ?
                        `;

                        db.query(
                            deleteProblemSQL,
                            [id],
                            (err, result) => {

                                if (err) {

                                    return db.rollback(() => {

                                        console.error(
                                            "Error deleting problem:",
                                            err
                                        );

                                        res
                                            .status(500)
                                            .send(
                                                "Database error"
                                            );

                                    });

                                }


                                if (
                                    result.affectedRows === 0
                                ) {

                                    return db.rollback(() => {

                                        res
                                            .status(404)
                                            .send(
                                                "Problem not found"
                                            );

                                    });

                                }


                                // --------------------------------
                                // Step 4: Commit
                                // --------------------------------

                                db.commit((err) => {

                                    if (err) {

                                        return db.rollback(() => {

                                            console.error(
                                                "Error committing transaction:",
                                                err
                                            );

                                            res
                                                .status(500)
                                                .send(
                                                    "Database error"
                                                );

                                        });

                                    }


                                    // Everything succeeded

                                    res.redirect(
                                        "/problems"
                                    );

                                });

                            }
                        );

                    }
                );

            }
        );

    });

});


// ================================
// INDIVIDUAL PROBLEM
// IMPORTANT:
// This MUST come after all specific
// /problems/... routes.
// ================================

app.get("/problems/:id", (req, res) => {

    const { id } =
        req.params;


    // -------------------------------
    // Get Problem
    // -------------------------------

    const problemSQL = `
        SELECT *
        FROM problems
        WHERE id = ?
    `;

    db.query(
        problemSQL,
        [id],
        (err, problemResults) => {

            if (err) {

                console.error(
                    "Error fetching problem:",
                    err
                );

                return res
                    .status(500)
                    .send("Database error");
            }

            if (
                problemResults.length === 0
            ) {

                return res
                    .status(404)
                    .send(
                        "Problem not found"
                    );
            }

            const problem =
                problemResults[0];


            // -------------------------------
            // Statistics
            // -------------------------------

            const statsSQL = `
                SELECT

                    COUNT(*) AS totalAttempts,

                    SUM(
                        CASE
                            WHEN result = 'solved'
                            THEN 1
                            ELSE 0
                        END
                    ) AS solvedAttempts,

                    SUM(
                        CASE
                            WHEN result IN (
                                'not_solved',
                                'expired'
                            )
                            THEN 1
                            ELSE 0
                        END
                    ) AS failedAttempts,

                    MIN(
                        CASE
                            WHEN result = 'solved'
                            THEN time_taken_seconds
                        END
                    ) AS bestTime,

                    SUM(
                        CASE
                            WHEN session_type = 'revision'
                            THEN 1
                            ELSE 0
                        END
                    ) AS revisionAttempts

                FROM sessions

                WHERE problem_id = ?
            `;

            db.query(
                statsSQL,
                [id],
                (err, statsResults) => {

                    if (err) {

                        console.error(
                            "Error fetching statistics:",
                            err
                        );

                        return res
                            .status(500)
                            .send(
                                "Database error"
                            );
                    }

                    const stats =
                        statsResults[0];


                    // -------------------------------
                    // Attempt History
                    // -------------------------------

                    const historySQL = `
                        SELECT

                            id,
                            session_type,
                            started_at,
                            finished_at,
                            allowed_minutes,
                            time_taken_seconds,
                            result

                        FROM sessions

                        WHERE problem_id = ?

                        AND result IS NOT NULL

                        ORDER BY started_at DESC
                    `;

                    db.query(
                        historySQL,
                        [id],
                        (err, history) => {

                            if (err) {

                                console.error(
                                    "Error fetching history:",
                                    err
                                );

                                return res
                                    .status(500)
                                    .send(
                                        "Database error"
                                    );
                            }

                            res.render(
                                "problem",
                                {
                                    problem:
                                        problem,

                                    stats:
                                        stats,

                                    history:
                                        history
                                }
                            );

                        }
                    );

                }
            );

        }
    );

});


// ================================
// START SERVER
// ================================

app.listen(PORT, () => {

    console.log(
        `Server running at http://localhost:${PORT}`
    );

});