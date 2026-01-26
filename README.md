# 3D Diorama Builder UI (motioncad_frontend)

This is a code bundle for 3D Diorama Builder UI. The original project is available at https://www.figma.com/design/SqIgOxkJcDImlB0fy5e9oL/3D-Diorama-Builder-UI.

## Features

- Landing page with animated shader hero
- Dashboard with sidebar navigation
- AI-powered 3D model generation using Tripo AI API
- Interactive 3D model viewer
- Project management and issue tracking

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
VITE_TRIPO_API_KEY=your_api_key_here
VITE_TRIPO_CLIENT_ID=your_client_id_here (optional)
```

## API Setup

See `API_SETUP.md` for detailed instructions on setting up the Tripo AI API.
