// supabaseStorage.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto'; // Import crypto for checksum generation


dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';  // USE SERVICE ROLE KEY!
const bucketName = process.env.SUPABASE_BUCKET_NAME || 'your-bucket-name'; 
const supabase = createClient(supabaseUrl, supabaseKey);

if (!supabaseUrl || !supabaseKey) {
    console.error("Error: Supabase URL and Key environment variables are missing.");
}

// Function to generate a checksum (SHA-256) of a buffer
const generateChecksum = (buffer: Buffer): string => {
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    return hash.digest('hex');
};

export const uploadFileToSupabase = async (fileBuffer: Buffer, blobName: string, contentType?: string): Promise<{ fileUrl: string, checksum: string }> => {
    try {
        const checksum = generateChecksum(fileBuffer);  // Calculate checksum before upload

        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(blobName, fileBuffer, {
                contentType: contentType || 'application/octet-stream',
                upsert: true // Overwrites the file if it already exists.  Consider removing for safety if you don't want overwrites.
            });

        if (error) {
            console.error("Supabase upload error:", error);
            throw new Error(`Supabase Upload Failed: ${error.message}`);
        }

        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${data.path}`; //Constructing the URL manually since getPublicUrl returns a signed URL which will expire

        console.log(`File uploaded to Supabase: ${publicUrl}`);
        return { fileUrl: publicUrl, checksum: checksum }; // Return both URL and checksum

    } catch (error: any) {
        console.error(`Supabase upload failed for ${blobName}:`, error);
        throw new Error(`Supabase Upload Failed: ${error.message}`);
    }
};

export const getFileFromSupabase = async (blobName: string): Promise<{ fileBuffer: Buffer; metadata: any; checksum: string } | null> => {
    try {
        const { data, error } = await supabase.storage
            .from(bucketName)
            .download(blobName);

        if (error) {
            if (error.message.includes('NotFound')) { // Or use a more specific error code check.
                console.warn(`File not found in Supabase: ${blobName}`);
                return null;
            }
            console.error(`Supabase download error for ${blobName}:`, error);
            throw new Error(`Supabase Download Failed: ${error.message}`);
        }

        let fileBuffer: Buffer;
        if (data instanceof Blob) {
            const arrayBuffer = await data.arrayBuffer();
            fileBuffer = Buffer.from(arrayBuffer);
        } else {
            console.error("Unexpected data type from Supabase download: ", data);
            return null;
        }

        const checksum = generateChecksum(fileBuffer); // Calculate checksum after download

        // Supabase storage doesn't directly return metadata via the download function.
        //  You'd typically need a separate call to get object metadata if you need it.
        //  This is a placeholder.  You might need to store additional metadata in your database
        //  or use a Supabase Edge Function to retrieve metadata in a single request.
        const metadata = {
            contentType: 'application/octet-stream', // Default if you don't have stored metadata.  Consider retrieving from DB.
        };

        return { fileBuffer: fileBuffer, metadata: metadata, checksum: checksum }; // Return the checksum

    } catch (error: any) {
        console.error(`Supabase download failed for ${blobName}:`, error);
        throw new Error(`Supabase Download Failed: ${error.message}`);
    }
};

export const deleteFileFromSupabase = async (blobName: string): Promise<void> => {
    try {
        const { error } = await supabase.storage
            .from(bucketName)
            .remove([blobName]); // Remove takes an array of file paths.

        if (error) {
            console.error(`Supabase delete error for ${blobName}:`, error);
            throw new Error(`Supabase Delete Failed: ${error.message}`);
        }

        console.log(`File deleted from Supabase: ${blobName}`);
    } catch (error: any) {
        console.error(`Supabase delete failed for ${blobName}:`, error);
        throw new Error(`Supabase Delete Failed: ${error.message}`);
    }
};

// Test the Supabase Storage connection
export const testSupabaseConnection = async (): Promise<string | null> => {
    try {
        const testBlobName = `test-${Date.now()}.txt`;
        const testBuffer = Buffer.from("This is a test file for Supabase Storage.");

        const { fileUrl, checksum } = await uploadFileToSupabase(testBuffer, testBlobName, 'text/plain'); // Get URL and checksum

        await deleteFileFromSupabase(testBlobName);

        console.log("Google Cloud Storage connection test successful!");
        return fileUrl;
    } catch (error) {
        console.error("Google Cloud Storage connection test failed:", error);
        return null;
    }
};