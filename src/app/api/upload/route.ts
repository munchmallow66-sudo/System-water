import { NextRequest, NextResponse } from 'next/server';
import { uploadBuffer } from '@/lib/cloudinary';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api-response';
import { getSession, isStaffOrAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const session = await getSession();
        if (!session) {
            return apiUnauthorized();
        }

        // Check authorization (Admin/Staff only)
        if (!isStaffOrAdmin(session.user)) {
            return apiForbidden('Only authorized personnel can upload files');
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const folder = formData.get('folder') as string || 'system-water/general';

        if (!file) {
            return apiError('No file provided');
        }

        // Read the file into a buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Make sure to upload via the Cloudinary utility which processes the backend request
        const uploadResult = await uploadBuffer(buffer, { folder });

        return apiSuccess(uploadResult, 201);
    } catch (error) {
        console.error('File upload error:', error);
        return apiError('Failed to upload file');
    }
}
