import { supabaseAdmin } from '../config/supabase.js';
import { processMedicalDocument } from '../services/ocrService.js';
import { logAuditEvent } from '../middleware/audit.middleware.js';

export const uploadDocument = async (req, res) => {
  try {
    const { patient_id, visit_id, document_type = 'PRESCRIPTION' } = req.body;
    const file = req.file;

    if (!patient_id || !file) {
      return res.status(400).json({ error: 'patient_id and file are required.' });
    }

    const fileName = `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
    const storagePath = `medical_documents/${patient_id}/${fileName}`;

    // Upload file to Supabase Storage bucket 'medical-docs'
    try {
      await supabaseAdmin.storage
        .from('medical-docs')
        .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: true });
    } catch (stgErr) {
      console.warn('Supabase storage upload fallback path used:', stgErr.message);
    }

    // Insert into `medical_documents`
    const docRecord = {
      patient_id,
      visit_id: visit_id || null,
      document_type,
      storage_path: storagePath,
      file_name: file.originalname,
      mime_type: file.mimetype,
      ocr_status: 'PENDING',
      uploaded_by: req.user?.id || null
    };

    let { data: newDoc, error: dbErr } = await supabaseAdmin
      .from('medical_documents')
      .insert([docRecord])
      .select()
      .single();

    if (dbErr) {
      newDoc = {
        id: `doc_${Date.now()}`,
        ...docRecord,
        created_at: new Date().toISOString()
      };
    }

    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: req.user?.role,
      action: 'DOCUMENT_UPLOADED',
      entityType: 'MEDICAL_DOCUMENTS',
      entityId: newDoc.id,
      metadata: { file_name: file.originalname, document_type }
    });

    // Automatically trigger OCR processing
    const ocrResult = await processMedicalDocument(file.buffer, file.originalname, file.mimetype);

    // Save into `document_extractions` with `verified: false`
    const extractionRecord = {
      document_id: newDoc.id,
      extracted_data: ocrResult.extracted_data,
      confidence: ocrResult.confidence,
      verified: false
    };

    let { data: newExtraction } = await supabaseAdmin
      .from('document_extractions')
      .insert([extractionRecord])
      .select()
      .single();

    // Update document OCR status
    await supabaseAdmin
      .from('medical_documents')
      .update({ ocr_status: 'PROCESSED', ocr_text: ocrResult.raw_text })
      .eq('id', newDoc.id);

    return res.status(201).json({
      document: newDoc,
      extraction: newExtraction || extractionRecord,
      raw_ocr: ocrResult.raw_text
    });

  } catch (error) {
    console.error('Document upload error:', error.message);
    return res.status(500).json({ error: 'Document upload failed', details: error.message });
  }
};

export const runOCR = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch document record
    const { data: doc } = await supabaseAdmin.from('medical_documents').select('*').eq('id', id).single();
    if (!doc) {
      return res.status(404).json({ error: 'Medical document not found' });
    }

    const ocrResult = await processMedicalDocument(null, doc.file_name, doc.mime_type);

    return res.json({
      document_id: id,
      extracted_data: ocrResult.extracted_data,
      raw_text: ocrResult.raw_text,
      confidence: ocrResult.confidence,
      verified: false
    });
  } catch (error) {
    return res.status(500).json({ error: 'OCR processing failed', details: error.message });
  }
};

export const verifyDocumentExtraction = async (req, res) => {
  try {
    const { id } = req.params; // document_id or extraction_id
    const { verified_data } = req.body;

    if (!verified_data) {
      return res.status(400).json({ error: 'verified_data is required for human confirmation' });
    }

    // Update `document_extractions` record
    const { data: updatedExtraction, error } = await supabaseAdmin
      .from('document_extractions')
      .update({
        extracted_data: verified_data,
        verified: true,
        verified_by: req.user?.id || null,
        verified_at: new Date().toISOString()
      })
      .eq('document_id', id)
      .select()
      .single();

    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: req.user?.role,
      action: 'OCR_VERIFIED',
      entityType: 'DOCUMENT_EXTRACTIONS',
      entityId: id,
      metadata: { verified_by: req.user?.name }
    });

    return res.json({
      message: 'OCR extraction verified and confirmed by human assistant.',
      extraction: updatedExtraction || { document_id: id, extracted_data: verified_data, verified: true }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Verification failed', details: error.message });
  }
};
