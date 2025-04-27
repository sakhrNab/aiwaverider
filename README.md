# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

# AI Wave Rider

A marketplace for AI agents and prompts.

## Running the Application in Windows

This application consists of both frontend and backend components. Here's how to run them:

### Backend Server

The backend uses Node.js with Express and connects to Firebase. To start the backend:

1. Navigate to the backend directory 
```
cd backend
```

2. Start the backend using the PowerShell script:
```
powershell -ExecutionPolicy Bypass -File .\start-backend.ps1
```

This script will:
- Test the Firebase connection
- Seed sample agents in the database (if they don't exist)
- Start the backend server on port 4000

### Frontend Development Server

The frontend uses React with Vite. To start the frontend:

1. Open a new terminal window 
2. Navigate to the project root
3. Run:
```
npm run dev
```

This will start the development server, typically on port 3000.

## Troubleshooting Recommendations

If you encounter issues with product recommendations:

1. Check the browser console for any errors
2. Ensure the backend server is running (look for logs in the backend terminal)
3. Verify connectivity to Firebase by running:
```
cd backend
node scripts/testFirebaseConnection.js
```

4. If the database is empty, seed it with test data:
```
cd backend
node scripts/seedSampleAgents.js
```

## Notification System

The application includes a comprehensive notification system that supports both email and in-app notifications.

### Features:

- Email notifications for order confirmations
- Email notifications for agent purchases with templates attached
- In-app notifications for various events
- Welcome emails for new users

### Configuration:

Notifications can be configured using environment variables in your `.env` file:

```
# Email Configuration
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email_user
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=AI Wave Rider <noreply@aiwaverider.com>
SUPPORT_EMAIL=support@aiwaverider.com
WEBSITE_URL=https://aiwaverider.com

# Notifications
ENABLE_NOTIFICATIONS=true
```

To disable notifications, set `ENABLE_NOTIFICATIONS=false`.

### Testing Notifications:

To test the notification system, run:

```
cd backend
node test-email-delivery.js
```

This will simulate a successful payment and trigger both the email delivery for purchased agent templates and notification system.

## Manually Testing API Endpoints

To test the recommendations API directly:

1. Open your browser to:
```
http://localhost:4000/api/recommendations/test
```

2. Check the diagnostic endpoint:
```
http://localhost:4000/api/recommendations/diagnostic
```

## Windows-Specific Notes

In Windows PowerShell, the `&&` operator for chaining commands is not supported by default. Use the provided PowerShell scripts instead of trying to chain commands with `&&` or `&`.

# AI Wave Rider Platform

## Agent Reviews and Ratings System

The platform now includes a complete system for agent reviews, ratings, and likes. This enhances user engagement and helps users make informed decisions about which agents to purchase.

### Features Implemented

1. **Star Rating System**
   - Interactive star rating component for users to rate agents
   - Display of average ratings on agent cards and detail pages
   - Support for different star sizes (small, normal, large)

2. **Like System**
   - Users can like/unlike agents
   - Real-time like counts are displayed
   - Likes are persisted in the database

3. **Review/Comment System**
   - Users can leave detailed text reviews along with their ratings
   - Reviews are displayed in chronological order
   - Each review shows the user name, date, and rating

### Database Structure

- **agents collection**: Updated with `rating`, `reviews`, and `likes` fields
- **agent_reviews collection**: New collection to store detailed review data

### How to Update Your Database

To ensure your database has the necessary fields for the rating system to work:

1. Update your service account key path in `src/scripts/updateAgentsCollection.js`
2. Run the script:
   ```
   node src/scripts/updateAgentsCollection.js
   ```

This will:
- Add missing fields to all agent documents
- Create the agent_reviews collection if it doesn't exist

### Usage Notes

- The rating system is fully integrated with the existing agent detail page
- Real-time updates ensure that new ratings and likes are immediately visible to all users
- The system includes appropriate validations and error handling
