# **App Name**: Sun Seat Guide

## Core Features:

- Seat Recommendation Form: A single-page form allowing users to input 'from' latitude/longitude, 'to' latitude/longitude, and a datetime for a seat recommendation query.
- Backend API Integration: Handles sending collected form data (latitudes, longitudes, time) to the specified backend endpoint (http://localhost:3000/recommend-seat) using the browser's native Fetch API.
- Recommendation Display: Clearly presents the JSON 'recommendation' field received from the backend API on the page after successful submission.
- Basic Form Validation: Client-side validation to ensure all required fields are filled and contain valid data types before submission.

## Style Guidelines:

- Primary interactive color: A warm, clear golden-orange (#DE8918) for buttons and active elements, evoking sunshine and guidance.
- Background color: A soft, desaturated cream (#F9F4ED), providing a light and clean canvas for information.
- Accent color: A rich terracotta or coral shade (#C24538) to highlight important information or create visual distinction from the primary color.
- Headline and body font: 'Inter', a grotesque-style sans-serif for its modern, neutral, and highly readable characteristics, ensuring clarity in all text.
- Utilize simple, outline-based icons for clarity, especially for location markers and time-related elements.
- Clean, centered layout for the main form, with clear separation between input fields and the recommendation output. Emphasize readability and intuitive navigation.
- Subtle visual feedback for form submissions and loading states, such as a fade-in effect for the recommendation results or a gentle spinner during data fetching.