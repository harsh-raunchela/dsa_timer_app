# DSA Focus

> A full-stack DSA practice platform designed to make problem solving more structured, timed, and measurable.

🔗 **Live Demo:** https://dsa-timer-app.onrender.com
💻 **Repository:** https://github.com/harsh-raunchela/dsa_timer_app

---

## 📌 Overview

While practicing Data Structures and Algorithms, simply solving problems is not enough.

I wanted a system where I could:

- Track how long I take to solve a problem
- Record whether I solved it or couldn't solve it
- Revisit problems that need revision
- Keep a history of previous attempts
- Practice problems within a fixed time limit
- Track my progress instead of solving problems randomly

That idea led to **DSA Focus**, a full-stack web application built specifically around structured DSA practice.

The application allows users to manage their DSA problems, practice them using a timer, record their results, and review their previous attempts.

---

## ✨ Features

### 🔐 Authentication
- User registration
- User login
- Session-based authentication
- Password hashing
- Protected application routes
- User-specific problem data

### 🧩 Problem Management
Users can:
- Add new DSA problems
- Edit existing problems
- Delete problems
- View problem details
- Set difficulty
- Set topic
- Set coding platform
- Add problem links

Problems can have different statuses:
- `Pending`
- `Completed`
- `Revision`

### ⏱️ Timed Practice
Each problem can be practiced using a dedicated timer.

The system records:
- Start time
- Finish time
- Allowed time
- Actual time taken
- Result

Possible results include:
- `Solved`
- `Not Solved`
- `Expired`

### 🔄 Revision Tracking
Problems can be marked for revision and practiced again through revision sessions.

This makes it possible to distinguish between:
- Initial attempts
- Revision attempts

### 📊 Attempt History
Each practice session is stored in the database.

This allows users to review their previous:
- Attempts
- Results
- Time taken
- Session type
- Problem history

---

## 🛠️ Tech Stack

### Frontend
- HTML
- CSS
- JavaScript
- EJS

### Backend
- Node.js
- Express.js

### Database
- MySQL
- mysql2

### Authentication
- Express sessions
- Password hashing

### Deployment
- Render
- Aiven MySQL

### Version Control
- Git
- GitHub

---

## 🏗️ Application Architecture

```text
                    ┌──────────────────┐
                    │      Browser     │
                    │   HTML / CSS /   │
                    │   JS / EJS       │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   Node.js +      │
                    │   Express.js     │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │      MySQL       │
                    │                  │
                    │      users       │
                    │     problems     │
                    │     sessions     │
                    └──────────────────┘
```

---

## 🗄️ Database Structure

The application currently uses three main tables.

### Users
Stores registered user information.

```text
users
├── id
├── name
├── email
├── password
└── created_at
```

### Problems
Stores problems belonging to users.

```text
problems
├── id
├── title
├── difficulty
├── topic
├── platform
├── problem_url
├── status
├── created_at
└── user_id
```

### Sessions
Stores individual problem-solving attempts.

```text
sessions
├── id
├── problem_id
├── started_at
├── finished_at
├── allowed_minutes
├── time_taken_seconds
├── result
└── session_type
```

### Relationships

```text
User
 │
 └── Problems
       │
       └── Sessions
```

A user can have multiple problems, and each problem can have multiple practice sessions.

---

## 🚀 Getting Started

### Prerequisites

Make sure you have installed:
- Node.js
- MySQL
- Git

### 📥 Installation

Clone the repository:
```bash
git clone https://github.com/harsh-raunchela/dsa_timer_app.git
```

Move into the project directory:
```bash
cd dsa_timer_app
```

Install dependencies:
```bash
npm install
```

### ⚙️ Environment Variables

Create a `.env` file in the project root.

Example:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=dsa_focus

SESSION_SECRET=your_session_secret

NODE_ENV=development
PORT=3000
```

For production, configure the environment variables through your hosting provider.

> **Important:** Never commit your actual `.env` file. The project uses `.gitignore` to keep secrets and local configuration out of Git.

### 🗃️ Database Setup

Create the database:
```sql
CREATE DATABASE dsa_focus;
```

Then create the required tables using the SQL schema for the project.

Make sure the database credentials in `.env` match your local MySQL configuration.

### ▶️ Running Locally

Start the application:
```bash
node index.js
```

For development with automatic restart:
```bash
npx nodemon index.js
```

The application will run at:
```
http://localhost:3000
```

---

## ☁️ Deployment

The application is deployed using:
- **Render** for the Node.js/Express application
- **Aiven** for the MySQL database

### Production Flow

```text
GitHub
   │
   ▼
Render
   │
   ▼
Node.js + Express
   │
   ▼
Aiven MySQL
```

The production application uses environment variables for database credentials and secrets, and the connection between Render and Aiven MySQL is secured using SSL.

Production configuration includes:
- Environment variables
- Aiven MySQL SSL
- Cloud database
- Production Node environment
- Automated deployment from GitHub

---

## 🧪 Testing

The application has been tested for major user flows including:
- User registration
- User login
- Authentication
- Problem creation
- Problem editing
- Problem deletion
- Problem status updates
- Timer functionality
- Solved attempts
- Not-solved attempts
- Expired sessions
- Revision sessions
- Session history
- Database persistence
- Production deployment

---

## 🔮 Future Improvements

Planned improvements include:
- 📊 Advanced performance analytics
- 🔥 DSA solving streaks
- 📈 Topic-wise performance
- 🧠 Smarter revision scheduling
- 🔎 Problem search and filtering
- 📅 Daily practice goals
- 📊 Difficulty-based analytics
- 🏆 Progress and achievement system

---

## 💡 What I Learned

Building DSA Focus helped me understand the complete lifecycle of a full-stack application.

Some of the major things I worked with include:
- Building REST-style backend routes
- Working with Express.js
- Authentication and sessions
- Relational database design
- SQL and foreign-key relationships
- CRUD operations
- Timer and session logic
- Environment variables
- Git and GitHub workflows
- Cloud database migration
- SSL-secured database connections
- Production deployment
- Debugging deployment and database connection issues

The most valuable part was taking the application from localhost to a real deployed environment and solving the problems that appeared along the way.

---

## 👨‍💻 Author

**Harsh Raunchela**
B.Tech CSE (AI/ML)

GitHub: https://github.com/harsh-raunchela
