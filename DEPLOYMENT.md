# Deployment

- Live application: https://yaniyaabi.github.io/i-luv-hdl/
- Frontend: static Vite/React build, GitHub Pages
- Backend: Firebase project i-luv-hdl (owner account, Spark plan)
- Realtime Database: Singapore, database.rules.json
- Auth: anonymous Firebase Authentication, in-memory per-page session
- CI: .github/workflows/deploy.yml builds main with VITE_BASE_PATH=/i-luv-hdl/ and deploys dist
- No ChatGPT Sites redirects, APIs, authentication headers, Worker/D1 bindings, or hosting manifest are needed.

The Firebase configuration in lib/firebase-config.ts is public web configuration. It contains no administrator credentials. Database Rules are deployed separately from the frontend and must match the checked-in database.rules.json.

The original Sites deployment was left intact for fallback; it is not used by this application. Older D1 message records were not copied into Firebase.
