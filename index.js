require("dotenv").config();

const express = require("express");
const path = require("path");
const db = require("./db");
const methodOverride = require("method-override");
const session = require("express-session");
const bcrypt = require("bcryptjs");



const app = express();


const PORT = process.env.PORT || 3000;


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));



app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(methodOverride("_method"));

app.set("trust proxy", 1);

app.use(
    session({
        secret: process.env.SESSION_SECRET,

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        }
    })
);


app.use(express.static(path.join(__dirname, "public")));


app.use((req, res, next) => {
    res.locals.userName = req.session.userName || null;
    next();
});


function requireLogin(req, res, next) {

    if (!req.session.userId) {
        return res.redirect("/login");
    }

    next();

}
exports.requireLogin = requireLogin;



//register route
app.get("/register", (req, res) => {

    res.render("register");

});


//register post route

app.post("/register", async (req, res) => {

    const {
        name,
        email,
        password
    } = req.body;


    const hashedPassword =
        await bcrypt.hash(password, 10);


    const sql = `
        INSERT INTO users
        (name, email, password)
        VALUES (?, ?, ?)
    `;


    db.query(
        sql,
        [
            name,
            email,
            hashedPassword
        ],
        (err, result) => {

            if (err) {

                console.error(
                    "Error creating user:",
                    err
                );

                if (err.code === "ER_DUP_ENTRY") {

                    return res
                        .status(400)
                        .send(
                            "Email is already registered"
                        );
                }

                return res
                    .status(500)
                    .send("Database error");
            }


            console.log(
                "User created:",
                result.insertId
            );


            res.redirect("/login");

        }
    );

});


//login route
app.get("/login", (req, res) => {

    res.render("login");

});


//login post route 
app.post("/login", (req, res) => {

    const {
        email,
        password
    } = req.body;


    const sql = `
        SELECT *
        FROM users
        WHERE email = ?
    `;


    db.query(
        sql,
        [email],
        async (err, results) => {

            if (err) {

                console.error(
                    "Error finding user:",
                    err
                );

                return res
                    .status(500)
                    .send("Database error");
            }


            if (results.length === 0) {

                return res
                    .status(401)
                    .send(
                        "Invalid email or password"
                    );
            }


            const user = results[0];


            const passwordMatch =
                await bcrypt.compare(
                    password,
                    user.password
                );


            if (!passwordMatch) {

                return res
                    .status(401)
                    .send(
                        "Invalid email or password"
                    );
            }


            // Login successful

            req.session.userId = user.id;

            req.session.userName = user.name;


            console.log(
                "User logged in:",
                user.id
            );


            res.redirect("/dashboard");

        }
    );

});

app.get("/problems", requireLogin, (req, res) => {

    const sql = `
        SELECT *
        FROM problems
        WHERE user_id = ?
        ORDER BY created_at DESC
    `;

    db.query(
        sql,
        [req.session.userId],
        (err, problems) => {

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

        }
    );

});



//logout route
app.post("/logout", (req, res) => {

    req.session.destroy((err) => {

        if (err) {
            console.error("Error logging out:", err);
            return res.status(500).send("Could not log out");
        }

        res.redirect("/login");

    });

});


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

app.get("/problems/new",requireLogin, (req, res) => {

    res.render("new");

});


// -------------------------------
// Create New Problem
// -------------------------------

app.post("/problems",requireLogin, (req, res) => {

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
            problem_url,
            user_id
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `;


    db.query(
        sql,
        [
            title,
            difficulty,
            topic || null,
            platform || null,
            problem_url || null,
            req.session.userId
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
// Completed Problems
// IMPORTANT: Before /problems/:id
// -------------------------------

app.get("/problems/completed",requireLogin, (req, res) => {

    const sql = `
    SELECT *
    FROM problems
    WHERE user_id = ?
    AND status = 'completed'
    ORDER BY created_at DESC
`;

    db.query(sql, [req.session.userId], (err, problems) => {

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

app.get("/problems/revision", requireLogin, (req, res) => {

    const sql = `
        SELECT *
        FROM problems
        WHERE user_id = ?
        AND status = 'revision'
        ORDER BY created_at DESC
    `;

    db.query(sql, [req.session.userId],(err, problems) => {

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

app.get("/dashboard",requireLogin, (req, res) => {

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
        WHERE user_id = ?
    `;

    db.query(
        overviewSQL,
        [req.session.userId],
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
                JOIN problems
                     ON sessions.problem_id = problems.id
                WHERE sessions.result IS NOT NULL
                AND problems.user_id = ?
            `;

            db.query(
                attemptsSQL,
                [req.session.userId],
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
                        AND problems.user_id = ?
                    `;

                    db.query(
                        recentSQL,
                        [req.session.userId],
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

app.get("/problems/:id/start",requireLogin, (req, res) => {

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
        AND user_id = ?
    `;

    db.query(
        getProblemSQL,
        [id,req.session.userId],
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

app.post("/sessions/:id/finish",requireLogin, (req, res) => {

    const sessionId = req.params.id;

    const getSessionSQL = `
    SELECT
        sessions.id,
        sessions.problem_id,
        sessions.started_at,
        sessions.finished_at,
        sessions.result
    FROM sessions
    JOIN problems
        ON sessions.problem_id = problems.id
    WHERE sessions.id = ?
    AND problems.user_id = ?
`;

    db.query(
        getSessionSQL,
        [sessionId, req.session.userId],
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

app.get("/sessions/:id/result",requireLogin, (req, res) => {

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
        AND problems.user_id = ?
    `;

    db.query(
        sql,
        [sessionId, req.session.userId],
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

app.post("/sessions/:id/result",requireLogin, (req, res) => {

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
        sessions.problem_id,
        sessions.finished_at,
        sessions.result AS current_result
    FROM sessions
    JOIN problems
        ON sessions.problem_id = problems.id
    WHERE sessions.id = ?
    AND problems.user_id = ?
`;

    db.query(
        getSessionSQL,
        [sessionId, req.session.userId],
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

app.post("/sessions/:id/expire",requireLogin, (req, res) => {

    const sessionId = req.params.id;

    const getSessionSQL = `
    SELECT
        sessions.problem_id,
        sessions.finished_at,
        sessions.result
    FROM sessions
    JOIN problems
        ON sessions.problem_id = problems.id
    WHERE sessions.id = ?
    AND problems.user_id = ?
`;

    db.query(
        getSessionSQL,
        [sessionId, req.session.userId],
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

app.get("/problems/:id/edit", requireLogin, (req, res) => {

    const { id } =
        req.params;

    const sql = `
        SELECT *
        FROM problems
        WHERE id = ?
        AND user_id = ?
    `;

    db.query(
        sql,
        [id, req.session.userId],
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

app.patch("/problems/:id", requireLogin, (req, res) => {

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
        AND user_id = ?
    `;

    db.query(
        sql,
        [
            title,
            difficulty,
            topic,
            platform,
            problem_url,
            id,
            req.session.userId
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

app.delete("/problems/:id", requireLogin, (req, res) => {

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
            AND user_id = ?
        `;

        db.query(
            checkProblemSQL,
            [id, req.session.userId],
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

app.get("/problems/:id",requireLogin, (req, res) => {

    const { id } =
        req.params;


    // -------------------------------
    // Get Problem
    // -------------------------------

    const problemSQL = `
        SELECT *
        FROM problems
        WHERE id = ?
        AND user_id = ?
    `;

    db.query(
        problemSQL,
        [id, req.session.userId],
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
        sessions.id,
        sessions.session_type,
        sessions.started_at,
        sessions.finished_at,
        sessions.allowed_minutes,
        sessions.time_taken_seconds,
        sessions.result
    FROM sessions
    JOIN problems
        ON sessions.problem_id = problems.id
    WHERE sessions.problem_id = ?
    AND problems.user_id = ?
    AND sessions.result IS NOT NULL
    ORDER BY sessions.started_at DESC
`;

                    db.query(
                        historySQL,
                        [id, req.session.userId],
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





// Global error handler
app.use((err, req, res, next) => {
    console.error(err);

    if (process.env.NODE_ENV === "production") {
        return res.status(500).send("Something went wrong.");
    }

    res.status(500).send(err.message);
});




// ================================
// START SERVER
// ================================

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});