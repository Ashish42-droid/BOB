from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from pydantic import BaseModel
from backend.database import get_db
from backend.models import Consultation, ConsultationStatus, Patient
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic schemas
class ConsultationBase(BaseModel):
    patient_id: int
    clinical_assistant: str
    specialist_doctor: str | None = None
    symptoms: str
    diagnosis: str | None = None
    treatment_plan: str | None = None
    status: ConsultationStatus = ConsultationStatus.PENDING

class ConsultationCreate(ConsultationBase):
    pass

class ConsultationUpdate(BaseModel):
    clinical_assistant: str | None = None
    specialist_doctor: str | None = None
    symptoms: str | None = None
    diagnosis: str | None = None
    treatment_plan: str | None = None
    status: ConsultationStatus | None = None

class ConsultationResponse(ConsultationBase):
    id: int
    consultation_date: datetime
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

@router.post("/", response_model=ConsultationResponse, status_code=status.HTTP_201_CREATED)
async def create_consultation(consultation: ConsultationCreate, db: Session = Depends(get_db)):
    """Create a new consultation"""
    # Verify patient exists
    patient = db.query(Patient).filter(Patient.id == consultation.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    try:
        db_consultation = Consultation(**consultation.model_dump())
        db.add(db_consultation)
        db.commit()
        db.refresh(db_consultation)
        logger.info(f"Created consultation: {db_consultation.id} for patient: {consultation.patient_id}")
        return db_consultation
    except Exception as e:
        logger.error(f"Error creating consultation: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create consultation")

@router.get("/", response_model=List[ConsultationResponse])
async def list_consultations(
    skip: int = 0, 
    limit: int = 100, 
    status: ConsultationStatus | None = None,
    db: Session = Depends(get_db)
):
    """List all consultations with optional status filter"""
    query = db.query(Consultation)
    if status:
        query = query.filter(Consultation.status == status)
    consultations = query.offset(skip).limit(limit).all()
    return consultations

@router.get("/{consultation_id}", response_model=ConsultationResponse)
async def get_consultation(consultation_id: int, db: Session = Depends(get_db)):
    """Get a specific consultation by ID"""
    consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    return consultation

@router.get("/patient/{patient_id}", response_model=List[ConsultationResponse])
async def get_patient_consultations(patient_id: int, db: Session = Depends(get_db)):
    """Get all consultations for a specific patient"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    consultations = db.query(Consultation).filter(Consultation.patient_id == patient_id).all()
    return consultations

@router.put("/{consultation_id}", response_model=ConsultationResponse)
async def update_consultation(
    consultation_id: int, 
    consultation_update: ConsultationUpdate, 
    db: Session = Depends(get_db)
):
    """Update a consultation"""
    db_consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not db_consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    try:
        update_data = consultation_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_consultation, field, value)
        
        db_consultation.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_consultation)
        logger.info(f"Updated consultation: {consultation_id}")
        return db_consultation
    except Exception as e:
        logger.error(f"Error updating consultation: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update consultation")

@router.delete("/{consultation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_consultation(consultation_id: int, db: Session = Depends(get_db)):
    """Delete a consultation"""
    db_consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not db_consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    try:
        db.delete(db_consultation)
        db.commit()
        logger.info(f"Deleted consultation: {consultation_id}")
    except Exception as e:
        logger.error(f"Error deleting consultation: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete consultation")
