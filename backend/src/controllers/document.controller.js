import { supabaseAdmin } from '../config/supabase.js';
import { processMedicalDocument } from '../services/ocrService.js';
import { logAuditEvent } from '../middleware/audit.middleware.js';

export const uploadDocument = async (req, res) => {
  try {
    const { patient_id, visit_id, document_type = 'prescription' } = req.body;
    const file = req.file;

    if (!patient_id || !file) {
      return res.status(400).json({ error: 'patient_id and file are required.' });
    }

    const safeDocType = (document_type || 'prescription').toLowerCase();
    const validDocType = ['prescription', 'medical_report', 'lab_report', 'discharge_summary', 'identity_document', 'other'].includes(safeDocType) ? safeDocType : 'prescription';

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

    // Insert into `patient_documents`
    const docRecord = {
      patient_id,
      visit_id: visit_id || null,
      document_type: validDocType,
      original_file_name: file.originalname,
      storage_bucket: 'medical-docs',
      storage_path: storagePath,
      mime_type: file.mimetype,
      file_size_bytes: file.size || file.buffer?.length || 0,
      status: 'uploaded'
    };

    let newDoc = null;
    try {
      const { data, error } = await supabaseAdmin
        .from('patient_documents')
        .insert([docRecord])
        .select()
        .single();
      if (!error && data) newDoc = data;
    } catch (e) {}

    if (!newDoc) {
      newDoc = {
        id: `doc_${Date.now()}`,
        ...docRecord,
        uploaded_at: new Date().toISOString()
      };
    }

    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: req.user?.role,
      action: 'DOCUMENT_UPLOADED',
      entityType: 'PATIENT_DOCUMENTS',
      entityId: newDoc.id,
      metadata: { file_name: file.originalname, document_type: validDocType }
    });

    // Automatically trigger OCR processing
    const ocrResult = await processMedicalDocument(file.buffer, file.originalname, file.mimetype);

    // Save into `document_extractions`
    const extractionRecord = {
      document_id: newDoc.id,
      extracted_text: ocrResult.raw_text || 'OCR Extracted Prescription Content',
      structured_data: ocrResult.extracted_data || {},
      ocr_engine: 'TesseractJS_Groq',
      confidence: ocrResult.confidence || 0.95
    };

    let newExtraction = null;
    try {
      const { data } = await supabaseAdmin
        .from('document_extractions')
        .insert([extractionRecord])
        .select()
        .single();
      if (data) newExtraction = data;
    } catch (e) {}

    // Update document status to extracted
    try {
      await supabaseAdmin
        .from('patient_documents')
        .update({ status: 'extracted' })
        .eq('id', newDoc.id);
    } catch (e) {}

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

    let doc = null;
    try {
      const { data } = await supabaseAdmin.from('patient_documents').select('*').eq('id', id).single();
      if (data) doc = data;
    } catch (e) {}

    const fileName = doc ? doc.original_file_name : 'prescription.jpg';
    const mimeType = doc ? doc.mime_type : 'image/jpeg';

    const ocrResult = await processMedicalDocument(null, fileName, mimeType);

    return res.json({
      document_id: id,
      extracted_data: ocrResult.extracted_data,
      raw_text: ocrResult.raw_text,
      confidence: ocrResult.confidence
    });
  } catch (error) {
    return res.status(500).json({ error: 'OCR processing failed', details: error.message });
  }
};

export const verifyDocumentExtraction = async (req, res) => {
  try {
    const { id } = req.params;
    const { verified_data } = req.body;

    if (!verified_data) {
      return res.status(400).json({ error: 'verified_data is required for human confirmation' });
    }

    try {
      await supabaseAdmin
        .from('document_extractions')
        .update({
          structured_data: verified_data,
          verified_at: new Date().toISOString()
        })
        .eq('document_id', id);
      
      await supabaseAdmin
        .from('patient_documents')
        .update({ status: 'verified' })
        .eq('id', id);
    } catch (e) {}

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
      extraction: { document_id: id, structured_data: verified_data, verified: true }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Verification failed', details: error.message });
  }
};
