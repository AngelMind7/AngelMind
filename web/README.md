# Web Boundary

AngelMind currently serves both website layers from the React application in `client/`:

- Public marketing and trust surfaces are route-isolated and use reviewed static copy.
- The authenticated dashboard is protected by the existing OAuth and workspace policy flow.

A future deployment split may place marketing and application shells in separate packages, but the data boundary must remain: public routes cannot access workspace data, and dashboard routes cannot expose unverified public claims.
