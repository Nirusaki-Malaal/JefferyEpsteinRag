#!/bin/bash
source venv/bin/activate
python3 -m app &
BACKEND_PID=$!

cd frontend
npm run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
