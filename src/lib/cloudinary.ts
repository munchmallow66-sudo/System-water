import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface UploadResult {
  publicId: string
  url: string
  secureUrl: string
  format: string
  width: number
  height: number
  bytes: number
  resourceType: string
}

export interface UploadOptions {
  folder?: string
  publicId?: string
  overwrite?: boolean
  resourceType?: 'image' | 'video' | 'raw' | 'auto'
  transformation?: object
}

/**
 * Upload an image from base64 string to Cloudinary
 */
export async function uploadImage(
  base64Data: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    folder = 'system-water',
    publicId,
    overwrite = true,
    resourceType = 'image',
    transformation,
  } = options

  try {
    // Ensure base64 data has proper prefix if missing
    const base64String = base64Data.includes('base64,')
      ? base64Data
      : `data:image/jpeg;base64,${base64Data}`

    const uploadOptions: Record<string, unknown> = {
      folder,
      overwrite,
      resource_type: resourceType,
    }

    if (publicId) {
      uploadOptions.public_id = publicId
    }

    if (transformation) {
      uploadOptions.transformation = transformation
    }

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader.upload(
        base64String,
        uploadOptions,
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            reject(error)
          } else if (result) {
            resolve(result)
          } else {
            reject(new Error('Unknown error during upload'))
          }
        }
      )
    })

    return {
      publicId: result.public_id,
      url: result.url,
      secureUrl: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      resourceType: result.resource_type,
    }
  } catch (error) {
    console.error('Cloudinary upload error:', error)
    throw new Error('Failed to upload image to Cloudinary')
  }
}

/**
 * Upload a file from buffer to Cloudinary
 */
export async function uploadBuffer(
  buffer: Buffer,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    folder = 'system-water',
    publicId,
    overwrite = true,
    resourceType = 'image',
    transformation,
  } = options

  try {
    const uploadOptions: Record<string, unknown> = {
      folder,
      overwrite,
      resource_type: resourceType,
    }

    if (publicId) {
      uploadOptions.public_id = publicId
    }

    if (transformation) {
      uploadOptions.transformation = transformation
    }

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            reject(error)
          } else if (result) {
            resolve(result)
          } else {
            reject(new Error('Unknown error during upload'))
          }
        }
      )
      uploadStream.end(buffer)
    })

    return {
      publicId: result.public_id,
      url: result.url,
      secureUrl: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      resourceType: result.resource_type,
    }
  } catch (error) {
    console.error('Cloudinary upload error:', error)
    throw new Error('Failed to upload image to Cloudinary')
  }
}

/**
 * Delete an image from Cloudinary by public ID
 */
export async function deleteImage(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId)
    return result.result === 'ok'
  } catch (error) {
    console.error('Cloudinary delete error:', error)
    throw new Error('Failed to delete image from Cloudinary')
  }
}

/**
 * Get optimized URL for an image
 */
export function getOptimizedUrl(
  publicId: string,
  options: {
    width?: number
    height?: number
    crop?: 'fill' | 'fit' | 'scale' | 'pad' | 'limit'
    format?: 'auto' | 'webp' | 'jpg' | 'png'
    quality?: 'auto' | number
  } = {}
): string {
  const { width, height, crop = 'fill', format = 'auto', quality = 'auto' } = options

  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      {
        width,
        height,
        crop,
        fetch_format: format,
        quality,
      },
    ],
  })
}

/**
 * Generate a thumbnail URL
 */
export function getThumbnailUrl(publicId: string, size = 200): string {
  return getOptimizedUrl(publicId, {
    width: size,
    height: size,
    crop: 'fill',
  })
}

export { cloudinary }
