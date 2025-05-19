#!/bin/bash

# Start the frontend
cd frontend && npm run dev &

# Start the backend
cd backend && flask run &

# Wait for both processes
wait
