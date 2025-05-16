# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

# AI Waverider

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
EMAIL_FROM=AI Waverider <noreply@aiwaverider.com>
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

# AI Waverider Platform

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

## SEPA Credit Transfer Support

The application supports SEPA (Single Euro Payment Area) Credit Transfers for European payments. Key features include:

- IBAN validation with country-specific rules and MOD-97 checksum validation
- BIC (Bank Identifier Code) auto-detection from IBAN
- Proper handling of payment references and transaction information

### BIC Code Lookup Service

The BIC auto-detection feature uses the OpenIBAN service, which is free and doesn't require an API key:

1. **Default Service**: [OpenIBAN](https://openiban.com/) - A free service that provides IBAN validation and BIC lookup
   - No API key required
   - Used as the primary BIC lookup service
   - Simple REST API that returns bank information including BIC

2. **Implementation Details**:
   - When a user enters an IBAN, the system validates it and automatically looks up the corresponding BIC
   - The OpenIBAN API is called directly from the frontend (https://openiban.com/validate/{IBAN}?getBIC=true)
   - If the service is unavailable or doesn't return a BIC, the user is prompted to enter the BIC manually
   - The system clearly indicates when manual BIC entry is required

3. **Fallback Mechanisms**:
   - If OpenIBAN is temporarily unavailable, a notification informs the user
   - For certain banks/countries, a pattern-based BIC suggestion may be provided but marked as requiring verification
   - The BIC field dynamically updates to show when it's required vs. optional
   - Clear error handling with informative messages guides users through any lookup issues

4. **Alternative Services**:
   If you wish to use a paid service as a fallback (for higher reliability), you can configure one of these:
   - [iban.com BIC Validation API](https://www.iban.com/bic-validation-api)
   - [swiftcodesapi.com](https://swiftcodesapi.com)
   - [bicsearch.com](https://bicsearch.com)

   To configure a fallback service, update your environment variables in `.env.local`:
   ```
   VITE_BIC_API_URL=https://your-subscribed-api-endpoint
   VITE_BIC_API_KEY=your-subscription-api-key
   ```

Using this approach provides:
- Free BIC lookup with no API key required
- Bank name and location information in addition to the BIC
- Fallback mechanisms for reliability

# AI Waverider - Optimized Agents UI

This project features a highly optimized Agents marketplace UI with best practices for performance, state management, and code organization.

## Key Optimizations

- **State Management with Zustand**: Centralized, efficient state management with Zustand store
- **Data Validation with Zod**: Schema validation ensures type safety and consistent data structures
- **Form Handling with React Hook Form**: Efficient, uncontrolled form components
- **Performance Optimizations**:
  - Lazy loading images
  - Component memoization
  - Virtualized lists for large data sets
  - Parallel API requests
  - Optimized rendering with useMemo and useCallback

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

## Core Components

### AgentStore (Zustand)

The `agentStore.js` provides a central state management solution:

```javascript
// Using the store in components
import useAgentStore from '../store/agentStore';

function MyComponent() {
  // Get state and actions from the store
  const { 
    agents, 
    featuredAgents,
    setSearchQuery,
    loadInitialData 
  } = useAgentStore();
  
  // Use state and actions
}
```

### Zod Schema Validation

Agent data is validated using Zod schemas in `agentSchema.js`:

```javascript
// Using schema validation
import { parseAgent, parseAgents } from '../schema/agentSchema';

// Validate a single agent
const validatedAgent = parseAgent(rawAgentData);

// Validate an array of agents
const validatedAgents = parseAgents(rawAgentsArray);
```

### Component Examples

#### Optimized AgentCard

```jsx
import AgentCard from '../components/agents/AgentCard';

// Using the optimized agent card
<AgentCard agent={agentData} />
```

#### FeaturedAgents Carousel

```jsx
import FeaturedAgents from '../components/agents/FeaturedAgents';

// Using the featured agents carousel
<FeaturedAgents agents={featuredAgentsData} isLoading={isLoading} />
```

#### AgentCarousel for Recommendations

```jsx
import AgentCarousel from '../components/agents/AgentCarousel';

// Using the agent carousel for recommendations
<AgentCarousel title="Recommended For You" agents={recommendedAgents} />
```

## Performance Best Practices

This codebase implements several performance best practices:

1. **Memoization**: All components use React.memo and useMemo/useCallback hooks to prevent unnecessary re-renders
2. **Virtualization**: Large lists use react-window to render only visible items
3. **Lazy Loading Images**: Images load only when they enter the viewport
4. **Parallel Data Fetching**: Multiple API requests are fetched in parallel using Promise.all
5. **Optimized Rendering**: Components only re-render when their specific props change

## Data Flow

1. The AgentStore handles data fetching and state management
2. API responses are validated through Zod schemas
3. Validated data is stored in the Zustand store
4. Components access only the data they need from the store
5. UI updates are triggered by state changes in the store

## Future Optimizations

Potential further optimizations:

- Implement server-side rendering (SSR) for faster initial load
- Add query caching with React Query
- Implement proper error boundaries
- Add Suspense for better loading states
- Implement preloading for frequently accessed routes
