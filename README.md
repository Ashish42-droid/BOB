# Rural Healthcare Network API

Transform every village clinic into a node of collective medical intelligence where world-class healthcare guidance reaches patients regardless of geography.

## Product Vision

This application enables field clinical assistants in rural areas to provide quality healthcare by connecting them with specialist doctors for remote consultations, ensuring underserved village patients receive world-class medical guidance.

## Target Audience

- **Field Clinical Assistants**: Healthcare workers in rural village clinics
- **Specialist Doctors**: Medical professionals providing remote consultation
- **Village Patients**: Underserved populations seeking quality healthcare

## Core Features

- **Patient Management**: Complete CRUD operations for patient records
- **Consultation Management**: Create, track, and manage medical consultations
- **Remote Collaboration**: Connect clinical assistants with specialist doctors

## Technology Stack

- **Backend Framework**: FastAPI (Python)
- **Database**: SQLite (easily upgradeable to PostgreSQL)
- **ORM**: SQLAlchemy
- **Validation**: Pydantic
- **Architecture**: Modular Monolith

## Prerequisites

- Python 3.9 or higher
- pip (Python package manager)

## Installation

1. Clone the repository or navigate to the project directory

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
```bash
# On Linux/Mac
source venv/bin/activate

# On Windows
venv\Scripts\activate
```

4. Install dependencies:
```bash
pip install -r backend/requirements.txt
```

5. Create environment file:
```bash
cp .env.example .env
```

6. Edit `.env` file and update configuration values (especially SECRET_KEY for production)

## Running Locally

1. Initialize the database:
```bash
python -c "from backend.database import init_db; init_db()"
```

2. Start the development server:
```bash
python -m backend.main
```

The API will be available at `http://localhost:8000`

3. Access the interactive API documentation:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Health Check
- `GET /` - Root endpoint with API information
- `GET /health` - Health check endpoint

### Patients
- `POST /api/v1/patients/` - Create a new patient
- `GET /api/v1/patients/` - List all patients (with pagination)
- `GET /api/v1/patients/{patient_id}` - Get specific patient
- `PUT /api/v1/patients/{patient_id}` - Update patient information
- `DELETE /api/v1/patients/{patient_id}` - Delete patient record

### Consultations
- `POST /api/v1/consultations/` - Create a new consultation
- `GET /api/v1/consultations/` - List all consultations (with optional status filter)
- `GET /api/v1/consultations/{consultation_id}` - Get specific consultation
- `GET /api/v1/consultations/patient/{patient_id}` - Get all consultations for a patient
- `PUT /api/v1/consultations/{consultation_id}` - Update consultation
- `DELETE /api/v1/consultations/{consultation_id}` - Delete consultation

## Project Structure

```
.
├── backend/
│   ├── main.py              # Main application entry point
│   ├── config.py            # Configuration management
│   ├── models.py            # Database models
│   ├── database.py          # Database connection and session
│   ├── requirements.txt     # Python dependencies
│   └── routers/
│       ├── patients.py      # Patient endpoints
│       └── consultations.py # Consultation endpoints
├── .env.example             # Environment variables template
└── README.md                # This file
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DEBUG | Enable debug mode | False |
| HOST | Server host | 0.0.0.0 |
| PORT | Server port | 8000 |
| ALLOWED_ORIGINS | CORS allowed origins | http://localhost:3000,http://localhost:8000 |
| DATABASE_URL | Database connection string | sqlite:///./healthcare.db |
| SECRET_KEY | Secret key for security | (change in production) |
| ACCESS_TOKEN_EXPIRE_MINUTES | Token expiration time | 30 |
| LOG_LEVEL | Logging level | INFO |

## Architecture Overview

The application follows a **Modular Monolith** architecture with clear separation of concerns:

- **Models Layer**: Database models and schemas (SQLAlchemy)
- **Routers Layer**: API endpoints and request handling (FastAPI)
- **Database Layer**: Database connection and session management
- **Configuration Layer**: Environment-based configuration

## Security Features

- Input validation using Pydantic models
- SQL injection prevention through SQLAlchemy ORM
- CORS configuration for cross-origin requests
- Environment-based configuration for secrets
- Structured logging for audit trails

## Development

### Adding New Features

1. Define models in `backend/models.py`
2. Create router in `backend/routers/`
3. Register router in `backend/main.py`
4. Update this README with new endpoints

### Database Migrations

For production use, consider implementing Alembic for database migrations:
```bash
pip install alembic
alembic init alembic
```

## Production Deployment

1. Use PostgreSQL instead of SQLite:
```bash
DATABASE_URL=postgresql://user:password@localhost/healthcare
```

2. Set strong SECRET_KEY:
```bash
SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
```

3. Disable DEBUG mode:
```bash
DEBUG=False
```

4. Use production ASGI server:
```bash
pip install gunicorn
gunicorn backend.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## License

Proprietary - All rights reserved

## Support

For issues and questions, please contact the development team.
