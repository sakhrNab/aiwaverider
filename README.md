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
