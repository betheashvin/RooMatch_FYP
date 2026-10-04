# Command log — RooMatch setup

All terminal commands, in order. Run from the project root unless noted.

## Environment check
```bash
node --version        # v22.17.0
npm --version         # 11.4.2
python --version      # 3.13.5
git --version         # 2.53.0
```

## Project init
```bash
git init
mkdir -p backend/app/models, backend/app/routers, backend/app/services, backend/app/data, backend/tests
```

## Backend setup (one-time)
```bash
cd backend
python -m venv .venv
.venv/Scripts/python.exe -m pip install --upgrade pip
.venv/Scripts/python.exe -m pip install -r requirements.txt
```

## Backend — run & test
```bash
cd backend
.venv\Scripts\Activate.ps1        # PowerShell; if blocked: Set-ExecutionPolicy -Scope Process RemoteSigned
uvicorn app.main:app --reload --port 8000   # API at :8000, docs at /docs
pytest                                       # run tests
```

## Frontend setup (one-time)
```bash
npm create vite@latest frontend -- --template react-ts   # run from project root
npm --prefix frontend install
npm --prefix frontend install tailwindcss @tailwindcss/vite konva react-konva
```

## Frontend — run & build
```bash
cd frontend
npm run dev       # app at http://localhost:5173 (start backend first)
npm run build     # production build / type-check
```