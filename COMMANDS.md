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

## Backend setup (one-time, Windows Command Prompt)

If your prompt already shows `(.venv)`, reuse that environment and run
`python -m pip install -r requirements.txt`. Do not recreate `.venv` while its
Python interpreter is running: Windows cannot replace the active `python.exe`.

For a new environment, run:

```bat
cd backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Backend — run & test

Windows Command Prompt:

```bat
cd backend
.venv\Scripts\activate.bat
python -m uvicorn app.main:app --reload --port 8000
python -m pytest
```

In PowerShell, activate with `.\.venv\Scripts\Activate.ps1` instead. If script
execution is blocked, use `Set-ExecutionPolicy -Scope Process RemoteSigned` in
that terminal first. The API runs on port 8000, with interactive docs at `/docs`.

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
