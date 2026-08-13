from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from pydantic import BaseModel
from backend.database import get_db
from backend.models import Patient
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic schemas
class PatientBase(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: datetime
    gender: str | None = None
    phone_number: str | None = None
    village: str | None = None
    medical_history: str | None = None

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    date_of_birth: datetime | None = None
    gender: str | None = None
    phone_number: str | None = None
    village: str | None = None
    medical_history: str | None = None

class PatientResponse(PatientBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

@router.post("/", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(patient: PatientCreate, db: Session = Depends(get_db)):
    """Create a new patient record"""
    try:
        db_patient = Patient(**patient.model_dump())
        db.add(db_patient)
        db.commit()
        db.refresh(db_patient)
        logger.info(f"Created patient: {db_patient.id}")
        return db_patient
    except Exception as e:
        logger.error(f"Error creating patient: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create patient")

@router.get("/", response_model=List[PatientResponse])
async def list_patients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all patients with pagination"""
    patients = db.query(Patient).offset(skip).limit(limit).all()
    return patients

@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: int, db: Session = Depends(get_db)):
    """Get a specific patient by ID"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(patient_id: int, patient_update: PatientUpdate, db: Session = Depends(get_db)):
    """Update a patient record"""
    db_patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    try:
        update_data = patient_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_patient, field, value)
        
        db_patient.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_patient)
        logger.info(f"Updated patient: {patient_id}")
        return db_patient
    except Exception as e:
        logger.error(f"Error updating patient: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update patient")

@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_patient(patient_id: int, db: Session = Depends(get_db)):
    """Delete a patient record"""
    db_patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    try:
        db.delete(db_patient)
        db.commit()
        logger.info(f"Deleted patient: {patient_id}")
    except Exception as e:
        logger.error(f"Error deleting patient: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete patient")
